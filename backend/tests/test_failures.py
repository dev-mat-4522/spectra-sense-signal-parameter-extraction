import pytest
from app.dsp.ingestion import load_signal
from app.dsp.pipeline import run_pipeline

def test_missing_file():
    with pytest.raises(Exception):
        load_signal("does_not_exist.iq")

def test_insufficient_samples():
    with open("data/samples/tiny.iq", "wb") as f:
        f.write(b"0" * 32)
    with pytest.raises(Exception):
        load_signal("data/samples/tiny.iq", sample_rate_hz=1000)

def test_no_fs():
    # .iq file without Fs should fall back or error gracefully
    # ingestion defaults to 1M if not provided
    info = load_signal("data/samples/test_signal.iq")
    assert info["sample_rate"] == None
