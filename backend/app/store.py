"""Thread-safe in-memory job store with TTL."""
from __future__ import annotations
import threading
import time
import uuid

_lock = threading.Lock()
_jobs: dict[str, dict] = {}
TTL = 3600


def create_job(filename: str, path: str) -> str:
    jid = uuid.uuid4().hex[:12]
    with _lock:
        _jobs[jid] = {"id": jid, "filename": filename, "path": path,
                      "status": "uploaded", "progress": 0, "step": "queued",
                      "result": None, "error": None, "ts": time.time()}
    return jid


def get_job(jid: str) -> dict | None:
    with _lock:
        j = _jobs.get(jid)
        if not j:
            return None
        if time.time() - j["ts"] > TTL:
            _jobs.pop(jid, None)
            return None
        return dict(j)


def update_job(jid: str, **kw):
    with _lock:
        if jid in _jobs:
            _jobs[jid].update(kw)
            _jobs[jid]["ts"] = time.time()


def list_jobs() -> list[dict]:
    with _lock:
        return [{"id": j["id"], "filename": j["filename"], "status": j["status"]} for j in _jobs.values()]
