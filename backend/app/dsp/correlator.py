"""Bitstream correlation — sync-word search + header/payload split + ASCII recovery.

Blind demod has intrinsic ambiguities (carrier phase rotation, polarity).
`resolve()` trials rotations/inversions and keeps the candidate scoring best on
sync-word hits + printable-ASCII content, so payloads like NTRO test strings
decode instead of coming out as hex garbage.
"""
from __future__ import annotations
import re
import numpy as np
from .hdlc import extract_hdlc_frames
from .ax25 import parse_ax25
from .csp import parse_csp_header

SYNC_WORDS = {
    "Barker-13 (802.11/radar)": [1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 0, 1],
    "HDLC flag 0x7E": [0, 1, 1, 1, 1, 1, 1, 0],
    "802.11 SFD 0xF3A0-ish16": [1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0],
    "CCSDS ASM 0x1ACFFC1D (32b)": [int(b) for b in format(0x1ACFFC1D, "032b")],
    "GSM SCH": [1,0,1,1,1,0,0,1,0,1,1,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,1,1,1,1,0,0,1,0,1,1,0,1,0,1,0,0,0,1,0,1,0,1,1,1,0,1,1,0,0,0,0,1,1,0,1,1],
    "Preamble-16 alternating": [0, 1] * 8,
}

# Alternating preambles match ANY alternating-ish data (including wrongly
# rotated structured streams), so they score near-zero in ambiguity trials
# and require stricter mismatch for reporting.
WEAK_PATTERNS = {"GSM SCH", "Preamble-16 alternating"}

_ASCII_RUN = re.compile(r"[ -~]{4,}")


def _search(bits: np.ndarray, pat: np.ndarray, max_mismatch: int) -> list[int]:
    """Vectorized sliding Hamming search. Returns offsets with ham <= max_mismatch."""
    n, m = len(bits), len(pat)
    if n < m or m == 0:
        return []
    if n > 20000:
        # strided window matrix (copy) — ~n*m bytes transient
        shape = (n - m + 1, m)
        strides = (bits.strides[0], bits.strides[0])
        try:
            wins = np.lib.stride_tricks.as_strided(bits, shape=shape, strides=strides).copy()
            ham = np.sum(wins != pat[None, :], axis=1)
            return [int(i) for i in np.flatnonzero(ham <= max_mismatch)[:500]]
        except Exception:
            pass
    # small-stream direct loop
    out: list[int] = []
    for i in range(0, n - m + 1):
        if int(np.sum(bits[i:i + m] != pat)) <= max_mismatch:
            out.append(i)
            if len(out) >= 500:
                break
    return out


def correlate_bits(bits: np.ndarray, max_mismatch: int = 2) -> dict:
    b = np.asarray(bits, dtype=np.uint8).ravel()
    hits: list[dict] = []
    for name, pat in SYNC_WORDS.items():
        # weak (alternating) patterns: strict matching to suppress spurious hits
        mm = 0 if name in WEAK_PATTERNS and len(b) < 2000 else (1 if name in WEAK_PATTERNS else max_mismatch)
        p = np.asarray(pat, dtype=np.uint8)
        for off in _search(b, p, mm):
            ham = int(np.sum(b[off:off + len(p)] != p))
            hits.append({"sync": name, "offset": off, "mismatches": ham, "length": len(p),
                         "weak": name in WEAK_PATTERNS})
    hits.sort(key=lambda h: (h["offset"], h["mismatches"]))
    return {"hits": hits, "num": len(hits)}


def bits_to_ascii_runs(bits: np.ndarray) -> list[str]:
    b = np.asarray(bits, dtype=np.uint8).ravel()
    nbytes = len(b) // 8
    if nbytes == 0:
        return []
    raw = bytes(np.packbits(b[: nbytes * 8])).decode("ascii", errors="replace")
    runs = _ASCII_RUN.findall(raw)
    # also try LSB-first bit order within each byte (Tx convention ambiguity)
    rev = bytearray()
    for i in range(0, nbytes * 8, 8):
        byte = 0
        for j in range(8):
            byte |= int(b[i + j]) << j
        rev.append(byte)
    runs += _ASCII_RUN.findall(rev.decode("ascii", errors="replace"))
    # dedupe, longest first
    seen: dict[str, None] = {}
    for r in runs:
        seen[r] = None
    return sorted(seen.keys(), key=len, reverse=True)[:10]


def score_candidate(bits: np.ndarray) -> tuple[float, dict]:
    """Public scoring: strong sync hits + heavy ASCII-payload weight."""
    c = correlate_bits(bits)
    runs = bits_to_ascii_runs(bits)
    ascii_bonus = max((len(r) for r in runs), default=0)
    strong = sum(1 for h in c["hits"] if not h.get("weak"))
    weak = sum(1 for h in c["hits"] if h.get("weak"))
    # A real ASCII payload crushes spurious alternating-preamble matches.
    return (strong * 2.0 + weak * 0.1 + min(ascii_bonus, 64) * 10.0,
            {"hits": c["hits"][:10], "ascii": runs[:5]})


