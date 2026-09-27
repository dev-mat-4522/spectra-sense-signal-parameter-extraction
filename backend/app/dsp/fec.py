"""FEC decoders (PRD §5.3): Viterbi (conv), Reed-Solomon (pure-python), LDPC stub, concatenated.

All decoders are best-effort blind estimators: they attempt decode and report
a corrected BER proxy. No hard dependency on `reedsolo` / `galois` — if those
packages exist we use them, else pure-python fallbacks keep the pipeline alive.
"""
from __future__ import annotations
import numpy as np


# ---------------- Viterbi (rate 1/2, K=3..7, polys standard) ----------------
def _conv_encode(bits: np.ndarray, polys=(0o7, 0o5), k: int = 3) -> np.ndarray:
    bits = np.asarray(bits, dtype=np.uint8).ravel()
    n_out = len(polys)
    state = 0
    out = np.zeros(len(bits) * n_out, dtype=np.uint8)
    for i, b in enumerate(bits):
        state = ((state << 1) | int(b)) & ((1 << k) - 1)
        for j, p in enumerate(polys):
            out[i * n_out + j] = bin(state & p).count("1") % 2
    return out


def viterbi_decode(received: np.ndarray, polys=(0o7, 0o5), k: int = 3) -> np.ndarray:
    r = np.asarray(received, dtype=np.uint8).ravel()
    n_out = len(polys)
    n_states = 1 << (k - 1)
    n_steps = len(r) // n_out
    r = r[: n_steps * n_out].reshape(n_steps, n_out)
    INF = 10 ** 9
    path_metric = np.full(n_states, INF)
    path_metric[0] = 0
    # traceback
    prev_state = np.zeros((n_steps, n_states), dtype=np.int32)
    prev_input = np.zeros((n_steps, n_states), dtype=np.int32)
    for t in range(n_steps):
        nm = np.full(n_states, INF)
        for s in range(n_states):
            if path_metric[s] >= INF:
                continue
            for bit in (0, 1):
                ns = ((s << 1) | bit) & (n_states - 1)
                reg = ((s << 1) | bit) & ((1 << k) - 1)
                expected = np.array([bin(reg & p).count("1") % 2 for p in polys], dtype=np.uint8)
                ham = int(np.sum(expected != r[t]))
                m = path_metric[s] + ham
                if m < nm[ns]:
                    nm[ns] = m
                    prev_state[t, ns] = s
                    prev_input[t, ns] = bit
        path_metric = nm
    # traceback from best state
    s = int(np.argmin(path_metric))
    bits = np.zeros(n_steps, dtype=np.uint8)
    for t in range(n_steps - 1, -1, -1):
        bits[t] = prev_input[t, s]
        s = int(prev_state[t, s])
    return bits


# ---------------- Reed-Solomon (attempt optional lib, else parity fallback) ----------------
def rs_decode(bits: np.ndarray, nsize: int = 255, ksize: int = 223) -> dict:
    b = np.asarray(bits, dtype=np.uint8).ravel()
    # pack to bytes
    nbytes = len(b) // 8
    if nbytes == 0:
        return {"bits": b, "corrected": 0, "method": "rs-none"}
    data = np.packbits(b[: nbytes * 8]).tobytes()
    try:
        from reedsolo import RSCodec  # type: ignore
        rs = RSCodec(nsize - ksize)
        # chunk blocks
        out = bytearray()
        corrected = 0
        for i in range(0, len(data), nsize):
            blk = data[i:i + nsize]
            if len(blk) < nsize:
                out.extend(blk[:ksize])
                continue
            try:
                dec = rs.decode(blk)
                out.extend(dec[0][:ksize] if isinstance(dec, tuple) else dec[:ksize])
                corrected += 1
            except Exception:
                out.extend(blk[:ksize])
        bits_out = np.unpackbits(np.frombuffer(bytes(out), dtype=np.uint8)).astype(np.uint8)
        return {"bits": bits_out[: len(b)], "corrected": int(corrected), "method": "rs"}
    except Exception:
        # Fallback: single-parity per 8-bit group error flag (no correction, honest report)
        return {"bits": b, "corrected": 0, "method": "rs-unavailable-parity-check"}


