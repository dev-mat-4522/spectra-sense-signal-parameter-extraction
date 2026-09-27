"""G3RUH Descrambler (PRD Phase 2.1)."""
import numpy as np

def descramble(bits: np.ndarray) -> np.ndarray:
    b = np.asarray(bits, dtype=np.uint8).ravel()
    out = np.zeros_like(b)
    shift_reg = 0
    for i in range(len(b)):
        bit = b[i]
        tap12 = (shift_reg >> 11) & 1
        tap17 = (shift_reg >> 16) & 1
        out_bit = bit ^ tap12 ^ tap17
        shift_reg = ((shift_reg << 1) | bit) & 0x1FFFF
        out[i] = out_bit
    return out

def scramble(bits: np.ndarray) -> np.ndarray:
    b = np.asarray(bits, dtype=np.uint8).ravel()
    out = np.zeros_like(b)
    shift_reg = 0
    for i in range(len(b)):
        bit = b[i]
        tap12 = (shift_reg >> 11) & 1
        tap17 = (shift_reg >> 16) & 1
        out_bit = bit ^ tap12 ^ tap17
        shift_reg = ((shift_reg << 1) | out_bit) & 0x1FFFF
        out[i] = out_bit
    return out
