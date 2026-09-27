"""Burst extraction — isolate the active transmission from leading/trailing silence.

Many captures (e.g. NTRO test vectors) contain a short message followed by
 zeros. Demodulating the silence produces garbage bits that poison FEC and
correlation, so the chain operates on the burst region.
"""
from __future__ import annotations
import numpy as np


def extract_burst(x: np.ndarray, win: int = 1024, thresh_frac: float = 0.08,
                  min_len: int = 256) -> dict:
    x = np.asarray(x).ravel()
    n = len(x)
    if n == 0:
        return {"start": 0, "end": 0, "found": False}
    mag = np.abs(x).astype(np.float64)
    win = max(64, min(win, n))
    ker = np.ones(win) / win
    env = np.convolve(mag, ker, mode="same")
    peak = float(np.max(env)) or 1.0
    # Silence floor: median envelope; active = well above floor AND fraction of peak
    floor = float(np.median(env))
    thr = max(floor * 3.0, peak * thresh_frac)
    mask = env > thr
    if not np.any(mask) or int(np.sum(mask)) < min_len:
        return {"start": 0, "end": n, "found": False}
    idx = np.flatnonzero(mask)
    # Keep the LONGEST contiguous active run (rejects stray noise spikes)
    breaks = np.flatnonzero(np.diff(idx) > win * 4)
    runs = []
    prev = 0
    for b in list(breaks) + [len(idx) - 1]:
        runs.append((int(idx[prev]), int(idx[b])))
        prev = b + 1
    s, e = max(runs, key=lambda r: r[1] - r[0])
    s = max(0, s - win)
    e = min(n, e + win)
    if e - s < min_len:
        return {"start": 0, "end": n, "found": False}
    return {"start": int(s), "end": int(e), "found": True,
            "peak": round(peak, 4), "floor": round(floor, 6)}
