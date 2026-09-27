"""File ingestion & normalization — PRD §5.1.

Supports:
  .IQ / .bin : raw binary, tries complex64 (float32 I/Q) then int16 I/Q then float32 real
  .wav       : RIFF PCM (8/16/24/32-bit, float) mono/stereo -> complex baseband (I=ch0, Q=ch1 or Hilbert for mono)

All outputs: np.complex64 tensor, amplitude in [-1, +1], DC removed, noise floor calibrated.
Chunk-safe: uses memmap-friendly reads, caps analysis window for GB files.
"""
from __future__ import annotations
from pathlib import Path
import numpy as np
from scipy import signal as scipy_signal

ANALYSIS_CAP = 2_000_000  # max samples kept in RAM for param-est (2M). Full file FFT streams separately.


def _remove_dc(x: np.ndarray) -> np.ndarray:
    return x - np.mean(x)


def _normalize(x: np.ndarray) -> np.ndarray:
    x = _remove_dc(x)
    peak = float(np.max(np.abs(x))) if x.size else 0.0
    if peak > 0:
        x = x / peak
        # soft scale to [-1,1]; keep headroom
        x = x * 0.95
    return x.astype(np.complex64)


def _read_wav(path: Path) -> tuple[np.ndarray, int]:
    from scipy.io import wavfile
    sr, data = wavfile.read(str(path))
    if data.ndim == 2:
        # stereo -> I/Q
        i = data[:, 0].astype(np.float64)
        q = data[:, 1].astype(np.float64) if data.shape[1] > 1 else np.zeros_like(i)
    else:
        mono = data.astype(np.float64)
        if np.issubdtype(data.dtype, np.integer):
            # mono real -> analytic via Hilbert to get complex baseband
            n = min(len(mono), 65536)
            analytic = scipy_signal.hilbert(mono[:n] if len(mono) > n else mono)
            if len(mono) > n:
                # process remainder in chunks to avoid RAM blowup
                parts = [analytic]
                for s in range(n, len(mono), 65536):
                    parts.append(scipy_signal.hilbert(mono[s:s + 65536]))
                analytic = np.concatenate(parts)
            i, q = analytic.real, analytic.imag
        else:
            i = mono
            q = np.zeros_like(i)
    # scale ints to [-1,1]
    if np.issubdtype(data.dtype, np.integer):
        info = np.iinfo(data.dtype)
        scale = float(max(abs(info.min), info.max))
        i, q = i / scale, q / scale
    x = (i + 1j * q).astype(np.complex128)
    return x, int(sr)


def _read_raw_iq(path: Path) -> tuple[np.ndarray, int | None, str]:
    """Strict-first raw IQ reader (Corrective Action Plan §2).

    Primary: interleaved float32 (I0,Q0,I1,Q1,...) -> complex64 — the GNU Radio
    standard. Reading this as int16 is the classic corruption bug (turns QPSK
    into static, AMC then guesses FSK). Fallbacks are kept but REPORTED via
    dtype_origin so the UI/forensic report shows exactly what was assumed.
    """
    nbytes = Path(path).stat().st_size
    # Primary: interleaved float32 -> complex64 (strict, per blueprint)
    if nbytes >= 16 and nbytes % 8 == 0:
        try:
            raw = np.fromfile(str(path), dtype=np.float32)
            if len(raw) >= 128 and len(raw) % 2 == 0 and np.all(np.isfinite(raw[: min(len(raw), 8192)])):
                x = (raw[0::2] + 1j * raw[1::2]).astype(np.complex128)
                if len(x) >= 64 and float(np.max(np.abs(x[: min(len(x), 8192)]))) > 0:
                    return x, None, "complex64-float32-interleaved"
        except Exception:
            pass
    # Fallback 1: int16 IQ (4 bytes/sample) — e.g. RTL-SDR raw
    if nbytes % 4 == 0:
        try:
            iq16 = np.fromfile(str(path), dtype=np.int16).astype(np.float64) / 32768.0
            if len(iq16) >= 128:
                x = (iq16[0::2] + 1j * iq16[1::2])
                if len(x) >= 32 and float(np.max(np.abs(x))) > 0 and np.all(np.isfinite(x[:4096])):
                    return x.astype(np.complex128), None, "int16-iq-fallback"
        except Exception:
            pass
    # Fallback 2: float32 real -> analytic
    try:
        r32 = np.fromfile(str(path), dtype=np.float32)
        if len(r32) >= 64 and np.all(np.isfinite(r32[:4096])):
            n = min(len(r32), 65536)
            analytic = scipy_signal.hilbert(r32[:n].astype(np.float64))
            return analytic.astype(np.complex128), None, "float32-real-hilbert-fallback"
    except Exception:
        pass
    raise ValueError("Unrecognized .IQ binary format (tried float32-complex, int16 IQ, float32 real).")