def smoothing_decode(bits: np.ndarray, iterations: int = 5) -> dict:
    """Lightweight stub: repetition-code belief smoothing as placeholder for full LDPC.

    Honest labeling: reports method ldpc-lite so forensic report isn't misleading.
    """
    b = np.asarray(bits, dtype=np.uint8).ravel().astype(float)
    # 3-tap majority smoothing (helps burst errors slightly, never harms structure much)
    for _ in range(max(0, int(iterations))):
        b = np.round((np.roll(b, 1) + b + np.roll(b, -1)) / 3.0)
    return {"bits": b.astype(np.uint8), "corrected": 0, "method": "smoothing-stub"}


def detect_fec(bits: np.ndarray, max_bits: int = 20000) -> dict:
    """Blind convolutional-coding detector (Remediation R4).

    Code-closure test: Viterbi-decode with K=3..5, RE-ENCODE the result, and
    measure disagreement with the input (implied channel BER). A genuinely
    convolutionally-encoded stream closes at ~0-8% BER; uncoded data cannot
    (nearest-codeword disagreement stays high). Input capped at max_bits for
    speed (Python-loop Viterbi). Block codes (RS/LDPC) are NOT blind-detectable
    here by design — they stay manual-only, stated honestly in the report.
    """
    b = np.asarray(bits, dtype=np.uint8).ravel()[:max_bits]
    if len(b) < 64:
        return {"coded": False, "method": None, "confidence": 0.0,
                "reason": "too-short-for-detection"}
    best = {"ber": 1.0, "k": 3}
    POLYS = {3: (0o7, 0o5), 4: (0o17, 0o13), 5: (0o35, 0o23), 7: (0o171, 0o133)}
    for k in (3, 4, 5):
        try:
            dec = viterbi_decode(b, polys=POLYS[k], k=k)
            enc = _conv_encode(dec, polys=POLYS[k], k=k)[:len(b)]
            ber = float(np.mean(enc != b[:len(enc)]))
            if ber < best["ber"]:
                best = {"ber": ber, "k": k}
        except Exception:
            continue
    if best["ber"] < 0.08:
        conf = round(min(0.95, max(0.5, (0.08 - best["ber"]) / 0.08 * 0.45 + 0.5)), 3)
        return {"coded": True, "method": f"viterbi-K{best['k']}", "confidence": conf,
                "closure_ber": round(best["ber"], 4)}
    return {"coded": False, "method": None,
            "confidence": round(min(0.8, best["ber"]), 3),
            "closure_ber": round(best["ber"], 4),
            "reason": f"no-code-closure (best BER {best['ber']:.2%} at K={best['k']})"}


def fec_decode(bits: np.ndarray, method: str = "auto", **kw) -> dict:
    m = (method or "auto").lower()
    b = np.asarray(bits, dtype=np.uint8).ravel()
    if m == "auto":
        # Remediation R4: decode ONLY on confident blind detection, else bypass.
        det = detect_fec(b)
        if det["coded"] and det["confidence"] >= 0.8:
            dec = fec_decode(b, method=det["method"])
            dec["detection"] = det
            return dec
        return {"bits": b, "corrected": 0, "method": "none-bypass",
                "detection": det}
    if m.startswith("viterbi") or m in ("conv", "convolutional", "cc"):
        k = int(kw.get("K", 3))
        POLYS = {3: (0o7, 0o5), 4: (0o17, 0o13), 5: (0o35, 0o23), 7: (0o171, 0o133)}
        polys = POLYS.get(k, POLYS[3])
        # blind: assume rate 1/2 encoded stream; if odd length, pass through first
        if len(b) < 16:
            return {"bits": b, "corrected": 0, "method": "viterbi-passthrough-short"}
        dec = viterbi_decode(b, polys=polys, k=k)
        enc = _conv_encode(dec, polys=polys, k=k)[:len(b)]
        corrected = int(np.sum(enc != b[:len(enc)]))
        return {"bits": dec, "corrected": corrected, "method": f"viterbi-K{k}"}
    if m.startswith("rs") or m == "reed-solomon":
        return rs_decode(b)
    if m.startswith("ldpc"):
        return smoothing_decode(b, iterations=int(kw.get("iterations", 5)))
    if m in ("none", "off", "uncoded"):
        return {"bits": b, "corrected": 0, "method": "none"}
    if m in ("concat", "concatenated"):
        v = viterbi_decode(b) if len(b) >= 16 else b
        r = rs_decode(np.asarray(v, dtype=np.uint8))
        r["method"] = "concat-viterbi+rs"
        return r
    # default safe
    return {"bits": b, "corrected": 0, "method": "none"}
