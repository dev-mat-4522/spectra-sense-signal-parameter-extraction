"""AFSK Demodulator (PRD Phase 2.5)."""
import numpy as np

def demodulate_afsk(x: np.ndarray, fs: float, baud: float = 1200, mark: float = 1200, space: float = 2200) -> dict:
    """Non-coherent AFSK demodulation via frequency discrimination."""
    x = np.asarray(x).ravel()
    
    if np.iscomplexobj(x):
        x = x.real
        
    sps = int(fs / baud)
    if sps < 2:
        return {"bits": np.array([], dtype=np.uint8), "symbols": np.array([])}
        
    # Generate mark/space filters
    t = np.arange(sps) / fs
    f_mark = np.exp(-1j * 2 * np.pi * mark * t)
    f_space = np.exp(-1j * 2 * np.pi * space * t)
    
    # Filter and envelope detect
    from scipy.signal import fftconvolve
    c_mark = np.abs(fftconvolve(x, f_mark, mode='same'))
    c_space = np.abs(fftconvolve(x, f_space, mode='same'))
    
    # Discriminator output
    disc = c_mark - c_space
    
    # Simple symbol sync: find optimal sampling phase
    best_phase = 0
    best_power = 0
    for p in range(sps):
        samp = disc[p::sps]
        pow = np.mean(samp**2)
        if pow > best_power:
            best_power = pow
            best_phase = p
            
    syms = disc[best_phase::sps]
    bits = (syms > 0).astype(np.uint8)
    
    return {"bits": bits, "symbols": syms}
