"""Impaired synthetic IQ dataset + VT-CNN2 AMC training (Corrective Action Plan §4).

Variance protocol per modulation (BPSK, QPSK, 8PSK, QAM16, QAM64, FSK):
  - SNR: uniform -6..18 dB (hard but learnable; validation at low SNR 0..5 dB)
  - Phase offset: uniform [0, 2*pi) — real signals are never aligned
  - CFO: uniform +/-0.0005 cycles/symbol (drift; a full spin per window would
    erase absolute-phase structure — unlearnable and unrealistic)
  - Pulse shaping: rectangular OR root-raised-cosine (beta=0.35) at the frame's
    source SPS, then polyphase-resampled to the native CNN rate (mirrors R3).
  - Timing: max-energy phase align on 8 sps (mirrors inference alignment).
  - sps = 4, window = 128 samples (32 symbols), I/Q rows -> (2,128) tensors

Frames are generated ON THE FLY each epoch (~100k total), so the net never
sees the same impaired frame twice.

Usage:
  python -m app.ml.train --epochs 16 --frames-per-epoch 6000 --batch 128
"""
from __future__ import annotations
import argparse
import numpy as np

from .model import CLASSES, HAS_TORCH

SPS = 4
WIN = 128
SYM_WIN = 128  # CNN native window is 128 SYMBOLS (symbol-spaced, timing-aligned)
N_SYM = 40  # generated symbols per frame (extra for RRC transients + offsets)


def _rrc_taps(sps: int = 4, span: int = 8, beta: float = 0.35) -> np.ndarray:
    n = span * sps
    t = np.arange(-n / 2, n / 2 + 1) / sps
    h = np.zeros_like(t)
    for i, ti in enumerate(t):
        if abs(ti) < 1e-8:
            h[i] = 1.0 + beta * (4 / np.pi - 1)
        elif abs(abs(ti) - 1 / (4 * beta)) < 1e-8:
            h[i] = beta / np.sqrt(2) * ((1 + 2 / np.pi) * np.sin(np.pi / (4 * beta))
                                        + (1 - 2 / np.pi) * np.cos(np.pi / (4 * beta)))
        else:
            num = np.sin(np.pi * ti * (1 - beta)) + 4 * beta * ti * np.cos(np.pi * ti * (1 + beta))
            den = np.pi * ti * (1 - (4 * beta * ti) ** 2)
            h[i] = num / den
    return (h / np.sqrt(np.sum(h ** 2))).astype(np.float64)


_RRC = _rrc_taps()


def _symbols(mod: str, n_sym: int, rng: np.random.Generator) -> np.ndarray:
    if mod == "BPSK":
        return np.where(rng.integers(0, 2, n_sym), 1.0, -1.0).astype(np.complex128)
    if mod == "QPSK":
        return np.exp(1j * (np.pi / 4 + rng.integers(0, 4, n_sym) * np.pi / 2))
    if mod == "8PSK":
        return np.exp(1j * (rng.integers(0, 8, n_sym) * np.pi / 4 + np.pi / 8))
    if mod == "QAM16":
        v = np.array([-3, -1, 1, 3])
        return ((rng.choice(v, n_sym) + 1j * rng.choice(v, n_sym)) / np.sqrt(10)).astype(np.complex128)
    if mod == "QAM64":
        v = np.array([-7, -5, -3, -1, 1, 3, 5, 7])
        return ((rng.choice(v, n_sym) + 1j * rng.choice(v, n_sym)) / np.sqrt(42)).astype(np.complex128)
    if mod == "FSK":
        raise ValueError("FSK is built at sample rate inside synth_frame")
    raise ValueError(mod)


def synth_frame(mod: str, snr_db: float | None, rng: np.random.Generator) -> np.ndarray:
    """One impaired (2,128) frame, float32. snr_db=None -> uniform(-6,18)."""
    snr = float(rng.uniform(-6, 18)) if snr_db is None else float(snr_db)
    if mod == "FSK":
        # FSK is a continuous-phase frequency signal: build at sample rate
        n_sym = N_SYM
        f = np.where(rng.integers(0, 2, n_sym), 0.25, -0.25)
        sig = np.exp(1j * np.cumsum(np.repeat(f, SPS) * 2 * np.pi / SPS)).astype(np.complex128)
    else:
        syms = _symbols(mod, N_SYM, rng)
        up = np.zeros(N_SYM * SPS, dtype=np.complex128)
        up[::SPS] = syms
        if rng.random() < 0.5:
            sig = np.convolve(up, _RRC, mode="same")  # RRC-shaped
        else:
            sig = np.repeat(syms, SPS).astype(np.complex128)  # rectangular
    # impairments: CFO + phase + timing offset, then noise
    cfo = float(rng.uniform(-0.002, 0.002))
    ph = float(rng.uniform(0, 2 * np.pi))
    sig = sig * np.exp(1j * (2 * np.pi * cfo * np.arange(len(sig)) + ph))
    off = int(rng.integers(0, SPS))
    sig = sig[off:off + WIN] if len(sig) >= off + WIN else np.pad(sig[off:], (0, off + WIN - len(sig) + off))
    sig = sig[:WIN]
    p = float(np.mean(np.abs(sig) ** 2)) or 1.0
    sigma = float(np.sqrt(p / (2 * 10 ** (snr / 10))))
    sig = sig + (rng.normal(0, sigma, WIN) + 1j * rng.normal(0, sigma, WIN))
    sig = sig / (float(np.sqrt(np.mean(np.abs(sig) ** 2))) + 1e-12)  # RMS-normalize like inference
    return np.stack([sig.real, sig.imag]).astype(np.float32)


