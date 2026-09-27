"""AMC CNN — PyTorch when available, heuristic fallback otherwise.

Classes: [BPSK, QPSK, 8PSK, QAM16, QAM64, FSK]
Input: 2x128 float32 IQ window (I/Q rows), normalized.
Model: 3x Conv1d + BN + ReLU + GAP + FC (~40k params, CPU-fast).
"""
from __future__ import annotations
import numpy as np

CLASSES = ["BPSK", "QPSK", "8PSK", "QAM16", "QAM64", "FSK"]

try:
    import torch
    import torch.nn as nn
    HAS_TORCH = True
except Exception:
    torch = None  # type: ignore
    nn = None  # type: ignore
    HAS_TORCH = False


def build_model(num_classes: int = 6):
    """VT-CNN2 style AMC network (Corrective Action Plan §4B), PyTorch port with
    one principled deviation: a global-average-pool bottleneck before the dense
    layers. The doc's literal flatten preserves absolute sample position, but
    our impairment protocol includes random symbol-timing offsets (real blind
    captures are never symbol-aligned) — GAP makes the classifier shift-
    invariant. Input (B,2,128). ~60k params, CPU-fast.
    """
    if not HAS_TORCH:
        return None

    class VTCNN2(nn.Module):  # type: ignore
        def __init__(self):
            super().__init__()
            self.conv = nn.Sequential(
                nn.Conv1d(2, 64, 8), nn.ReLU(), nn.MaxPool1d(2),
                nn.Conv1d(64, 64, 4), nn.ReLU(), nn.MaxPool1d(2),
                nn.Conv1d(64, 128, 3, padding=1), nn.ReLU(),
                nn.AdaptiveAvgPool1d(1),
            )
            self.fc = nn.Sequential(
                nn.Flatten(),
                nn.Linear(128, 128), nn.ReLU(), nn.Dropout(0.5),
                nn.Linear(128, num_classes),
            )

        def forward(self, x):
            return self.fc(self.conv(x))

    return VTCNN2()


def _two_tone_score(x: np.ndarray) -> float:
    """Legacy spectral hook (kept for API compat) — differential test is primary now."""
    return 0.0


def heuristic_probs(x: np.ndarray, sps: int = 4) -> np.ndarray:
    """CFO-robust differential-phase fallback (no torch needed).

    Features computed on decimated symbols (sps=4 assumed):
      magstd : QAM (high) vs PSK/FSK (low)
      R      : |E[exp(j*dphi)]| — FSK high (coherent freq offset), PSK ~0
      b2/b4  : |E[exp(j*2/4*dphi)]| — BPSK b2 high, QPSK b4 high
    Honest confidence (capped downstream at 0.85).
    """
    xr = np.asarray(x).ravel()
    if xr.size < 64:
        return np.full(6, 1 / 6)
    # Decimate to symbols WITHOUT averaging (averaging smears rectangular
    # pulses and inflates magstd). sps comes from the chain's estimator.
    sps = max(1, int(sps))
    if len(xr) >= sps * 16:
        s = xr[::sps]
    else:
        s = xr
    s = np.asarray(s, dtype=np.complex128).ravel()
    s = s[np.isfinite(s)]
    if s.size < 16:
        return np.full(6, 1 / 6)
    s = s / (float(np.sqrt(np.mean(np.abs(s) ** 2))) + 1e-12)
    mag = np.abs(s)
    magstd = float(np.std(mag) / (np.mean(mag) + 1e-12))
    d = s[1:] * np.conj(s[:-1])
    ad = np.angle(d)
    R = float(abs(np.mean(np.exp(1j * ad))))
    b2 = float(abs(np.mean(np.exp(2j * ad))))
    b4 = float(abs(np.mean(np.exp(4j * ad))))
    scores = np.zeros(6)
    # FSK: coherent differential phase
    scores[5] = (R - 0.15) * 8.0
    # BPSK / QPSK via differential moments
    scores[0] = (b2 - 0.3) * 6.0 - magstd * 2.0
    scores[1] = (b4 - 0.2) * 6.0 - magstd * 2.0 + 0.4  # small QPSK prior
    # 8PSK: constant modulus but neither b2 nor b4
    scores[2] = (0.25 - abs(b2 - 0.05) - abs(b4 - 0.05)) * 4.0 - magstd * 3.0
    # QAM: magnitude spread; QAM64 slightly higher spread + denser
    q = (magstd - 0.24) * 12.0
    # magnitude-level count: QAM64 has more distinct radii
    try:
        hist, _ = np.histogram(mag, bins=12)
        peaks = int(np.sum(hist > (hist.max() * 0.25)))
    except Exception:
        peaks = 3
    scores[3] = q + (0.6 if peaks <= 6 else -0.3)
    scores[4] = q * 1.05 + (0.6 if peaks > 6 else -0.3)
    # softmax (temperature 1.2)
    s_ = (scores - scores.max()) / 1.2
    e = np.exp(s_ - 0)  # scores already centered
    p = e / (e.sum() + 1e-12)
    return p
