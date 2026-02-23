import os
import sys
import json
import time
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from contextlib import asynccontextmanager

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import LABELS

# globals loaded at startup
_session = None
_tokenizer = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _session, _tokenizer
    import onnxruntime as ort
    from tokenizer.train_tokenizer import load_tokenizer

    model_path = os.environ.get(
        "ATROSHA_MODEL_PATH",
        os.path.join(os.path.dirname(__file__), "..", "export", "atrosha_engine.onnx"),
    )
    tok_path = os.environ.get(
        "ATROSHA_TOKENIZER_PATH",
        os.path.join(os.path.dirname(__file__), "..", "tokenizer", "tokenizer.json"),
    )

    print(f"[*] loading model: {model_path}")
    _session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])
    print(f"[*] loading tokenizer: {tok_path}")
    _tokenizer = load_tokenizer(tok_path)
    print("[+] semantic engine ready")

    yield

    _session = None
    _tokenizer = None


app = FastAPI(title="Atrosha Semantic Engine", lifespan=lifespan)


class PayloadRequest(BaseModel):
    method: str = "POST"
    target_url: str = ""
    headers: dict = {}
    body: dict = {}


class Verdict(BaseModel):
    verdict: str         # ALLOW, DENY, QUARANTINE
    confidence: float
    latency_ms: float


@app.post("/classify", response_model=Verdict)
async def classify(req: PayloadRequest):
    if _session is None or _tokenizer is None:
        raise HTTPException(503, "model not loaded")

    t0 = time.perf_counter()

    # serialize the payload the same way we did during training
    payload_text = json.dumps(req.model_dump(), separators=(",", ":"))
    encoded = _tokenizer.encode(payload_text)
    ids = encoded.ids[:512]

    pad_len = 512 - len(ids)
    input_ids = np.array([ids + [0] * pad_len], dtype=np.int64)
    attn_mask = np.array([[1] * len(ids) + [0] * pad_len], dtype=np.int64)

    logits = _session.run(None, {
        "input_ids": input_ids,
        "attention_mask": attn_mask,
    })[0]

    # softmax
    exp = np.exp(logits - np.max(logits))
    probs = exp / exp.sum(axis=-1, keepdims=True)

    pred_id = int(np.argmax(probs[0]))
    confidence = float(probs[0][pred_id])
    verdict = LABELS[pred_id]

    latency = (time.perf_counter() - t0) * 1000

    return Verdict(verdict=verdict, confidence=round(confidence, 4), latency_ms=round(latency, 2))


@app.get("/health")
def health():
    return {
        "status": "alive",
        "model_loaded": _session is not None,
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8002))
    uvicorn.run(app, host="0.0.0.0", port=port)