def synth(mod: str, n_sym: int = 256, sps: int = 4, snr_db: float = 12.0, rng=None) -> np.ndarray:
    """Legacy compat wrapper (tests/scripts): impaired complex64 waveform."""
    rng = rng or np.random.default_rng()
    fr = synth_frame(mod, snr_db, rng)
    return (fr[0] + 1j * fr[1]).astype(np.complex64)


NATIVE_SPS = 8  # inference resamples every burst to this rate pre-CNN (R3)


def _resample_to_8(hi: np.ndarray, sps_src: int) -> np.ndarray:
    import math
    from scipy.signal import resample_poly
    g = math.gcd(int(sps_src), NATIVE_SPS)
    up, down = NATIVE_SPS // g, int(sps_src) // g
    y = resample_poly(hi.real, up, down).astype(np.float64) + \
        1j * resample_poly(hi.imag, up, down).astype(np.float64)
    return np.asarray(y)


def synth_sym_frame(mod: str, snr_db: float | None, rng: np.random.Generator) -> np.ndarray:
    """One symbol-spaced (2,128) training frame — closed loop with inference.

    Mirrors the deployment chain exactly (Remediation R3): synthesize at a
    random source SPS (native 8, or 4/16/32/100), shape (rectangular or RRC at
    that rate), resample_poly to 8 sps, max-energy phase align, take 128
    symbols. The CNN therefore trains on the SAME distribution it sees live,
    including polyphase-resampling texture — no unseen pulse shapes.
    """
    snr = float(rng.uniform(-6, 18)) if snr_db is None else float(snr_db)
    n = SYM_WIN + 16  # margin for RRC transients
    sps_src = int(rng.choice([8, 8, 8, 4, 16, 32, 100]))
    if mod == "FSK":
        f = np.where(rng.integers(0, 2, n), 0.25, -0.25)
        hi = np.exp(1j * np.cumsum(np.repeat(f, sps_src) * 2 * np.pi / sps_src)).astype(np.complex128)
    else:
        syms = _symbols(mod, n, rng)
        up = np.zeros(n * sps_src, dtype=np.complex128)
        up[::sps_src] = syms
        if rng.random() < 0.5:
            hi = np.convolve(up, _rrc_taps(sps_src), mode="same")
        else:
            hi = np.repeat(syms, sps_src).astype(np.complex128)
    if sps_src != NATIVE_SPS:
        hi = _resample_to_8(hi, sps_src)
    # max-energy phase align (mirrors infer.align_symbols)
    best, best_e = None, -1.0
    for p in range(NATIVE_SPS):
        s = hi[p:p + NATIVE_SPS * SYM_WIN:NATIVE_SPS][:SYM_WIN]
        if len(s) < SYM_WIN:
            continue
        e = float(np.mean(np.abs(s) ** 2))
        if e > best_e:
            best, best_e = s, e
    sig = np.asarray(best if best is not None else hi[:SYM_WIN], dtype=np.complex128)
    if len(sig) < SYM_WIN:  # periodic extension for short remnants
        sig = np.tile(sig, int(np.ceil(SYM_WIN / max(1, len(sig)))))[:SYM_WIN]
    # impairments: CFO + phase, then noise. UNITS are cycles/symbol here.
    cfo = float(rng.uniform(-0.0005, 0.0005))
    ph = float(rng.uniform(0, 2 * np.pi))
    sig = sig * np.exp(1j * (2 * np.pi * cfo * np.arange(SYM_WIN) + ph))
    p = float(np.mean(np.abs(sig) ** 2)) or 1.0
    sigma = float(np.sqrt(p / (2 * 10 ** (snr / 10))))
    sig = sig + (rng.normal(0, sigma, SYM_WIN) + 1j * rng.normal(0, sigma, SYM_WIN))
    sig = sig / (float(np.sqrt(np.mean(np.abs(sig) ** 2))) + 1e-12)
    return np.stack([sig.real, sig.imag]).astype(np.float32)


