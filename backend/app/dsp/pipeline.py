"""DAG pipeline orchestrator (PRD §2 + Corrective Action Plan §5).

Flow: ingest (strict float32-complex, user Fs) -> burst extract -> params
(autocorr baud) -> AMC (sps-aware) -> demod @4 carrier rotations, best scored
by correlator -> de-interleave -> FEC (default BYPASS unless requested or
sync fails) -> correlate w/ ambiguity resolution -> visualize -> report.
"""
from __future__ import annotations
from typing import Callable
import numpy as np
import time

from .ingestion import load_signal
from .burst import extract_burst
from .spectrum import waterfall, constellation_points, psd_db
from .cyclo import estimate_params
from ..ml.infer import classify
from .demod import demodulate
from .interleave import deinterleave
from .fec import fec_decode
from .correlator import correlate, score_candidate
from .afsk import demodulate_afsk
from .nrzi import nrzi_decode
from .g3ruh import descramble

Progress = Callable[[str, int], None] | None

MOD_MAP = {"BPSK": "BPSK", "QPSK": "QPSK", "8PSK": "8PSK", "QAM16": "QAM-16", "QAM64": "QAM-64", "FSK": "FSK-2", "AFSK": "AFSK"}


def _score_demod(bits: np.ndarray, bps: int) -> float:
    return float(score_candidate(np.asarray(bits, dtype=np.uint8))[0])


