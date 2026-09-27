"""De-interleavers (PRD §5.3): block, convolutional, diagonal, pseudo-random."""
from __future__ import annotations
import numpy as np


def deinterleave_block(bits: np.ndarray, rows: int = 16) -> np.ndarray:
    b = np.asarray(bits, dtype=np.uint8).ravel()
    if b.size == 0:
        return b
    rows = max(2, int(rows))
    cols = int(np.ceil(len(b) / rows))
    padded = np.zeros(rows * cols, dtype=np.uint8)
    padded[:len(b)] = b
    mat = padded.reshape(rows, cols)
    # The zero padding was added to the end of the original stream, which corresponds
    # to the last elements of the last column(s) in the original matrix.
    # After transpose, these elements are dispersed. To perfectly invert, 
    # we just return the first len(b) elements if it was perfectly blocked.
    # Wait, if we padded, the transmitted stream was mat.T.
    # We are receiving mat.T. So we should reshape to cols x rows, transpose to rows x cols, and flatten.
    # If the input is the RECEIVED interleaved bits, it should be reshaped (cols, rows), then T.
    # The existing code did: mat = b.reshape(rows, cols) -> mat.T. 
    # If this is DE-interleave, we reshape to (cols, rows) and transpose back!
    # Let's fix the block deinterleave to be the inverse of block interleave.
    received = np.zeros(rows * cols, dtype=np.uint8)
    received[:len(b)] = b
    mat = received.reshape(cols, rows)
    return mat.T.reshape(-1)[:len(b)]


def deinterleave_diagonal(bits: np.ndarray, rows: int = 16) -> np.ndarray:
    b = np.asarray(bits, dtype=np.uint8).ravel()
    rows = max(2, int(rows))
    cols = int(np.ceil(len(b) / rows))
    padded = np.zeros(rows * cols, dtype=np.uint8)
    padded[:len(b)] = b
    mat = padded.reshape(rows, cols)
    out = np.zeros_like(padded)
    k = 0
    for d in range(rows + cols - 1):
        for r in range(rows):
            c = d - r
            if 0 <= c < cols:
                out[k] = mat[r, c]
                k += 1
    return out[:len(b)]


def deinterleave_convolutional(bits: np.ndarray, branches: int = 8, delay: int = 4) -> np.ndarray:
    """Inverse of a convolutional interleaver (Forney/Ramsey).
    In the deinterleaver, branch j has delay (B - 1 - j) * delay.
    """
    b = np.asarray(bits, dtype=np.uint8).ravel()
    B = max(2, int(branches))
    delay = int(delay)
    n = len(b)
    if n == 0:
        return b
    
    out = np.zeros(n, dtype=np.uint8)
    # The delay lines
    shift_regs = [[] for _ in range(B)]
    for _ in range(B):
        # Initialize with zeros to avoid index errors at the start
        shift_regs[_].extend([0] * ((B - 1 - _) * delay))
        
    for i in range(n):
        branch = i % B
        req_delay = (B - 1 - branch) * delay
        if req_delay == 0:
            out[i] = b[i]
        else:
            shift_regs[branch].append(b[i])
            out[i] = shift_regs[branch].pop(0)
    return out


def deinterleave_pseudo_random(bits: np.ndarray, seed: int = 0x1F2B3C4D) -> np.ndarray:
    b = np.asarray(bits, dtype=np.uint8).ravel()
    rng = np.random.default_rng(seed)
    perm = rng.permutation(len(b))
    inv = np.argsort(perm, kind="stable")
    return b[inv]


def deinterleave(bits: np.ndarray, method: str = "block", **kw) -> dict:
    m = (method or "block").lower().replace("-", "_")
    fn = {"block": deinterleave_block, "diagonal": deinterleave_diagonal,
          "convolutional": deinterleave_convolutional, "conv": deinterleave_convolutional,
          "pseudo_random": deinterleave_pseudo_random, "random": deinterleave_pseudo_random}.get(m, deinterleave_block)
    # call with kwargs safely (ignore incompatible kwargs)
    try:
        out = fn(np.asarray(bits, dtype=np.uint8), **kw)
    except TypeError:
        out = fn(np.asarray(bits, dtype=np.uint8))
    return {"bits": np.asarray(out, dtype=np.uint8), "method": m}
