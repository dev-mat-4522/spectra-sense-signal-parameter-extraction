"""Ground-truth regression: NTRO QPSK test vector (Fs=100 kHz, baud=1 kHz).

Locks Corrective Action Plan fixes: strict ingestion, user Fs, autocorr baud,
sps-aware AMC/demod, Gray mapping, FEC bypass, ASCII payload recovery.
"""
import numpy as np
from app.dsp.ingestion import load_signal
from app.dsp.burst import extract_burst
from app.dsp.cyclo import estimate_symbol_rate
from app.ml.infer import classify
from app.dsp.pipeline import run_pipeline

PATH = "data/samples/test_signal.iq"
FS = 100000.0


def test_ingestion_strict_complex():
    info = load_signal(PATH, sample_rate_hz=FS)
    assert info["dtype_origin"] == "complex64-float32-interleaved"
    assert info["sample_rate"] == FS
    assert info["file_samples"] == 100000


def test_burst_and_baud():
    info = load_signal(PATH, sample_rate_hz=FS)
    b = extract_burst(info["samples"])
    assert b["found"] and (b["end"] - b["start"]) < 20000  # message << file
    est = estimate_symbol_rate(info["samples"][b["start"]:b["end"]], FS)
    assert abs(est["symbol_rate_hz"] - 1000.0) / 1000.0 < 0.05


def test_amc_qpsk_with_fs():
    info = load_signal(PATH, sample_rate_hz=FS)
    b = extract_burst(info["samples"])
    c = classify(info["samples"][b["start"]:b["end"]], sps=100)
    assert c["modulation"] == "QPSK"


def test_full_pipeline_payload():
    r = run_pipeline(PATH, overrides={"sample_rate_hz": FS})
    assert r["params"]["sampling_rate_hz"] == FS
    assert abs(r["params"]["symbol_rate_hz"] - 1000.0) / 1000.0 < 0.05
    assert r["amc"]["modulation"] == "QPSK"
    assert r["fec"]["method"] in ("none", "none-bypass", "auto-viterbi-12")
    assert "NTRO_SIH_TEST_QPSK_2024" in (r["correlation"]["payload_ascii"] or [])

def test_golden_bpsk():
    r = run_pipeline("data/samples/golden_bpsk.iq", overrides={"sample_rate_hz": 100000.0})
    assert r["amc"]["modulation"] == "BPSK"
    assert "EST_2024" in "".join(r["correlation"]["payload_ascii"] or [])

def test_golden_fsk():
    r = run_pipeline("data/samples/golden_fsk.iq", overrides={"sample_rate_hz": 100000.0, "modulation": "FSK"})
    # FSK routing triggers afsk or fsk, depending on the heuristic model.
    # Our amc logic uses heuristic_probs which should predict FSK if R is high.
    assert r["demod"]["modulation"] in ("FSK", "FSK-2", "FSK-1200")

def test_golden_qam16():
    r = run_pipeline("data/samples/golden_qam16.iq", overrides={"sample_rate_hz": 100000.0, "modulation": "16-QAM"})
    assert r["demod"]["modulation"] in ("16-QAM", "QAM16", "QAM-16")
    assert "QAM16_2024" in "".join(r["correlation"]["payload_ascii"] or [])
