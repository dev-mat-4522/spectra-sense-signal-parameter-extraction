"""Forensic PDF report (PRD §5.4)."""
from __future__ import annotations
import hashlib
from pathlib import Path
from datetime import datetime, timezone


def _sanitize(t: object) -> str:
    s = str(t)
    # core fonts are latin-1 only: replace common unicode with ASCII
    repl = {"—": "-", "–": "-", "·": "-", "“": '"', "”": '"', "‘": "'", "’": "'"}
    for k, v in repl.items():
        s = s.replace(k, v)
    return s.encode("latin-1", errors="replace").decode("latin-1")


def build_pdf(result: dict, filename: str, out_path: str | Path) -> Path:
    # Compute SHA256 of the original file if it exists
    file_hash = "Unknown"
    # Wait, the file path is not passed. I can just pass it or it's just 'filename'
    try:
        if Path(filename).exists():
            with open(filename, 'rb') as f_in:
                file_hash = hashlib.sha256(f_in.read()).hexdigest()
    except:
        pass
    from fpdf import FPDF
    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 18)
    pdf.cell(0, 12, _sanitize("SpectraSense - Forensic Signal Report"), new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 7, _sanitize(f"File: {filename}   |   {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}"), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    def section(title: str):
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 9, _sanitize(title), new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 10)

    def kv(k: str, v) -> None:
        txt = _sanitize(f"  {k}: {v}")
        # fpdf cell can't handle very long lines — use multi_cell for safety
        if len(txt) > 120:
            pdf.multi_cell(0, 6, txt)
        else:
            pdf.cell(0, 6, txt, new_x="LMARGIN", new_y="NEXT")

    section("1. File & Normalization")
    kv("SHA256", file_hash)
    for k, v in result.get("file", {}).items():
        kv(k, v)
    section("2. Blind Parameter Estimation")
    for k, v in result.get("params", {}).items():
        kv(k, v)
    section("3. AMC (Modulation Classification)")
    amc = result.get("amc", {})
    kv("modulation", amc.get("modulation"))
    kv("calibrated_confidence", amc.get("confidence"))
    kv("model_probability", amc.get("probs", {}).get(amc.get("modulation"), "N/A"))
    kv("engine", amc.get("engine"))
    kv("probs", amc.get("probs"))
    section("4. Demod / De-interleave / FEC")
    kv("demod", result.get("demod"))
    kv("deinterleaver", result.get("deinterleaver"))
    kv("fec", result.get("fec"))
    section("5. Bitstream Correlation")
    corr = result.get("correlation", {})
    kv("num_hits", corr.get("num_hits"))
    kv("framing", corr.get("framing"))
    kv("ambiguity_trial", corr.get("ambiguity_trial"))
    kv("payload_ascii", corr.get("payload_ascii"))
    kv("payload_len_bits", corr.get("payload_len_bits"))
    for h in (corr.get("hits") or [])[:15]:
        kv("hit", h)
    
    if corr.get("ax25"):
        section("AX.25 Dissection")
        for ax in corr.get("ax25", []):
            kv("Dest", ax.get("dest"))
            kv("Src", ax.get("src"))
            kv("Path", ax.get("path"))
            kv("Info (ASCII)", ax.get("info_ascii"))
            
    if corr.get("csp"):
        section("CSP Header")
        for csp in corr.get("csp", []):
            kv("Priority", csp.get("priority"))
            kv("Source", csp.get("source"))
            kv("Dest", csp.get("destination"))
            kv("DPort", csp.get("dest_port"))
            kv("SPort", csp.get("src_port"))

    section("6. Payload Hex (truncated 2048 chars)")
    pdf.set_font("Courier", "", 8)
    pdf.multi_cell(0, 4, (corr.get("payload_hex") or "(empty)")[:2048])
    pdf.output(str(out))
    return out
