"""AX.25 Parser (PRD Phase 2.4)."""
import numpy as np

def _calc_fcs(data: bytes) -> int:
    crc = 0xFFFF
    for byte in data:
        crc ^= byte
        for _ in range(8):
            if crc & 1:
                crc = (crc >> 1) ^ 0x8408
            else:
                crc >>= 1
    return crc ^ 0xFFFF

def parse_ax25(frame_bits: np.ndarray) -> dict:
    if len(frame_bits) % 8 != 0 or len(frame_bits) < 136:
        return {"valid": False, "reason": "too short"}
    
    # Pack bits to bytes (AX.25 is LSB first)
    nbytes = len(frame_bits) // 8
    frame_bytes = bytearray(nbytes)
    for i in range(nbytes):
        val = 0
        for j in range(8):
            val |= (frame_bits[i*8 + j] << j)
        frame_bytes[i] = val
        
    data = bytes(frame_bytes)
    
    # FCS check
    if _calc_fcs(data) != 0x0F47:  # Magic remainder for valid FCS-16
        # Compute explicitly to see if matched
        payload_data = data[:-2]
        calc = _calc_fcs(payload_data)
        recv = (data[-1] << 8) | data[-2]
        if calc != recv:
            return {"valid": False, "reason": "FCS mismatch"}

    # Parse header
    def parse_callsign(offset):
        call = ""
        for i in range(6):
            c = data[offset + i] >> 1
            if 32 <= c <= 126:
                call += chr(c)
        ssid = (data[offset + 6] >> 1) & 0x0F
        return call.strip(), ssid, (data[offset + 6] & 1)

    try:
        dest_call, dest_ssid, _ = parse_callsign(0)
        src_call, src_ssid, has_next = parse_callsign(7)
        
        offset = 14
        path = []
        while has_next == 0 and offset < len(data) - 4:
            c, s, has_next = parse_callsign(offset)
            path.append(f"{c}-{s}")
            offset += 7
            
        control = data[offset]
        pid = data[offset + 1] if control & 0x03 == 0x03 else None
        
        info_offset = offset + (2 if pid is not None else 1)
        info = data[info_offset:-2]
        
        return {
            "valid": True,
            "dest": f"{dest_call}-{dest_ssid}",
            "src": f"{src_call}-{src_ssid}",
            "path": path,
            "control": control,
            "pid": pid,
            "info_hex": info.hex(),
            "info_ascii": info.decode("ascii", errors="replace"),
            "info_bytes": info
        }
    except Exception as e:
        return {"valid": False, "reason": str(e)}
