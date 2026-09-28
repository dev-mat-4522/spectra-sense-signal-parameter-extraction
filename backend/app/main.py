"""FastAPI entrypoint — CORS, static frontend serving, health."""
from __future__ import annotations
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import mimetypes

mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("image/svg+xml", ".svg")

from .config import CORS_ORIGINS
from .api.routes import router as rest_router
from .api.ws import router as ws_router

app = FastAPI(title="SpectraSense API", version="1.0.0",
              description="Automated RF (.IQ/.wav) analysis: AMC + DSP + FEC + forensic reports.")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rest_router)
app.include_router(ws_router)


@app.get("/healthz")
def healthz():
    return {"ok": True}


# Serve built Vite static export if present
FRONT_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if FRONT_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONT_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def catch_all(full_path: str):
        if full_path.startswith("api/") or full_path in ("docs", "openapi.json"):
            raise HTTPException(404)
        idx = FRONT_DIST / "index.html"
        if idx.exists():
            return FileResponse(str(idx), media_type="text/html")
        return {"service": "spectrasense", "docs": "/docs"}
