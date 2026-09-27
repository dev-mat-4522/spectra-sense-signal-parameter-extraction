"""Blind parameter estimation (Corrective Action Plan §3 + Remediation PRD R2).

- Fs CANNOT be guessed from raw bytes: it comes from the user (raw .IQ) or
  the .wav header. `estimate_params` takes known_sr and derives the rest.
- Symbol (baud) rate IS blind-estimable via three voting estimators:
    (a) delay-multiply autocorr: |diff(x)| spikes at symbol boundaries for ANY
        modulation (even constant-modulus PSK where |x|^2 is flat); the FIRST
        autocorrelation lag is the symbol period — harmonic-immune.
    (b) squaring loop (Remediation R2): x^2 strips BPSK phase modulation, FFT
        of the envelope exposes the baud line; fundamental-first peak pick.
    (c) fourth-power loop: x^4 strips QPSK phase modulation, same FFT vote.
  The voters fuse by agreement; method + candidates are reported for forensics.
"""
from __future__ import annotations
import numpy as np


def _autocorr_baud(y: np.ndarray, fs: float) -> tuple[float | None, float]:
    """First-peak autocorrelation baud finder.

    y = transition envelope. Symbol boundaries repeat every sps samples, so
    the FIRST strong autocorrelation lag is the symbol period — immune to the
    harmonic confusion that plagues FFT peak-picking on impulse trains.
    """
    n = len(y)
    y = y - np.mean(y)
    var = float(np.dot(y, y))
    if var < 1e-12:
        return None, 0.0
    # FFT-based autocorrelation (biased, normalized)
    m = 1 << (2 * n - 1).bit_length()
    r = np.fft.irfft(np.abs(np.fft.rfft(y, m)) ** 2)[:n] / var
    max_lag = min(n // 4, int(fs / (fs / 2000.0)))  # baud >= fs/2000
    max_lag = min(max_lag, 8000)
    if max_lag < 8:
        return None, 0.0
    seg = r[2:max_lag]
    # Noise floor via MAD (median absolute deviation): the spiky transition
    # envelope gives strong NEGATIVE off-peak lobes, so median(|.|) would set
    # the bar above the true first peak. MAD around the signed median is immune.
    med = float(np.median(seg))
    mad = float(np.median(np.abs(seg - med)) + 1e-9)
    floor = max(0.10, med + 6.0 * mad)
    best_lag, best_val = None, 0.0
    for i in range(1, len(seg) - 1):
        v = float(seg[i])
        if v > floor and v >= float(seg[i - 1]) and v >= float(seg[i + 1]) and v > best_val * 1.05:
            # first significant peak wins (fundamental, not harmonic)
            if best_lag is None and v > 0.08:
                best_lag, best_val = i + 2, v
                break
    if best_lag is None:
        return None, 0.0
    baud = float(fs) / best_lag
    conf = min(0.95, max(0.1, (best_val - 0.08) * 2.5))
    return round(baud, 1), round(float(conf), 3)


def _power_law_baud(seg: np.ndarray, fs: float, power: int) -> tuple[float | None, float]:
    """Squaring (p=2) / fourth-power (p=4) loop voter (Remediation R2).

    y = x^p strips M-PSK phase modulation (p=2 kills BPSK, p=4 kills QPSK);
    the envelope |y| carries the baud-rate line WHENEVER the amplitude varies
    (RRC shaping, QAM). For pure rectangular constant-modulus captures the
    envelope is legitimately flat — the voter then ABSTAINS (returns None)
    instead of hallucinating, leaving the decision to delay-multiply.
    Peak logic: global max by prominence, then harmonic DESCENT (f/2, f/3…)
    to the fundamental, so harmonics can't masquerade as baud.
    """
    try:
        y = np.asarray(seg, dtype=np.complex128) ** power
    except Exception:
        return None, 0.0
    env = np.abs(y).astype(np.float64)
    # Differentiate the envelope: bursty captures (message + silence) contain
    # an amplitude STEP whose 1/f spectrum defeats every peak-picking rule
    # (it walks down the 1/f slope to DC). d/dt kills steps and slow trends
    # while preserving periodic baud cyclostationarity.
    env = np.diff(env)
    if float(np.std(env)) < 1e-12:
        return None, 0.0
    n = len(env)
    w = np.hanning(n)
    spec = np.abs(np.fft.rfft(env * w))
    freqs = np.fft.rfftfreq(n, d=1.0 / float(fs))
    lo, hi = float(fs) / 2000.0, float(fs) / 2.0
    mask = (freqs >= lo) & (freqs <= hi)
    mags, fr = spec[mask], freqs[mask]
    if mags.size < 8:
        return None, 0.0
    mags = mags.copy()
    mags[:2] = 0  # residual DC leakage
    med = float(np.median(mags) + 1e-12)
    i1 = int(np.argmax(mags))
    prom = float(mags[i1] / med)
    # White-noise periodograms throw single-bin spikes ~8x median; a genuine
    # windowed line is 2-4 bins wide (Hann mainlobe). Require BOTH prominence
    # (>=12) and a wide mainlobe, else abstain rather than hallucinate.
    left = float(mags[i1 - 1]) if i1 > 0 else 0.0
    right = float(mags[i1 + 1]) if i1 < len(mags) - 1 else 0.0
    if prom < 12.0 or max(left, right) < 0.25 * float(mags[i1]):
        return None, 0.0
    f = float(fr[i1])
    fmag = float(mags[i1])
    # harmonic descent to the fundamental: step f -> f/k ONLY while the
    # sub-harmonic is comparable (>=50%) to the current peak. Bare-above-floor
    # energy is leakage/burst-rate residue, not the fundamental.
    for k in range(2, 41):
        sub = f / k
        if sub < lo:
            break
        j = int(np.argmin(np.abs(fr - sub)))
        if float(mags[j]) >= 0.5 * fmag:
            f, fmag = float(fr[j]), float(mags[j])
    conf = min(0.9, max(0.1, (prom - 12.0) / 40.0 + 0.3))
    return round(f, 1), round(conf, 3)


def _fuse(cands: list[tuple[str, float | None, float]]) -> tuple[float | None, float, str]:
    """Agreement vote: two voters within 5% -> fused high confidence."""
    good = [(name, b, c) for name, b, c in cands if b]
    if not good:
        return None, 0.0, "none"
    for i in range(len(good)):
        for j in range(i + 1, len(good)):
            bi, bj = good[i][1], good[j][1]
            if bi and bj and abs(bi - bj) / max(bi, bj) <= 0.05:
                b = round((bi + bj) / 2.0, 1)
                c = round(min(0.95, max(good[i][2], good[j][2]) + 0.15), 3)
                return b, c, f"fused-{good[i][0]}+{good[j][0]}"
    # no agreement: trust the delay-multiply voter (proven harmonic-immune),
    # downgraded confidence, full candidate list preserved for forensics
    good.sort(key=lambda t: -t[2])
    name, b, c = good[0]
    return b, round(max(0.05, c - 0.2), 3), f"{name}-unconfirmed"


def estimate_symbol_rate(x: np.ndarray, fs: float) -> dict:
    x = np.asarray(x, dtype=np.complex128).ravel()
    n = min(len(x), 262144)
    if n < 256 or fs <= 0:
        return {"symbol_rate_hz": None, "confidence": 0.0, "method": "none"}
    seg = x[:n]
    # Voter (a): delay-multiply / transition envelope autocorr
    y = np.abs(np.diff(seg)).astype(np.float64)
    baud_a, conf_a = _autocorr_baud(y, float(fs))
    # Voters (b),(c): squaring + fourth-power loops
    baud_b, conf_b = _power_law_baud(seg, float(fs), 2)
    baud_c, conf_c = _power_law_baud(seg, float(fs), 4)
    baud, conf, method = _fuse([("autocorr", baud_a, conf_a),
                                ("square", baud_b, conf_b),
                                ("fourth", baud_c, conf_c)])
    return {"symbol_rate_hz": baud, "confidence": conf, "method": method,
            "candidates": {"autocorr": baud_a, "square": baud_b, "fourth": baud_c}}


def estimate_params(x: np.ndarray, known_sr: float | None = None) -> dict:
    x = np.asarray(x).ravel()
    n = min(len(x), 16384)
    seg = x[:n] * np.hanning(n)
    spec = np.abs(np.fft.fftshift(np.fft.fft(seg))) ** 2 + 1e-12
    k = np.arange(len(spec)) - len(spec) / 2
    centroid = float(np.sum(k * spec) / np.sum(spec))
    fs = float(known_sr) if known_sr else 1_000_000.0
    cfo = centroid / len(spec) * fs

    if known_sr:
        sym = estimate_symbol_rate(x, fs)
        baud = float(sym["symbol_rate_hz"] or fs / 4.0)
        sps = max(1, int(round(fs / baud))) if baud > 0 else 4
        sampling_conf = float(sym["confidence"])
        blind = False
    else:
        # Legacy blind fallback (documented low-confidence): old envelope method
        sym = estimate_symbol_rate(x, fs)
        baud = float(sym["symbol_rate_hz"] or fs / 4.0)
        sps = 4
        sampling_conf = 0.1
        blind = True

    from .spectrum import occupied_bandwidth
    obw = occupied_bandwidth(x)
    bw_hz = float(obw["obw_frac"] * fs)

    return {
        "sampling_rate_hz": round(float(fs), 1),
        "sampling_confidence": round(float(sampling_conf), 3),
        "symbol_rate_hz": round(float(baud), 1),
        "symbol_confidence": round(float(sym.get("confidence", 0.0)), 3),
        "cfo_hz": round(float(cfo), 1),
        "bandwidth_hz": round(float(bw_hz), 1),
        "sps_estimated": int(sps),
        "sps_assumed": int(sps),
        "blind": blind,
    }
