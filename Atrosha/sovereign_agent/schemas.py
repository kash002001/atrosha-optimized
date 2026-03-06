from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime
from typing import Optional, List



class Confidence(str, Enum):
    HIGH = "high"       # regex matched cleanly
    MEDIUM = "medium"   # partial match, some guessing
    LOW = "low"         # llm fallback or couldn't parse


class PaymentStatus(str, Enum):
    PENDING = "pending"
    AUTHORIZED = "authorized"
    SUBMITTED = "submitted"
    CONFIRMED = "confirmed"
    FAILED = "failed"
    BLOCKED = "blocked"  # drift detected


class InvoiceData(BaseModel):
    vendor: str = "Unknown"
    amount: float = 0.0
    currency: str = "USD"
    due_date: Optional[str] = None
    invoice_number: Optional[str] = None
    confidence: Confidence = Confidence.LOW
    raw_text: str = ""
    source: str = "regex"  # "regex" or "llm"


class PaymentIntent(BaseModel):
    session_id: str
    vendor: str
    amount: float
    currency: str = "USD"
    idempotency_key: str
    status: PaymentStatus = PaymentStatus.PENDING
    signed_at: Optional[datetime] = None
    signature: Optional[str] = None


class VendorUpdateRequest(BaseModel):
    auto_approve_below: float


class ExecutionResult(BaseModel):
    session_id: str
    idempotency_key: str
    status: PaymentStatus
    tx_ref: Optional[str] = None
    reason: Optional[str] = None
    executed_at: datetime = Field(default_factory=datetime.utcnow)


class IngestResponse(BaseModel):
    invoice: InvoiceData
    needs_review: bool = True  # always true until confidence is HIGH
    auto_approved: bool = False
    session_id: str = ""
    message: str = ""

