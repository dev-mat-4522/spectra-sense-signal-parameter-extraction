import numpy as np
import pytest
from app.dsp.ingestion import load_signal

def test_empty_file_iq(tmp_path):
    p = tmp_path / "empty.iq"
    p.write_bytes(b"")
    with pytest.raises(ValueError, match="Unrecognized"):
        load_signal(str(p))

def test_truncated_file_iq(tmp_path):
    p = tmp_path / "trunc.iq"
    p.write_bytes(b"\x01\x02\x03") # 3 bytes
    with pytest.raises(ValueError, match="Unrecognized"):
        load_signal(str(p))

def test_wrong_format_ext(tmp_path):
    p = tmp_path / "test.txt"
    p.write_text("hello world")
    with pytest.raises(ValueError, match="Unsupported extension"):
        load_signal(str(p))

def test_wav_empty(tmp_path):
    p = tmp_path / "empty.wav"
    p.write_bytes(b"")
    # scipy.io.wavfile will raise ValueError or EOFError or similar
    with pytest.raises(ValueError):
        load_signal(str(p))
