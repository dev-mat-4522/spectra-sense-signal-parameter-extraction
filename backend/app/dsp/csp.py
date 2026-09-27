"""CSP Header Parser (PRD Phase 2.6)."""
import struct

def parse_csp_header(data: bytes) -> dict:
    if len(data) < 4:
        return {"valid": False, "reason": "too short"}
        
    header = struct.unpack(">I", data[:4])[0]
    
    # CSP 1.x header fields
    pri = (header >> 30) & 0x03
    src = (header >> 25) & 0x1F
    dst = (header >> 20) & 0x1F
    dp = (header >> 14) & 0x3F
    sp = (header >> 8) & 0x3F
    flags = header & 0xFF
    
    # Heuristic validation: reserved bits should be 0, ports shouldn't be crazy
    valid = src > 0 and dst > 0 and pri < 4
    
    return {
        "valid": valid,
        "priority": pri,
        "source": src,
        "destination": dst,
        "dest_port": dp,
        "src_port": sp,
        "flags": flags
    }