def _rot_candidates(bits: np.ndarray, bps: int) -> list[tuple[str, np.ndarray]]:
    """Phase-rotation / polarity ambiguity trials for the demod bitstream."""
    b = np.asarray(bits, dtype=np.uint8).ravel()
    cands = [("as-is", b), ("inverted", 1 - b)]
    if bps == 2 and len(b) >= 4:
        pairs = b[: len(b) // 2 * 2].reshape(-1, 2)
        # Gray code mapping:
        # 0°  : b0, b1
        # 90° : b1, 1-b0
        # 180°: 1-b0, 1-b1
        # 270°: 1-b1, b0
        
        b0 = pairs[:, 0]
        b1 = pairs[:, 1]
        
        rot90 = np.column_stack((b1, 1 - b0)).reshape(-1)
        rot180 = np.column_stack((1 - b0, 1 - b1)).reshape(-1)
        rot270 = np.column_stack((1 - b1, b0)).reshape(-1)
        
        cands.append(("rot90", rot90))
        cands.append(("rot180", rot180))
        cands.append(("rot270", rot270))
        cands.append(("rot90+inv", 1 - rot90))
        cands.append(("rot180+inv", 1 - rot180))
        cands.append(("rot270+inv", 1 - rot270))
    return cands


def resolve(bits: np.ndarray, bits_per_symbol: int = 1) -> dict:
    """Pick the best ambiguity trial; returns corrected bits + diagnostics.

    Occam rule: 'as-is' wins ties — a rotation/inversion must beat it by a
    clear margin (>=5 points) to take over.
    """
    cands = _rot_candidates(bits, bits_per_symbol)
    base_score, base_diag = score_candidate(cands[0][1])
    best_name, best_bits, best_score, best_diag = "as-is", np.asarray(cands[0][1], dtype=np.uint8), base_score, base_diag
    for name, cand in cands[1:]:
        s, diag = score_candidate(cand)
        if s > best_score + 5.0:
            best_name, best_bits, best_score, best_diag = name, np.asarray(cand, dtype=np.uint8), s, diag
    return {"bits": best_bits, "trial": best_name, "score": round(float(best_score), 1),
            "diag": best_diag}


def correlate(bits: np.ndarray, max_mismatch: int = 2, bits_per_symbol: int = 1) -> dict:
    b = np.asarray(bits, dtype=np.uint8).ravel()
    res = resolve(b, bits_per_symbol)
    rb = np.asarray(res["bits"], dtype=np.uint8)
    c = correlate_bits(rb, max_mismatch)
    hits = c["hits"]
    header_bits, payload_bits = b[:0], rb
    framing = None
    
    # Check for HDLC/AX25 frames first
    hdlc_frames = extract_hdlc_frames(rb)
    ax25_packets = []
    csp_packets = []
    
    if hdlc_frames:
        for frame in hdlc_frames:
            ax = parse_ax25(frame)
            if ax["valid"]:
                ax25_packets.append(ax)
                if ax["pid"] == 0x01: # CSP over AX.25
                    csp = parse_csp_header(ax["info_bytes"])
                    if csp["valid"]:
                        csp_packets.append(csp)
        
        if ax25_packets:
            framing = {"sync": "HDLC AX.25", "header_len": 0}
            payload_bits = hdlc_frames[0] # Just show first frame for hex
            hits.insert(0, {"sync": "HDLC AX.25 Frame", "offset": 0, "mismatches": 0, "length": 0})
            
    if not framing:
        strong = [h for h in hits if not h.get("weak")]
        anchor = (strong or hits)[:1]
        if anchor:
            o = int(anchor[0]["offset"]) + int(anchor[0]["length"])
            header_bits, payload_bits = rb[:o], rb[o:]
            framing = {"sync": anchor[0]["sync"], "header_len": int(o)}
            
    nbytes = len(payload_bits) // 8
    payload_hex = bytes(np.packbits(payload_bits[: nbytes * 8])).hex() if nbytes else ""
    ascii_runs = bits_to_ascii_runs(rb)
    
    ret = {
        "hits": hits[:50],
        "num_hits": len(hits),
        "framing": framing,
        "header_len_bits": int(len(header_bits)),
        "payload_len_bits": int(len(payload_bits)),
        "payload_hex": payload_hex[:2048],
        "payload_hex_truncated": len(payload_hex) > 2048,
        "payload_ascii": ascii_runs[:5],
        "ambiguity_trial": res["trial"],
    }
    if ax25_packets:
        ret["ax25"] = ax25_packets
    if csp_packets:
        ret["csp"] = csp_packets
        
    return ret
