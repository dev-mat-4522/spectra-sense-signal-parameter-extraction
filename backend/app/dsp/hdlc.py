"""Proper HDLC Framing (PRD Phase 2.3)."""
import numpy as np

def extract_hdlc_frames(bits: np.ndarray) -> list[np.ndarray]:
    b = np.asarray(bits, dtype=np.uint8).ravel()
    
    # 1. Find flags (01111110)
    flags = []
    for i in range(len(b) - 7):
        if (b[i] == 0 and b[i+1] == 1 and b[i+2] == 1 and b[i+3] == 1 and 
            b[i+4] == 1 and b[i+5] == 1 and b[i+6] == 1 and b[i+7] == 0):
            flags.append(i)
            
    frames = []
    for i in range(len(flags) - 1):
        start = flags[i] + 8
        end = flags[i+1]
        
        # Frame must have at least 16 bits (FCS alone)
        if end - start < 16:
            continue
            
        frame_bits = b[start:end]
        
        # 2. Bit destuffing: remove 0 after five 1s
        destuffed = []
        ones = 0
        skip = False
        for bit in frame_bits:
            if skip:
                skip = False
                continue
            if bit == 1:
                ones += 1
                destuffed.append(1)
            else:
                if ones == 5:
                    # Stuffed bit, skip adding it
                    pass
                else:
                    destuffed.append(0)
                ones = 0
                
        if len(destuffed) % 8 != 0:
            continue
            
        destuffed_arr = np.array(destuffed, dtype=np.uint8)
        frames.append(destuffed_arr)
        
    return frames
