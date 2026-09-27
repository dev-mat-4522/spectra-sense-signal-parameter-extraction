import numpy as np
import pytest
from app.dsp.fec import _conv_encode, viterbi_decode, rs_decode, smoothing_decode, detect_fec, fec_decode

def test_viterbi_roundtrip():
    data = np.random.randint(0, 2, 100, dtype=np.uint8)
    encoded = _conv_encode(data, k=3)
    encoded[10] ^= 1
    encoded[20] ^= 1
    
    decoded = viterbi_decode(encoded, k=3)
    np.testing.assert_array_equal(decoded[:95], data[:95])

def test_viterbi_detect():
    data = np.random.randint(0, 2, 200, dtype=np.uint8)
    encoded = _conv_encode(data, k=3)
    det = detect_fec(encoded)
    assert det["coded"] is True
    assert "viterbi-K3" in det["method"]
    
    det_rand = detect_fec(data)
    assert det_rand["coded"] is False

def test_rs_fallback():
    data = np.random.randint(0, 2, 800, dtype=np.uint8)
    res = rs_decode(data)
    assert len(res["bits"]) == len(data)

def test_smoothing_stub():
    data = np.random.randint(0, 2, 100, dtype=np.uint8)
    res = smoothing_decode(data)
    assert len(res["bits"]) == len(data)
    assert res["method"] == "smoothing-stub"

def test_fec_decode_bypass():
    data = np.random.randint(0, 2, 100, dtype=np.uint8)
    res = fec_decode(data, method="none")
    np.testing.assert_array_equal(res["bits"], data)
    assert res["method"] == "none"

def test_fec_decode_concatenated():
    data = np.random.randint(0, 2, 100, dtype=np.uint8)
    encoded = _conv_encode(data, k=3)
    res = fec_decode(encoded, method="concat")
    assert "concat" in res["method"]
    assert len(res["bits"]) > 0
