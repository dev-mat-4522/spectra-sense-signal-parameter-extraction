import numpy as np
from .fec import viterbi_decode, rs_decode

# FUNcube / AO-40 FEC decoder
SYNC_VECTOR = np.unpackbits(np.array([0x1A, 0xCF, 0xFC, 0x1D], dtype=np.uint8))
FRAME_LEN = 5200  # Total AO-40 frame length in symbols
DECODED_LEN = 2560 # Bits after Viterbi (includes 256 byte payload + flush bits)

def descramble_ao40(bits: np.ndarray) -> np.ndarray:
    """CCSDS synchronous scrambler. Polynomial: 1 + x^3 + x^5 + x^7 + x^8"""
    b = np.asarray(bits, dtype=np.uint8).ravel()
    out = np.zeros_like(b)
    sr = 0xFF
    for i in range(len(b)):
        bit = (sr ^ (sr >> 3) ^ (sr >> 5) ^ (sr >> 7)) & 1
        out[i] = b[i] ^ bit
        sr = ((sr << 1) | bit) & 0xFF
    return out

def deinterleave_ao40(bits: np.ndarray) -> np.ndarray:
    """AO-40 block deinterleaver (64x40)"""
    if len(bits) < DECODED_LEN:
        return bits
    mat = bits[:DECODED_LEN].reshape(40, 64)
    return mat.T.reshape(-1)

def decode_funcube(bits: np.ndarray) -> dict:
    """FUNcube / AO-40 telemetry deframing.
    
    Path:
    1. Detect 0x1ACFFC1D sync vector
    2. Extract frame (5168 bits)
    3. Viterbi decode (r=1/2, K=7)
    4. De-interleave (64x40 block)
    5. Descramble (CCSDS)
    6. Reed-Solomon (255, 223)
    """
    b = np.asarray(bits, dtype=np.uint8).ravel()
    
    # 1. Detect Sync
    # Sliding window
    hits = []
    for i in range(len(b) - 32):
        if np.sum(b[i:i+32] ^ SYNC_VECTOR) <= 3:
            hits.append(i)
            
    if not hits:
        return {"success": False, "reason": "Signal detected, protocol decode not validated.", "method": "funcube-ao40"}
    
    # 2. Extract best frame
    best_frame = None
    for hit in hits:
        start = hit + 32
        if start + 5168 <= len(b):
            best_frame = b[start:start+5168]
            break
            
    if best_frame is None:
        return {"success": False, "reason": "Signal detected, protocol decode not validated. (Incomplete frame)", "method": "funcube-ao40"}
        
    try:
        # 3. Viterbi K=7, r=1/2, CCSDS polys
        v_bits = viterbi_decode(best_frame, polys=(0o171, 0o133), k=7)
        
        # 4. Deinterleave
        deint_bits = deinterleave_ao40(v_bits)
        
        # 5. Descramble
        descrambled = descramble_ao40(deint_bits)
        
        # 6. Reed-Solomon
        # AO-40 uses dual RS blocks or single? It's typically interleaved.
        # But even if RS fails, we extracted the structure!
        rs = rs_decode(descrambled)
        
        if rs["corrected"] >= 0:
            hex_data = np.packbits(rs["bits"]).tobytes().hex()
            return {"success": True, "payload": rs["bits"], "hex": hex_data, "method": "funcube-ao40"}
    except Exception:
        pass
        
    return {"success": False, "reason": "Signal detected, protocol decode not validated.", "method": "funcube-ao40", "sync_hits": len(hits)}
