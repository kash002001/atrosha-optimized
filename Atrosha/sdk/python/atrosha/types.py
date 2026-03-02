from dataclasses import dataclass
from typing import Optional


@dataclass
class ClassifyRequest:
    target_url: str
    payload: dict


@dataclass
class ClassifyResponse:
    verdict: str           # "ALLOW" | "DENY"
    confidence: float      # 0.0-1.0
    latency_ms: float
    source: str            # "heuristic" | "semantic_v3"
    reason: str


@dataclass
class HealthResponse:
    status: str
    model_loaded: bool
    audit_sink: bool