def make_batch(n: int, snr_lo: float, snr_hi: float, rng: np.random.Generator):
    import torch
    X = np.zeros((n, 2, SYM_WIN), dtype=np.float32)
    y = np.zeros(n, dtype=np.int64)
    for i in range(n):
        ci = int(rng.integers(0, len(CLASSES)))
        X[i] = synth_sym_frame(CLASSES[ci], float(rng.uniform(snr_lo, snr_hi)), rng)
        y[i] = ci
    return torch.tensor(X), torch.tensor(y)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--epochs", type=int, default=16)
    ap.add_argument("--frames-per-epoch", type=int, default=6000)
    ap.add_argument("--batch", type=int, default=128)
    ap.add_argument("--patience", type=int, default=4)
    ap.add_argument("--lr", type=float, default=1e-3)
    ap.add_argument("--resume", action="store_true", help="continue from saved weights")
    args = ap.parse_args()
    if not HAS_TORCH:
        raise SystemExit("torch is required for training (pip install torch --index-url https://download.pytorch.org/whl/cpu)")
    import torch
    from torch.utils.data import TensorDataset, DataLoader
    from .model import build_model
    from ..config import MODEL_PATH

    rng = np.random.default_rng(7)
    # FIXED low-SNR validation set (doc: validate exclusively on noisy data)
    Xv, yv = make_batch(3000, 0.0, 5.0, rng)
    valloader = DataLoader(TensorDataset(Xv, yv), batch_size=256)

    model = build_model(len(CLASSES))
    assert model is not None
    if args.resume and MODEL_PATH.exists():
        try:
            model.load_state_dict(torch.load(str(MODEL_PATH), map_location="cpu"))
            print(f"[train] resumed from {MODEL_PATH}")
        except Exception as e:
            print(f"[train] resume failed ({e}), training from scratch")
    opt = torch.optim.Adam(model.parameters(), lr=args.lr)
    # Label smoothing keeps minority/confusable-class logits alive: without it,
    # overlapping PSK orders collapse to a single attractor (dead class).
    try:
        loss_fn = torch.nn.CrossEntropyLoss(label_smoothing=0.05)
    except TypeError:
        loss_fn = torch.nn.CrossEntropyLoss()

    def evaluate() -> float:
        model.eval()
        correct = total = 0
        per_class = np.zeros((len(CLASSES), len(CLASSES)), dtype=int)
        with torch.no_grad():
            for xb, yb in valloader:
                pred = model(xb).argmax(1)
                correct += int((pred == yb).sum())
                total += len(yb)
                for t, p in zip(yb.tolist(), pred.tolist()):
                    per_class[t, p] += 1
        model.train()
        return correct / max(1, total), per_class

    # Load RadioML data if available
    import pickle
    from pathlib import Path
    rml_path = Path("data/RML2016.10a_dict.pkl")
    rml_data = None
    if rml_path.exists():
        try:
            with open(rml_path, 'rb') as f:
                Xd = pickle.load(f, encoding='bytes')
            X_list, y_list = [], []
            mod_map = {b'BPSK': 0, b'QPSK': 1, b'8PSK': 2, b'QAM16': 3, b'QAM64': 4, b'CPFSK': 5, b'GFSK': 5}
            for k in Xd.keys():
                mod, snr = k
                if mod in mod_map and snr >= -6:
                    cid = mod_map[mod]
                    for pt in Xd[k]:
                        X_list.append(pt)
                        y_list.append(cid)
            if X_list:
                rml_data = (np.array(X_list), np.array(y_list))
                print(f"[train] Loaded RadioML 2016.10a: {len(X_list)} samples.", flush=True)
        except Exception as e:
            print(f"[train] Error loading RadioML data: {e}", flush=True)

    best, bad, total_frames = 0.0, 0, 0
    for ep in range(args.epochs):
        model.train()
        tot, nb = 0.0, 0
        n_batches = args.frames_per_epoch // args.batch
        
        for _ in range(n_batches):
            if rml_data is not None:
                idx = rng.choice(len(rml_data[0]), args.batch)
                xb, yb = torch.tensor(rml_data[0][idx]).float(), torch.tensor(rml_data[1][idx]).long()
            else:
                xb, yb = make_batch(args.batch, -6.0, 18.0, rng)
            opt.zero_grad()
            loss = loss_fn(model(xb), yb)
            loss.backward()
            opt.step()
            tot += float(loss.item())
            nb += 1
            total_frames += args.batch
        acc, _ = evaluate()
        print(f"[train] epoch {ep + 1}/{args.epochs} loss={tot / nb:.4f} lowSNR-val-acc={acc:.3f} frames={total_frames}", flush=True)
        if acc > best + 1e-4:
            best, bad = acc, 0
            MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
            torch.save(model.state_dict(), str(MODEL_PATH))
        else:
            bad += 1
            if bad >= args.patience:
                print(f"[train] early stop (best val acc {best:.3f})")
                break
    print(f"[train] BEST low-SNR val acc={best:.3f} -> {MODEL_PATH}")
    # Final per-class report on the low-SNR validation set
    model.load_state_dict(torch.load(str(MODEL_PATH), map_location="cpu"))
    acc, cm = evaluate()
    print(f"[train] final val acc={acc:.3f}")
    for i, c in enumerate(CLASSES):
        row = cm[i]
        denom = max(1, int(row.sum()))
        print(f"[train]   true {c:6s}: " + " ".join(f"{CLASSES[j]}={row[j] / denom:.2f}" for j in range(len(CLASSES))))


if __name__ == "__main__":
    main()
