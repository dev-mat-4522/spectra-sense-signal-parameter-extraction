"""REST routes: upload -> analyze -> results + report."""
from __future__ import annotations
import shutil
import threading
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse

from ..config import UPLOAD_DIR, REPORT_DIR, MAX_UPLOAD_MB, ALLOWED_EXTS
from ..store import create_job, get_job, update_job
from ..dsp.pipeline import run_pipeline
from ..report import build_pdf
from .schemas import AnalyzeRequest

router = APIRouter(prefix="/api")


def _safe_name(name: str) -> str:
    keep = "".join(c if (c.isalnum() or c in "._-") else "_" for c in (name or "signal.iq"))
    return keep[-120:] or "signal.iq"


@router.get("/health")
def health():
    return {"ok": True, "service": "spectrasense-backend", "version": "1.0.0"}


@router.post("/upload")
async def upload(file: UploadFile = File(...)):
    fname = _safe_name(file.filename or "signal.iq")
    ext = Path(fname).suffix.lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(400, f"Unsupported extension {ext!r}. Allowed: {sorted(ALLOWED_EXTS)}")
    dest = UPLOAD_DIR / fname
    # stream to disk with size cap
    max_bytes = MAX_UPLOAD_MB * 1024 * 1024
    size = 0
    with open(dest, "wb") as f:
        while True:
            chunk = await file.read(1 << 20)
            if not chunk:
                break
            size += len(chunk)
            if size > max_bytes:
                try:
                    f.close()
                    dest.unlink(missing_ok=True)
                except Exception:
                    pass
                raise HTTPException(413, f"File exceeds {MAX_UPLOAD_MB} MB limit")
            f.write(chunk)
    if size == 0:
        dest.unlink(missing_ok=True)
        raise HTTPException(400, "Empty file")
    jid = create_job(fname, str(dest))
    return {"job_id": jid, "filename": fname, "bytes": size}


def _run_bg(jid: str, overrides: dict):
    update_job(jid, status="running", progress=1, step="start")

    def prog(step: str, pct: int):
        update_job(jid, step=step, progress=int(pct))

    try:
        job = get_job(jid)
        if not job:
            return
        res = run_pipeline(job["path"], overrides=overrides, progress=prog)
        update_job(jid, status="done", progress=100, step="done", result=res)
    except Exception as e:  # never crash worker silently
        update_job(jid, status="error", error=f"{type(e).__name__}: {e}")


@router.post("/analyze/{job_id}")
def analyze(job_id: str, body: AnalyzeRequest | None = None):
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "job not found")
    ov = (body.model_dump(exclude_none=True) if body else {})
    # Remediation R1: raw .IQ/.bin is dimensionless — block the pipeline until
    # Fs is supplied. .wav keeps its RIFF-header rate.
    ext = Path(job.get("filename", "")).suffix.lower()
    fs = ov.get("sample_rate_hz") or ov.get("fs") or ov.get("sample_rate")
    if ext in (".iq", ".bin") and not fs:
        raise HTTPException(
            422, "Base Sampling Rate (sample_rate_hz) is REQUIRED for raw .IQ/.bin "
                 "files: they carry no header and Fs cannot be guessed blind. "
                 "Re-run with e.g. {\"sample_rate_hz\": 100000}.")
    # validate enums loosely
    if ov.get("modulation"):
        ov["modulation"] = str(ov["modulation"]).upper()
    t = threading.Thread(target=_run_bg, args=(job_id, ov), daemon=True)
    t.start()
    return {"job_id": job_id, "status": "running"}


@router.get("/results/{job_id}")
def results(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "job not found")
    return job


@router.get("/report/{job_id}")
def report(job_id: str):
    job = get_job(job_id)
    if not job or not job.get("result"):
        raise HTTPException(404, "result not ready")
    out = REPORT_DIR / f"{job_id}.pdf"
    if not out.exists():
        build_pdf(job["result"], job["filename"], out)
    return FileResponse(str(out), media_type="application/pdf", filename=f"spectrasense_{job_id}.pdf")


@router.get("/sample")
def sample_info():
    return {"message": "Upload a .IQ/.bin/.wav file via POST /api/upload, then POST /api/analyze/{job_id}"}