def run_pipeline(path: str, overrides: dict | None = None, progress: Progress = None) -> dict:
    ov = overrides or {}

    timing = {}
    _last_time = [time.time()]
    _last_step = ["init"]
    
    def emit(step: str, pct: int):
        now = time.time()
        elapsed = round((now - _last_time[0]) * 1000, 2)
        timing[_last_step[0]] = elapsed
        _last_time[0] = now
        _last_step[0] = step
        if progress:
            try:
                progress(step, pct)
            except Exception:
                pass

    emit("ingest", 5)
    fs_override = ov.get("sample_rate_hz") or ov.get("fs") or ov.get("sample_rate")
    try:
        fs_override = float(fs_override) if fs_override else None
    except (TypeError, ValueError):
        fs_override = None
    info = load_signal(path, sample_rate_hz=fs_override)
    x_full: np.ndarray = info["samples"]

    emit("burst", 12)
    burst = extract_burst(x_full)
    x = x_full[burst["start"]:burst["end"]] if burst["found"] else x_full

    emit("params", 22)
    params = estimate_params(x, known_sr=info["sample_rate"])

    sps = int(params.get("sps_estimated", 4) or 4)
    if ov.get("sps"):
        try:
            sps = max(1, int(ov["sps"]))
        except (TypeError, ValueError):
            pass

    emit("amc", 35)
    
    amc = classify(x, sps=sps)
    is_audio = info["format"] == "wav" and info["sample_rate"] <= 48000
    if is_audio and not ov.get("modulation"):
        baud = float(params.get("symbol_rate_hz", 0))
        # If it's an audio file and looks like 1200 baud BPSK (AO-73/FUNcube)
        if 1150 <= baud <= 1250:
            amc = {
                "modulation": "BPSK",
                "confidence": 0.99,
                "probs": {"BPSK": 0.99},
                "engine": "audio-heuristic-ao73"
            }
        elif amc["modulation"] not in ("BPSK", "QPSK", "AFSK"):
            # Fallback for generic audio if classifier hallucinates QAM
            amc = {
                "modulation": "AFSK", 
                "confidence": 0.85, 
                "probs": {"AFSK": 0.85}, 
                "engine": "audio-heuristic"
            }

    modulation = str(ov.get("modulation") or MOD_MAP.get(amc["modulation"], "QPSK"))
    manual_modulation = bool(ov.get("modulation"))
    deint_method = str(ov.get("deinterleaver", "none"))
    fec_method = str(ov.get("fec", "auto"))

    # Remediation R4: confidence-gated orchestration. AMC < 80% without a manual
    # override => flag for review and force non-destructive routing (demod +
    # correlate only; de-interleave/FEC bypassed unless explicitly overridden).
    review_flag = None
    if float(amc.get("confidence", 0.0)) < 0.80 and not manual_modulation:
        review_flag = {"flagged": True, "threshold": 0.80,
                       "reason": f"AMC confidence {amc.get('confidence')} < 0.80 without manual override; "
                                 "de-interleaver/FEC forced to bypass to protect the bitstream."}
        if not ov.get("deinterleaver"):
            deint_method = "none"
        if not ov.get("fec"):
            fec_method = "none"

    emit("demod", 55)
    
    from .ao40 import decode_funcube
    
    if modulation == "AFSK":
        afsk = demodulate_afsk(x, fs=info["sample_rate"], baud=1200)
        nrzi_bits = nrzi_decode(afsk["bits"])
        # Some AFSK is G3RUH scrambled, but 1200 baud Bell 202 is usually just NRZI
        dem = {"bits": nrzi_bits, "symbols": afsk["symbols"], "modulation": "AFSK-1200", "bits_per_symbol": 1}
        best = {"dem": dem, "bits": nrzi_bits, "rotation_deg": 0.0}
        dem, bits = best["dem"], np.asarray(best["bits"], dtype=np.uint8)
    else:
        # Carrier-phase ambiguity: try 4 quadrants, keep the best correlator score.
        best, best_score = None, -1.0
        for rot in (0.0, 90.0, 180.0, 270.0):
            xr = x * np.exp(1j * np.deg2rad(rot))
            dem = demodulate(xr, modulation, sps=sps)
            b = np.asarray(dem["bits"], dtype=np.uint8)
            if b.size == 0:
                continue
            sc = _score_demod(b, dem["bits_per_symbol"])
            if sc > best_score:
                best, best_score = {"dem": dem, "bits": b, "rotation_deg": rot}, sc
            if rot == 0.0 and sc == 0 and len(x) > 50000:
                pass  # keep searching rotations on big captures
        if best is None:
            dem0 = demodulate(x, modulation, sps=sps)
            best = {"dem": dem0, "bits": np.asarray(dem0["bits"], dtype=np.uint8), "rotation_deg": 0.0}
        dem, bits = best["dem"], np.asarray(best["bits"], dtype=np.uint8)

    emit("deinterleave", 70)
    if deint_method.lower() in ("none", "off"):
        dei_bits, dei_name = bits, "none-bypass"
    else:
        dei = deinterleave(bits, method=deint_method)
        dei_bits, dei_name = np.asarray(dei["bits"], dtype=np.uint8), dei["method"]

    emit("fec", 82)
    
    is_ao73 = is_audio and amc.get("engine") == "audio-heuristic-ao73"
    
    if is_ao73:
        ao40_res = decode_funcube(bits)
        if ao40_res["success"]:
            bits3 = np.asarray(ao40_res.get("payload", []), dtype=np.uint8)
            fec_info = {"method": "FUNcube/AO-40 FEC", "corrected": 0, "bits": len(bits3)}
            corr = {"hits": [], "num_hits": 1, "framing": {"sync": "FUNcube-1 AO-40 Sync", "header_len": 32}, "header_len_bits": 32, "payload_len_bits": len(bits3), "payload_hex": ao40_res.get("hex", ""), "payload_ascii": [], "ambiguity_trial": "as-is"}
        else:
            bits3 = np.asarray([], dtype=np.uint8)
            fec_info = {"method": "FUNcube/AO-40 FEC", "corrected": 0, "bits": 0}
            corr = {"hits": [], "num_hits": 0, "framing": {"sync": "FUNcube-1 AO-40 Sync", "header_len": 32}, "payload_hex": "", "payload_ascii": [ao40_res["reason"]], "ambiguity_trial": "failed"}
    else:
        fec = fec_decode(dei_bits, method=fec_method)
        bits3 = np.asarray(fec["bits"], dtype=np.uint8)
        fec_info = {"method": fec["method"], "corrected": int(fec.get("corrected", 0)),
                    "bits": int(len(bits3))}
        if "detection" in fec:
            fec_info["detection"] = fec["detection"]

        emit("correlate", 90)
        passthrough = fec_info["method"] in ("none", "none-bypass") or "detection" in fec_info
        corr = correlate(bits3, bits_per_symbol=int(dem["bits_per_symbol"]) if passthrough else 1)

    emit("visualize", 96)
    wf = waterfall(x)
    const = constellation_points(best["dem"]["symbols"] if "symbols" in best["dem"] else x, sps_hint=1 if "symbols" in best["dem"] else sps)
    raw_psd = psd_db(x, 1024); psd = [round(float(v), 2) for v in raw_psd[::(len(raw_psd)//256)][:256]]
    
    # Decimate waveform for frontend time-domain plotting (max 1000 points)
    step = max(1, len(x) // 1000)
    x_dec = x[::step][:1000]
    # Normalize for display
    rms = float(np.sqrt(np.mean(np.abs(x_dec)**2))) or 1.0
    x_dec = x_dec / rms
    waveform = [[round(float(p.real), 3), round(float(p.imag), 3)] for p in x_dec]

    emit("done", 100)
    
    # 40. FINAL RESULT LOGIC
    decode_validated = corr.get("frame_valid", False) if isinstance(corr, dict) else False
    if is_ao73 and ao40_res.get("success"):
        decode_validated = True
        
    final_status = "DECODE VALIDATED" if decode_validated else "DECODE NOT VALIDATED"
    
    if float(amc.get("confidence", 0.0)) < 0.80 and not manual_modulation and not decode_validated:
        amc["hypothesis"] = amc["modulation"]
        amc["modulation"] = "Modulation unresolved"

    now = time.time()
    timing[_last_step[0]] = round((now - _last_time[0]) * 1000, 2)
    
    return {
        "status": final_status,
        "timing_ms": timing,
        "file": {"format": info["format"], "dtype_origin": info.get("dtype_origin"),
                 "fs_source": info.get("fs_source"),
                 "samples_analyzed": int(len(x)), "burst": {k: burst.get(k) for k in ("start", "end", "found")},
                 "file_samples": info["file_samples"], "file_bytes": info["file_bytes"],
                 "noise_floor": info["noise_floor"]},
        "params": params,
        "amc": amc,
        "review": review_flag,
        "demod": {"modulation": dem["modulation"], "bits": int(len(bits)),
                  "bits_per_symbol": dem["bits_per_symbol"],
                  "carrier_rotation_deg": best["rotation_deg"]},
        "deinterleaver": {"method": dei_name, "bits": int(len(dei_bits))},
        "fec": fec_info,
        "correlation": corr,
        "visual": {"waterfall": wf, "constellation": const, "psd": psd, "waveform": waveform},
        "overrides_applied": {"modulation": modulation, "sps": sps,
                              "sample_rate_hz": info["sample_rate"],
                              "deinterleaver": deint_method, "fec": fec_method},
    }
