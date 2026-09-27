"""AMC inference entrypoint — tries torch weights, else heuristic."""
from __future__ import annotations
from pathlib import Path
import numpy as np
from .model import CLASSES, HAS_TORCH, build_model, heuristic_probs
from ..config import MODEL_PATH


NATIVE_CNN_SPS = 8  # Remediation R3: the CNN is only ever fed this rate.


def resample_to_native(xa: np.ndarray, true_sps: int, native_sps: int = NATIVE_CNN_SPS) -> tuple[np.ndarray, dict]:
    """Rational polyphase resampling true_sps -> native_sps (Remediation R3).

    e.g. true SPS 100 -> 8 via up=2/down=25. Falls back to integer
    decimation if scipy is unavailable. Returns (resampled, info).
    """
    xa = np.asarray(xa).ravel()
    true_sps = max(1, int(true_sps))
    info = {"from_sps": true_sps, "to_sps": int(native_sps), "method": "none"}
    if true_sps == native_sps or len(xa) < 64:
        return xa, info
    import math
    g = math.gcd(int(true_sps), int(native_sps))
    up, down = int(native_sps) // g, int(true_sps) // g
    try:
        from scipy.signal import resample_poly
        y = resample_poly(xa.real, up, down).astype(np.float64) + \
            1j * resample_poly(xa.imag, up, down).astype(np.float64)
        info["method"] = f"polyphase-{up}/{down}"
        return np.asarray(y), info
    except Exception:
        step = max(1, int(round(true_sps / native_sps)))
        info["method"] = f"decimate-{step}-fallback"
        return xa[step // 2::step], info


def align_symbols(xa: np.ndarray, sps: int, n_sym: int = 128) -> np.ndarray | None:
    """Gardner-style timing alignment: pick the sampling phase with max energy
    (optimal for RRC, harmless for rectangular), return n_sym complex symbols.
    Returns None when the capture is too short.
    """
    xa = np.asarray(xa).ravel()
    sps = max(1, int(sps))
    if sps == 1:
        return xa[:n_sym] if len(xa) >= 32 else None
    if len(xa) < sps * 32:
        return None
    best, best_e = None, -1.0
    for p in range(sps):
        syms = xa[p:p + sps * n_sym:sps][:n_sym]
        if len(syms) < 32:
            continue
        e = float(np.mean(np.abs(syms) ** 2))
        if e > best_e:
            best, best_e = syms, e
    return best


def _window(x: np.ndarray, length: int = 128) -> np.ndarray:
    x = np.asarray(x).ravel()
    if x.size < length:
        pad = np.zeros(length - x.size, dtype=np.complex64)
        x = np.concatenate([x, pad])
    # center window with most energy for stable classification
    if len(x) > length * 4:
        e = np.abs(x).astype(float)
        w = np.convolve(e, np.ones(length), mode="valid")
        s = int(np.argmax(w[::length]) * length)
        s = min(s, len(x) - length)
        return x[s:s + length]
    return x[:length]


_cached = {"model": None, "loaded": False}


def _try_load():
    if _cached["loaded"] or not HAS_TORCH:
        return None
    _cached["loaded"] = True
    try:
        if MODEL_PATH.exists():
            import torch
            m = build_model(len(CLASSES))
            state = torch.load(str(MODEL_PATH), map_location="cpu")
            m.load_state_dict(state)
            m.eval()
            _cached["model"] = m
            return m
    except Exception:
        return None
    return None


def _heuristic(xa: np.ndarray, sps: int) -> dict:
    probs = heuristic_probs(xa[:8192], sps=sps)
    order = np.argsort(-probs)
    # cap heuristic confidence at 0.85 (honest)
    conf = float(min(0.85, probs[order[0]]))
    return {
        "modulation": CLASSES[int(order[0])],
        "confidence": round(conf, 4),
        "probs": {c: round(float(p), 4) for c, p in zip(CLASSES, probs)},
        "engine": "heuristic",
    }


def classify(x: np.ndarray, sps: int = 4) -> dict:
    xa = np.asarray(x, dtype=np.complex64)
    sps = max(1, int(sps))
    # Heuristic branch wants ~4 samples/symbol waveform (differential moments).
    hxa = xa
    if sps > 6 and len(xa) >= 512:
        step = max(1, sps // 4)
        hxa = xa[sps // 2::step]
        sps_h = max(1, int(round(sps / step)))
    else:
        sps_h = sps
    # CNN branch (Remediation R3): burst -> polyphase resample to the native
    # CNN rate (8 sps) -> timing-align -> 128 symbols (training distribution).
    # The CNN NEVER sees off-native data, fixing the "zoom level" failure where
    # sps=100 windows looked like 4% of a symbol (a pure sine wave -> "FSK").
    resampled, rs_info = resample_to_native(xa, sps, NATIVE_CNN_SPS)
    syms = align_symbols(resampled, NATIVE_CNN_SPS)
    model = _cached["model"] or _try_load()
    cnn_out = None
    if model is not None and syms is not None:
        seg = np.asarray(syms[:128], dtype=np.complex128)
        if seg.size < 128:
            # Periodic extension, NOT zero-padding: zeros would be an alien
            # constellation the CNN never saw in training; wrapping preserves
            # the symbol statistics for short bursts.
            rep = int(np.ceil(128 / max(1, seg.size)))
            seg = np.tile(seg, rep)[:128]
        # RMS-normalize exactly like training frames (train/inference match)
        seg = seg / (float(np.sqrt(np.mean(np.abs(seg) ** 2))) + 1e-12)
        try:
            import torch
            t = torch.tensor(np.stack([seg.real, seg.imag]).astype(np.float32)).unsqueeze(0)
            with torch.no_grad():
                logits = model(t)
                probs = torch.softmax(logits, dim=1).cpu().numpy()[0]
            order = np.argsort(-probs)
            cnn_out = {
                "modulation": CLASSES[int(order[0])],
                "confidence": round(float(probs[order[0]]), 4),
                "probs": {c: round(float(p), 4) for c, p in zip(CLASSES, probs)},
                "engine": "cnn",
                "resample": rs_info,
            }
        except Exception:
            cnn_out = None
    heur_out = _heuristic(hxa, sps_h)
    heur_out["resample"] = rs_info
    if cnn_out is None:
        return heur_out
    # Fusion: the CNN owns high-confidence calls; below 0.70 the differential-
    # moment heuristic (strong on clean PSK/QAM) gets a vote. Engine is labeled.
    if cnn_out["confidence"] >= 0.70:
        return cnn_out
    if heur_out["confidence"] > cnn_out["confidence"]:
        heur_out = dict(heur_out)
        heur_out["engine"] = "fusion-heuristic"
        heur_out["cnn_runner_up"] = {k: cnn_out["probs"][k] for k in CLASSES[:3]}
        return heur_out
    cnn_out = dict(cnn_out)
    cnn_out["engine"] = "fusion-cnn"
    return cnn_out
