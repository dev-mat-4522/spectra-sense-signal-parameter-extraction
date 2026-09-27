"""NRZI Decoder (PRD Phase 2.2)."""
import numpy as np

def nrzi_decode(bits: np.ndarray) -> np.ndarray:
    b = np.asarray(bits, dtype=np.uint8).ravel()
    if len(b) == 0:
        return b
    # AX.25 NRZI: Transition = 0, No Transition = 1
    # Thus, if b[i] != b[i-1], output 0. If b[i] == b[i-1], output 1.
    # out = 1 - (b[i] ^ b[i-1])
    diff = np.diff(b) != 0
    out = np.zeros(len(b), dtype=np.uint8)
    # Assume first bit compares to 0 (arbitrary convention)
    out[0] = 1 - (b[0] ^ 0)
    out[1:] = 1 - diff
    return out

def nrzi_encode(bits: np.ndarray) -> np.ndarray:
    b = np.asarray(bits, dtype=np.uint8).ravel()
    if len(b) == 0:
        return b
    out = np.zeros(len(b), dtype=np.uint8)
    state = 0
    for i in range(len(b)):
        if b[i] == 0:
            state = 1 - state
        out[i] = state
    return out
