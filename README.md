# SpectraSense

An automated RF intelligence and DSP pipeline designed for autonomous spectrum surveillance. It analyzes `.IQ` and `.wav` signal captures, performs Automatic Modulation Classification (AMC), parameter estimation, blind FEC detection, de-interleaving, demodulation, and bitstream frame correlation. 

Built for the NTRO SIH problem statement, SpectraSense is a rigorous, mathematically-honest tactical RF DSP tool.

## Core Features

- **Ingestion**: Supports generic baseband `.IQ` (float32 interleaved) and `.wav` audio captures.
- **Burst Extraction**: Automatically isolates the active transmission burst from leading/trailing silence using a sliding-window energy threshold, preventing silence from poisoning the demodulation loops.
- **Cyclostationary Parameter Estimation**: Estimates Baud Rate and Samples-Per-Symbol (SPS) via multi-voter strategies (delay-multiply envelope autocorrelation, squaring loops, and 4th-power loops).
- **AMC (Automatic Modulation Classification)**: Leverages a lightweight CNN-based heuristic engine to classify the modulation scheme (BPSK, QPSK, 8PSK, 16-QAM, 64-QAM, FSK, AFSK) before hitting the demodulator.
- **Demodulation & Ambiguity Resolution**: Demodulates the waveform using hard-decision min-distance demapping or FM discrimination. Explores all 4 carrier phase rotations automatically, allowing the correlator to score and resolve phase ambiguities.
- **De-Interleaving**: Automatically tests Block, Diagonal, and Convolutional de-interleavers to unscramble matrix-interleaved bitstreams.
- **FEC Detection (Blind)**: Probes the bitstream through Viterbi and Reed-Solomon decoders, validating code-closures to protect against noise poisoning.
- **Frame Correlation**: Scans the payload for known synchronization words (e.g., HDLC 0x7E, Barker sequences) and extracts the raw hexadecimal and ASCII payloads.
- **Frontend Intelligence Dashboard**: Real-time rendering of Waterfall FFTs, Power Spectral Density (PSD), Constellation (I/Q scatter) diagrams, and Executive Intelligence Reports.

## Setup & Execution

### Backend (FastAPI + Python DSP Engine)

Requires Python 3.10+

```bash
cd backend
python -m venv venv

# On Linux/macOS
source venv/bin/activate
# On Windows
venv\Scripts\activate

pip install -r requirements.txt
uvicorn app.main:app --reload
```
The backend API will run on `http://127.0.0.1:8000`.

### Frontend (React + Vite + TailwindCSS)

Requires Node.js 18+

```bash
cd frontend
npm install
npm run dev
```
The frontend UI will run on `http://localhost:3000`. 

## Project Structure

- `backend/app/dsp/` - The core signal processing logic (burst, cyclo, demod, interleave, fec, correlator).
- `backend/app/ml/` - The Automatic Modulation Classification (AMC) model inference scripts.
- `backend/app/api/` - The FastAPI endpoints (`routes.py` handling file uploads and async processing polling).
- `frontend/src/` - React application source code.
- `frontend/src/components/` - Tactical UI components, including canvas-based renderers for waterfalls and constellations.
- `data/samples/` - Included synthetic and real ground-truth golden vectors (e.g. `golden_qam16.iq`, `golden_bpsk.iq`, `innosat_2.wav`) for regression testing.

## Running Tests

SpectraSense enforces rigorous testing across its DSP stack. Run the automated tests from the `backend/` directory:

```bash
cd backend
pytest tests/
```

The test suite validates input parsing, FEC array closures, 4-way de-interleaver integrity, and full-pipeline ground-truth comparisons.

## Disclaimer on Synthetic UI Data

The `frontend/src/data/mockSignals.ts` file contains preset UI arrays labeled `[SYNTHETIC DEMO]`. These are strictly for UI templating/design-system showcases and are **never** invoked during a live file analysis. All real uploaded signals render mathematically authentic data exclusively derived from the Python DSP pipeline.
