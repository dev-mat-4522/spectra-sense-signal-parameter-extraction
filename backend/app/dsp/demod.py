"""Demodulators for FSK/QAM/PSK (PRD §5.3).

Design: blind, robust, dependency-free.
 - PSK/QAM: hard-decision minimum-distance demapper on RMS-normalized symbols.
   Assumes timing already at ~1 sample/symbol after decimation by sps_assumed.
 - FSK: non-coherent energy discriminator using two Goertzel-like correlators.
Returns bits (np.uint8) + symbols + modulation used.
"""
from __future__ import annotations
import numpy as np

QAM16 = np.array([a + 1j * b for a in (-3, -1, 1, 3) for b in (-3, -1, 1, 3)], dtype=np.complex128) / np.sqrt(10)
QAM64 = np.array([a + 1j * b for a in (-7, -5, -3, -1, 1, 3, 5, 7) for b in (-7, -5, -3, -1, 1, 3, 5, 7)], dtype=np.complex128) / np.sqrt(42)


def _decimate(x: np.ndarray, sps: int = 4) -> np.ndarray:
    x = np.asarray(x).ravel()
    # Center-of-symbol sampling (no averaging: averaging smears rectangular
    # pulses and corrupts high-sps signals). Offset sps//2 lands mid-symbol.
    if sps > 1 and len(x) > sps // 2:
        return x[sps // 2::sps]
    return x


def _norm(syms: np.ndarray) -> np.ndarray:
    rms = float(np.sqrt(np.mean(np.abs(syms) ** 2))) or 1.0
    return syms / rms


# Gray-coded bit labels per constellation index (adjacent symbols differ by
# 1 bit; matches the common Tx convention, e.g. QPSK 45deg->[1,1]).
GRAY_QPSK = np.array([[1, 1], [0, 1], [0, 0], [1, 0]], dtype=np.uint8)


def _gray(n: int, width: int) -> np.ndarray:
    g = n ^ (n >> 1)
    return np.array([(g >> i) & 1 for i in range(width - 1, -1, -1)], dtype=np.uint8)


def _slice_gray(syms: np.ndarray, constellation: np.ndarray, table: np.ndarray) -> np.ndarray:
    d = np.abs(syms[:, None] - constellation[None, :]).argmin(axis=1)
    return np.asarray(table[d], dtype=np.uint8).reshape(-1)


def demod_psk(x: np.ndarray, order: int = 4, sps: int = 4) -> dict:
    syms = _norm(_decimate(x, sps))
    m = order
    if m == 2:
        const = np.array([1 + 0j, -1 + 0j], dtype=np.complex128)
        bits = _slice_gray(syms, const, np.array([[1], [0]], dtype=np.uint8))
    elif m == 4:
        const = np.exp(1j * (2 * np.pi * np.arange(m) / m + np.pi / m))
        bits = _slice_gray(syms, const, GRAY_QPSK)
    else:  # 8PSK, Gray-coded
        const = np.exp(1j * (2 * np.pi * np.arange(m) / m + np.pi / m))
        table = np.stack([_gray(k, 3) for k in range(m)])
        bits = _slice_gray(syms, const, table)
    k = int(np.log2(m))
    return {"bits": bits, "symbols": syms.astype(np.complex64), "modulation": f"PSK-{m}", "bits_per_symbol": k}


def _slice(syms: np.ndarray, constellation: np.ndarray, bits_per_sym: int) -> np.ndarray:
    # vectorized min-distance, binary index labels (used for QAM)
    d = np.abs(syms[:, None] - constellation[None, :]).argmin(axis=1)
    bits = ((d[:, None] >> np.arange(bits_per_sym - 1, -1, -1)) & 1).astype(np.uint8)
    return bits.reshape(-1)


# Gray code tables for QAM16 and QAM64
_QAM16_GRAY = np.array([
    [1,0,1,0], [1,0,1,1], [1,0,0,1], [1,0,0,0],
    [1,1,1,0], [1,1,1,1], [1,1,0,1], [1,1,0,0],
    [0,1,1,0], [0,1,1,1], [0,1,0,1], [0,1,0,0],
    [0,0,1,0], [0,0,1,1], [0,0,0,1], [0,0,0,0]
], dtype=np.uint8)

_QAM64_GRAY = np.array([
    [1,0,1, 1,0,1], [1,0,1, 1,0,0], [1,0,1, 1,1,0], [1,0,1, 1,1,1], [1,0,1, 0,1,1], [1,0,1, 0,1,0], [1,0,1, 0,0,0], [1,0,1, 0,0,1],
    [1,0,0, 1,0,1], [1,0,0, 1,0,0], [1,0,0, 1,1,0], [1,0,0, 1,1,1], [1,0,0, 0,1,1], [1,0,0, 0,1,0], [1,0,0, 0,0,0], [1,0,0, 0,0,1],
    [1,1,0, 1,0,1], [1,1,0, 1,0,0], [1,1,0, 1,1,0], [1,1,0, 1,1,1], [1,1,0, 0,1,1], [1,1,0, 0,1,0], [1,1,0, 0,0,0], [1,1,0, 0,0,1],
    [1,1,1, 1,0,1], [1,1,1, 1,0,0], [1,1,1, 1,1,0], [1,1,1, 1,1,1], [1,1,1, 0,1,1], [1,1,1, 0,1,0], [1,1,1, 0,0,0], [1,1,1, 0,0,1],
    [0,1,1, 1,0,1], [0,1,1, 1,0,0], [0,1,1, 1,1,0], [0,1,1, 1,1,1], [0,1,1, 0,1,1], [0,1,1, 0,1,0], [0,1,1, 0,0,0], [0,1,1, 0,0,1],
    [0,1,0, 1,0,1], [0,1,0, 1,0,0], [0,1,0, 1,1,0], [0,1,0, 1,1,1], [0,1,0, 0,1,1], [0,1,0, 0,1,0], [0,1,0, 0,0,0], [0,1,0, 0,0,1],
    [0,0,0, 1,0,1], [0,0,0, 1,0,0], [0,0,0, 1,1,0], [0,0,0, 1,1,1], [0,0,0, 0,1,1], [0,0,0, 0,1,0], [0,0,0, 0,0,0], [0,0,0, 0,0,1],
    [0,0,1, 1,0,1], [0,0,1, 1,0,0], [0,0,1, 1,1,0], [0,0,1, 1,1,1], [0,0,1, 0,1,1], [0,0,1, 0,1,0], [0,0,1, 0,0,0], [0,0,1, 0,0,1]
], dtype=np.uint8)

def demod_qam(x: np.ndarray, order: int = 16, sps: int = 4) -> dict:
    syms = _norm(_decimate(x, sps))
    const = QAM16 if order == 16 else QAM64
    k = int(np.log2(order))
    table = _QAM16_GRAY if order == 16 else _QAM64_GRAY
    bits = _slice_gray(syms, const, table)
    return {"bits": bits, "symbols": syms.astype(np.complex64), "modulation": f"QAM-{order}", "bits_per_symbol": k}


def demod_fsk(x: np.ndarray, sps: int = 4, dev_hint: float = 0.25) -> dict:
    """Non-coherent binary FSK: correlate against +/- deviation tones over each symbol."""
    x = np.asarray(x).ravel()
    sps = max(2, int(sps))
    n_sym = len(x) // sps
    x = x[: n_sym * sps]
    t = np.arange(sps) / float(sps)  # symbol time normalized
    # deviation in cycles/symbol
    f0 = np.exp(1j * 2 * np.pi * dev_hint * t)
    f1 = np.exp(-1j * 2 * np.pi * dev_hint * t)
    bits = np.zeros(n_sym, dtype=np.uint8)
    syms = np.zeros(n_sym, dtype=np.complex128)
    for i in range(n_sym):
        seg = x[i * sps:(i + 1) * sps]
        e0 = abs(np.vdot(f0, seg))
        e1 = abs(np.vdot(f1, seg))
        bits[i] = 0 if e0 >= e1 else 1
        syms[i] = e0 - e1  # real soft value packed as complex for plotting
    return {"bits": bits, "symbols": syms.astype(np.complex64), "modulation": "FSK-2", "bits_per_symbol": 1}


def demodulate(x: np.ndarray, modulation: str, sps: int = 4) -> dict:
    m = (modulation or "QPSK").upper().replace(" ", "").replace("_", "-")
    aliases = {"BPSK": ("PSK", 2), "QPSK": ("PSK", 4), "8PSK": ("PSK", 8),
               "PSK-2": ("PSK", 2), "PSK-4": ("PSK", 4), "PSK-8": ("PSK", 8),
               "QAM-16": ("QAM", 16), "QAM-64": ("QAM", 64), "QAM16": ("QAM", 16),
               "16-QAM": ("QAM", 16), "64-QAM": ("QAM", 64),
               "FSK": ("FSK", 2), "FSK-2": ("FSK", 2), "BFSK": ("FSK", 2)}
    if m in ("QAM16", "QAM64"):
        m = "QAM-" + m[3:]
    kind_order = aliases.get(m, ("PSK", 4))
    kind, order = kind_order
    if kind == "PSK":
        return demod_psk(x, order=order, sps=sps)
    if kind == "QAM":
        return demod_qam(x, order=order, sps=sps)
    return demod_fsk(x, sps=sps)
