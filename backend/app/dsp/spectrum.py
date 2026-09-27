"""Spectrum engine — chunked FFT, PSD, waterfall frames (PRD §5.4)."""
from __future__ import annotations
import numpy as np


def psd_db(x: np.ndarray, fft_size: int = 1024) -> np.ndarray:
    x = np.asarray(x).ravel()
    if x.size < fft_size:
        fft_size = max(64, 1 << (x.size - 1).bit_length() // 2 * 2) if x.size >= 64 else x.size
        fft_size = min(fft_size, x.size) if x.size else 1024
    seg = x[:fft_size] * np.hanning(fft_size)
    spec = np.fft.fftshift(np.fft.fft(seg, n=fft_size))
    mag = np.abs(spec) ** 2 + 1e-12
    return (10 * np.log10(mag)).astype(float)


def waterfall(x: np.ndarray, fft_size: int = 1024, frames: int = 64) -> list[list[float]]:
    """Return frames x fft_size dB matrix, downsampled for WebGL (max ~128 cols)."""
    x = np.asarray(x).ravel()
    if x.size == 0:
        return []
    hop = max(1, (len(x) - fft_size) // max(1, frames))
    hop = max(hop, fft_size // 2)
    out: list[list[float]] = []
    idx = 0
    while len(out) < frames and idx + fft_size <= len(x):
        seg = x[idx:idx + fft_size] * np.hanning(fft_size)
        spec = np.fft.fftshift(np.fft.fft(seg))
        mag = 10 * np.log10(np.abs(spec) ** 2 + 1e-12)
        # downsample cols to <=128 for browser perf
        if fft_size > 128:
            step = fft_size // 128
            mag = mag[::step][:128]
        # clip dynamic range for display stability
        mag = np.clip(mag, float(np.max(mag)) - 80, float(np.max(mag)))
        out.append([round(float(v), 2) for v in mag])
        idx += hop
    if not out:  # tiny file fallback
        out.append([round(float(v), 2) for v in psd_db(x, min(fft_size, len(x)))[:128]])
    return out


def occupied_bandwidth(x: np.ndarray, sr_hint: float | None = None) -> dict:
    pxx = psd_db(x)
    peak = float(np.max(pxx))
    mask = pxx > (peak - 20)
    frac = float(np.mean(mask))
    return {"obw_frac": round(frac, 4), "peak_db": round(peak, 2), "sr_hint": sr_hint}


def constellation_points(x: np.ndarray, max_points: int = 2000, sps_hint: int = 1) -> list[list[float]]:
    """Decimate to symbol-spaced scatter for constellation diagram."""
    x = np.asarray(x).ravel()
    step = max(1, sps_hint)
    pts = x[::step][:max_points]
    # normalize RMS to 1 for stable display
    rms = float(np.sqrt(np.mean(np.abs(pts) ** 2))) or 1.0
    pts = pts / rms
    return [[round(float(p.real), 4), round(float(p.imag), 4)] for p in pts]
