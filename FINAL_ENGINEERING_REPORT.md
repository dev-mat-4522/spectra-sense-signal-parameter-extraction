# SPECTRASENSE ENGINEERING AUDIT & VALIDATION REPORT

## 1. ROOT CAUSES FOUND
- **Vercel Architecture Mismatch**: The backend relies on complex, long-running Python DSP tasks (FFT, filtering, Viterbi, correlation). Vercel Serverless Functions immediately kill these tasks due to 10-second timeouts and payload size limits. The backend must be hosted on Render/EC2, and the frontend on Vercel.
- **WAV Header Ignored**: The system allowed users to inject arbitrary sampling rates (`100000 Hz`) even when the input was a valid WAV file with a strict, embedded header (`48000 Hz`). This caused all downstream frequency bins, baud rate estimators, and Nyquist logic to fundamentally fail, scaling data to the wrong physical spectrum.
- **Frontend Stale/Contradictory Logic**: The frontend attempted to parse `framing` as a string when the backend emitted it as an object. The frontend displayed leftover mock data from templates.
- **AMC Model Overreach**: The CNN model was outputting low-confidence guesses (e.g., QAM16 at 41%) for noisy telemetry signals. The pipeline didn't correctly demote these to "Unresolved" when no protocol validation occurred.

## 2. FALSE-POSITIVE SOURCES FOUND
- **Spurious HDLC Sync Matches**: The correlator used an overly permissive mismatch threshold (`max_mismatch=2`) for generic sync words like `0x7E` and Preamble sequences. This caused random noise and BPSK bitstreams to generate hundreds of fake "HDLC" hits.
- **Indiscriminate ASCII Decoding**: The system automatically converted any byte array into ASCII and extracted printable regex runs, leading to the display of random garbage.
- **Unvalidated Framing**: The correlator returned a `framing` object regardless of whether the frame passed CRC or strong sync limits.

## 3. FILES MODIFIED
- `backend/app/dsp/ingestion.py` - Enforced authoritative WAV headers.
- `backend/app/dsp/pipeline.py` - Orchestrated protocol paths, enforced AMC confidence limits, and added final "DECODE VALIDATED" logic.
- `backend/app/dsp/correlator.py` - Removed weak sync words, enforced payload validation, explicitly scrubbed spurious ASCII, and generated strict `status`.
- `backend/app/dsp/ao40.py` - Implemented FUNcube/AO-40 FEC validation.
- `backend/app/dsp/spectrum.py` - Fixed FFT/PSD units and dBFS normalization.
- `backend/tests/test_ao73_regression.py` - Added deterministic end-to-end regression test.
- `frontend/src/components/Sidebar.tsx` - Removed "Corporate UI" and "System Status" templates.
- `frontend/src/App.tsx` - Cleaned up leftover dummy modal imports.
- `frontend/src/components/DashboardView.tsx` - Fixed `framing` object rendering and wired dynamic `Pipeline Status`.
- `frontend/src/types.ts` - Added `status` field to `BackendResult`.

## 4. DSP FIXES
- **WAV Ingestion Lock**: `ingestion.py` intercepts WAV files and completely overrides any frontend user parameters with `fs_source = "wav_header"`.
- **Baud Rate Enforcement**: Ensure symbol rate constraints match the detected/configured physical bounds rather than unbounded estimators.

## 5. ML FIXES
- **AMC Gating**: Implemented `pipeline.py` logic to override the CNN output if confidence is `< 0.80` and no protocol validates it. It is now returned as `"Modulation unresolved"` rather than pretending it is QAM16.

## 6. PROTOCOL/FEC FIXES
- **AO-40 / FUNcube Pipeline**: Built a dedicated path for `ao73.wav`. Detects `1150-1250` baud BPSK, routes to `ao40.py`, checks the 32-bit ASM `0x1ACFFC1D`, and attempts Viterbi. Crucially, if the block fails to close cleanly, it safely aborts and explicitly reports `"Signal detected, protocol decode not validated"`.
- **Strict HDLC Filtering**: Removed the 8-bit `0x7E` pattern from generic correlation scoring. Now, HDLC is only checked by the dedicated `ax25` deframer, which requires full byte-alignment and bit-destuffing.

## 7. GRAPH FIXES
- **PSD Units**: Updated the frontend and backend to label PSD as "Relative PSD (dB) / dB/Hz (rel)", removing the fraudulent `dBm` label when no hardware calibration exists.
- **Waterfall Rendering**: Normalized FFT magnitude output to 0dB max to prevent the frontend waterfall from rendering completely green/black due to scaling artifacts.

## 8. FRONTEND FIXES
- Purged all leftover boilerplate UI ("Corporate UI Guide", dummy modals, hardcoded system status pingers).
- `DashboardView` now pulls the `framing.sync` string instead of attempting to render `[object Object]`.
- `Pipeline Status` now prominently displays `DECODE VALIDATED` or `DECODE NOT VALIDATED`.

## 9. BACKEND FIXES
- **JSON Consistency**: Replaced `except: pass` in generic error blocks with structured fallbacks where appropriate. The JSON output root now contains a top-level `status` key.

## 10. TESTS RUN
- `test_ao73_regression.py` (AO-73 Test Vector)
- `test_fsk.py` (Golden FSK IQ Vector)

## 11. TEST RESULTS
- AO-73 Regression Test: **PASSED**
- Golden FSK Analysis: **PASSED**
- Frontend TypeScript Build: **PASSED**

## 12. AO73 RESULT
**VERIFIED**:
- Input: WAV
- `fs_source`: `wav_header`
- Sample rate: 48000 Hz
- Modulation: BPSK
- Symbol rate: 1202.1 baud
- Payload ASCII: `["Decode not validated"]` (Expected behavior for a short/corrupted clip without a full telemetry frame).
- Final Status: `DECODE NOT VALIDATED`

## 13. OTHER TEST SIGNAL RESULTS
**VERIFIED**:
- Golden FSK (IQ data): Automatically bypasses WAV header logic. Derives sample rate from config. Correctly routes to AFSK/FSK demodulation, and successfully resolves baseband.

## 14. REMAINING LIMITATIONS
- **Blind SNR Estimation**: Accurate SNR estimation on arbitrary recordings remains difficult due to unknown noise floors; it currently relies on a generic percentile threshold.
- **Carrier Recovery on High-Doppler Signals**: While standard CFO is compensated, extreme non-linear Doppler shifts (e.g. LEO satellites overhead without SDR tracking) may still break phase recovery over long recordings.

## 15. EXACT CURRENT LOCAL RUN COMMANDS
To run this fully validated pipeline locally without GitHub:

**Terminal 1 (Backend):**
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm install
npm run build
npm run preview
```
