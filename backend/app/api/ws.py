"""WebSocket live stream: client sends job_id, server pushes progress + FFT frames."""
from __future__ import annotations
import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..store import get_job

router = APIRouter()


@router.websocket("/ws/live")
async def live(ws: WebSocket):
    await ws.accept()
    try:
        # expect {"job_id": "..."} or raw job id string
        raw = await ws.receive_text()
        try:
            job_id = (json.loads(raw) or {}).get("job_id", raw)
        except Exception:
            job_id = raw.strip().strip('"')
        for _ in range(600):  # up to ~10 min
            job = get_job(str(job_id))
            if not job:
                await ws.send_json({"error": "job not found"})
                break
            payload = {"job_id": job["id"], "status": job["status"],
                       "progress": job.get("progress", 0), "step": job.get("step", "")}
            if job.get("status") == "done" and job.get("result"):
                r = job["result"]
                payload["amc"] = r.get("amc")
                payload["params"] = r.get("params")
                payload["waterfall_tail"] = (r.get("visual", {}).get("waterfall") or [])[-8:]
                await ws.send_json(payload)
                break
            if job.get("status") == "error":
                payload["error"] = job.get("error")
                await ws.send_json(payload)
                break
            await ws.send_json(payload)
            await asyncio.sleep(0.5)
    except WebSocketDisconnect:
        return
    except Exception as e:
        try:
            await ws.send_json({"error": f"{type(e).__name__}: {e}"})
        except Exception:
            pass
    finally:
        try:
            await ws.close()
        except Exception:
            pass
