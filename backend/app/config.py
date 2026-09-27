"""Central configuration — env-overridable, deployment safe."""
from __future__ import annotations
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("SPECTRA_DATA_DIR", str(BASE_DIR / "data")))
UPLOAD_DIR = Path(os.getenv("SPECTRA_UPLOAD_DIR", str(DATA_DIR / "uploads")))
REPORT_DIR = Path(os.getenv("SPECTRA_REPORT_DIR", str(DATA_DIR / "reports")))
MODEL_PATH = Path(os.getenv("SPECTRA_MODEL_PATH", str(BASE_DIR / "app" / "ml" / "amc_cnn.pt")))

MAX_UPLOAD_MB = int(os.getenv("SPECTRA_MAX_UPLOAD_MB", "1024"))
ALLOWED_EXTS = {".iq", ".wav", ".bin"}
JOB_TTL_SEC = int(os.getenv("SPECTRA_JOB_TTL_SEC", "3600"))
CORS_ORIGINS = [o.strip() for o in os.getenv("SPECTRA_CORS", "http://localhost:3000,*").split(",") if o.strip()]
FFT_SIZE = int(os.getenv("SPECTRA_FFT_SIZE", "1024"))
WATERFALL_FRAMES = int(os.getenv("SPECTRA_WATERFALL_FRAMES", "64"))

for d in (DATA_DIR, UPLOAD_DIR, REPORT_DIR):
    d.mkdir(parents=True, exist_ok=True)