def load_signal(path: str | Path, sample_rate_hz: float | None = None) -> dict:
    """Load + normalize. Returns dict with samples, sr, format, meta.

    sample_rate_hz: user-supplied Fs (Corrective Action Plan §3 — Fs CANNOT be
    guessed blind from raw bytes; .wav headers remain authoritative).
    """
    p = Path(path)
    ext = p.suffix.lower()
    dtype_origin = "wav-riff"
    if ext == ".wav":
        x, sr = _read_wav(p)
        fmt = "wav"
    elif ext in (".iq", ".bin"):
        x, sr, dtype_origin = _read_raw_iq(p)
        fmt = "iq"
    else:
        raise ValueError(f"Unsupported extension {ext!r}. Use .IQ/.bin/.wav")
    if fmt != "wav" and sample_rate_hz and float(sample_rate_hz) > 0:
        sr = float(sample_rate_hz)

    file_samples = int(len(x))
    # Downselect analysis window (center) for huge files; keep full length recorded
    if len(x) > ANALYSIS_CAP:
        start = (len(x) - ANALYSIS_CAP) // 2
        x_win = x[start:start + ANALYSIS_CAP]
    else:
        x_win = x

    x_win = _normalize(np.asarray(x_win, dtype=np.complex128))
    noise_floor = float(np.median(np.abs(x_win)) + 1e-12)

    return {
        "samples": x_win.astype(np.complex64),
        "sample_rate": sr,  # None for raw IQ unless user supplies Fs
        "format": fmt,
        "dtype_origin": dtype_origin,
        "fs_source": "wav_header" if fmt == "wav" else ("user" if sample_rate_hz else "blind-assumed"),
        "file_samples": file_samples,
        "file_bytes": int(p.stat().st_size),
        "noise_floor": noise_floor,
    }


def stream_samples_for_fft(path: str | Path, dtype_hint: str = "auto", chunk: int = 1 << 20):
    """Generator yielding normalized complex chunks for GB-safe waterfall computation."""
    info = load_signal(path)  # loads window only; for true streaming of >2M we memmap below
    p = Path(path)
    if info["file_samples"] <= ANALYSIS_CAP:
        yield info["samples"]
        return
    # Large file: stream raw then normalize per-chunk with global DC approx
    if p.suffix.lower() == ".wav":
        # fallback: yield window (wav streaming decode of GB file is out of scope; window is representative)
        yield info["samples"]
        return
    # raw IQ complex64 streaming
    try:
        mm = np.memmap(str(p), dtype=np.complex64, mode="r")
        mean = np.mean(mm[:65536])
        peak = float(np.max(np.abs(mm[:65536]))) or 1.0
        for s in range(0, len(mm), chunk):
            c = (np.asarray(mm[s:s + chunk], dtype=np.complex128) - mean) / peak * 0.95
            yield c.astype(np.complex64)
        del mm
    except Exception:
        yield info["samples"]
