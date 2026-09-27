import requests
import time
import sys
import json

API_URL = "http://127.0.0.1:8000/api"

print("Uploading ao73.wav...")
with open("data/samples/ao73.wav", "rb") as f:
    r = requests.post(f"{API_URL}/upload", files={"file": f})
    
if r.status_code != 200:
    print(f"Upload failed: {r.text}")
    sys.exit(1)
    
job_id = r.json()["job_id"]

print("Analyzing...")
# Do NOT override sample rate or modulation
r = requests.post(f"{API_URL}/analyze/{job_id}", json={})
if r.status_code != 200:
    print(f"Analyze failed: {r.text}")
    sys.exit(1)

print("Polling...")
while True:
    r = requests.get(f"{API_URL}/results/{job_id}")
    data = r.json()
    if data.get("status") in ("done", "error"):
        break
    time.sleep(1)
    
if data.get("status") == "done":
    res = data["result"]
    print("Verifying Regression Test Outputs...")
    
    # 1. WAV Header Validation
    assert res["file"]["format"] == "wav", "Format must be wav"
    assert res["file"]["fs_source"] == "wav_header", "fs_source must be wav_header, not user overridden"
    assert res["params"]["sampling_rate_hz"] == 48000, "Sample rate must be 48 kHz"
    print("[OK] WAV Header / 48kHz verified")
    
    # 2. BPSK & Baud
    assert res["amc"]["modulation"] == "BPSK", "Modulation must be recognized as BPSK"
    baud = res["params"]["symbol_rate_hz"]
    assert 1150 <= baud <= 1250, f"Symbol rate must be ~1200 baud, got {baud}"
    print(f"[OK] BPSK & {baud:.1f} baud verified")
    
    # 3. Protocol decoding
    assert "FUNcube" in res["fec"]["method"] or "AO-40" in res["fec"]["method"], "Must route to FUNcube/AO-40 deframing"
    assert res["correlation"]["payload_ascii"] == ["Signal detected, protocol decode not validated."], "Must fail gracefully on invalid/short frame"
    print("[OK] FUNcube/AO-40 protocol path verified")
    
    print("\n--- COMPLETE REGRESSION TEST PASSED ---")
else:
    print("FAILED:", data.get("error"))
    sys.exit(1)
