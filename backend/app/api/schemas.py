"""Pydantic schemas."""
from __future__ import annotations
from typing import Any, Optional
from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    modulation: Optional[str] = Field(default=None, description="Override e.g. QAM-16, QPSK, FSK-2")
    sps: Optional[int] = Field(default=None, ge=1, le=4096)
    sample_rate_hz: Optional[float] = Field(default=None, gt=0, description="Base sampling rate Fs in Hz (REQUIRED for raw .IQ — cannot be guessed blind)")
    deinterleaver: Optional[str] = Field(default="none")
    fec: Optional[str] = Field(default="auto", description="auto = blind-detect then decode-or-bypass; none = force bypass")


class JobOut(BaseModel):
    id: str
    filename: str
    status: str
    progress: int = 0
    step: str = ""
    result: Any | None = None
    error: str | None = None
