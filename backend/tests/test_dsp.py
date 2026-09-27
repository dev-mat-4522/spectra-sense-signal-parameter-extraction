import numpy as np
from app.dsp.ingestion import load_signal
from app.dsp.spectrum import waterfall, constellation_points
from app.dsp.cyclo import estimate_params
from app.dsp.demod import demodulate
from app.dsp.interleave import deinterleave
from app.dsp.fec import viterbi_decode, _conv_encode, fec_decode
from app.dsp.correlator import correlate
from app.ml.infer import classify


def _qpsk(n=512, sps=4, seed=0):
    rng = np.random.default_rng(seed)
    syms = np.exp(1j * (np.pi / 4 + rng.integers(0, 4, n) * np.pi / 2))
    sig = np.repeat(syms, sps).astype(np.complex64)
    sig = sig + (rng.normal(0, 0.05, len(sig)) + 1j * rng.normal(0, 0.05, len(sig)))
    return sig


def test_ingest_normalize(tmp_path):
    sig = _qpsk()
    p = tmp_path / "t.iq"
    sig.astype(np.complex64).tofile(str(p))
    info = load_signal(p)
    assert info["samples"].dtype == np.complex64
    assert float(np.max(np.abs(info["samples"]))) <= 1.0 + 1e-6


def test_pipeline_blocks():
    sig = _qpsk(n=256)
    params = estimate_params(sig, known_sr=1_000_000)
    assert params["sampling_rate_hz"] == 1_000_000
    amc = classify(sig)
    assert amc["modulation"] in ("BPSK", "QPSK", "8PSK", "QAM16", "QAM64", "FSK")
    dem = demodulate(sig, "QPSK", sps=4)
    assert len(dem["bits"]) >= 200
    dei = deinterleave(dem["bits"], method="block")
    assert len(dei["bits"]) == len(dem["bits"])
    # viterbi roundtrip
    bits = np.array([0, 1, 1, 0, 1, 0, 0, 1] * 8, dtype=np.uint8)
    enc = _conv_encode(bits)
    dec = viterbi_decode(enc)
    assert (dec == bits).mean() > 0.95
    corr = correlate(np.concatenate([np.array([0, 1, 1, 1, 1, 1, 1, 0], dtype=np.uint8), dei["bits"]]))
    assert corr["num_hits"] >= 1
    wf = waterfall(sig)
    assert len(wf) >= 1
    cp = constellation_points(sig)
    assert len(cp) > 10


def test_fec_passthrough():
    b = np.ones(5, dtype=np.uint8)
    assert len(fec_decode(b, method="viterbi-12")["bits"]) == 5
