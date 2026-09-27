from fastapi.testclient import TestClient
import numpy as np
from app.main import app

client = TestClient(app)


def test_health():
    assert client.get("/api/health").status_code == 200
    assert client.get("/healthz").json()["ok"] is True


def test_upload_analyze_flow(tmp_path):
    rng = np.random.default_rng(1)
    syms = np.exp(1j * (np.pi / 4 + rng.integers(0, 4, 200) * np.pi / 2))
    sig = np.repeat(syms, 4).astype(np.complex64)
    files = {"file": ("demo.iq", sig.tobytes(), "application/octet-stream")}
    r = client.post("/api/upload", files=files)
    assert r.status_code == 200, r.text
    jid = r.json()["job_id"]
    r2 = client.post(f"/api/analyze/{jid}", json={"sample_rate_hz": 100000})
    assert r2.status_code == 200
    import time
    for _ in range(60):
        j = client.get(f"/api/results/{jid}").json()
        if j["status"] in ("done", "error"):
            break
        time.sleep(0.3)
    assert j["status"] == "done", j.get("error")
    assert "amc" in j["result"]


def test_reject_bad_ext():
    r = client.post("/api/upload", files={"file": ("x.txt", b"hi", "text/plain")})
    assert r.status_code == 400
