import os
import sys
import json
import time
import re
import numpy as np
import urllib.request
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from contextlib import asynccontextmanager

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import LABELS
from server.audit_sink import push_verdict

_session = None
_tokenizer = None
_st_model = None  # sentence-transformers for /verify

def download_if_missing(file_path: str, url: str):
    if not os.path.exists(file_path):
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        print(f"[*] Downloading {os.path.basename(file_path)} from {url}...")
        try:
            urllib.request.urlretrieve(url, file_path)
            print(f"[+] Download complete: {file_path}")
        except Exception as e:
            print(f"[!] Failed to download {file_path}: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _session, _tokenizer, _st_model
    import onnxruntime as ort
    from tokenizer.train_tokenizer import load_tokenizer
    from sentence_transformers import SentenceTransformer

    model_path = os.environ.get(
        "ATROSHA_MODEL_PATH",
        os.path.join(os.path.dirname(__file__), "..", "export", "atrosha_engine.onnx"),
    )
    tok_path = os.environ.get(
        "ATROSHA_TOKENIZER_PATH",
        os.path.join(os.path.dirname(__file__), "..", "tokenizer", "tokenizer.json"),
    )

    model_url = os.environ.get("ATROSHA_MODEL_URL", "https://huggingface.co/atrosha/engine/resolve/main/atrosha_engine.onnx")
    tok_url = os.environ.get("ATROSHA_TOKENIZER_URL", "https://huggingface.co/atrosha/engine/resolve/main/tokenizer.json")

    download_if_missing(model_path, model_url)
    download_if_missing(tok_path, tok_url)

    print(f"[*] loading model: {model_path}")
    if os.path.exists(model_path):
        _session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])
    else:
        print("[!] Warning: Model file not found. Engine will run in fail-open mode.")
        
    print(f"[*] loading tokenizer: {tok_path}")
    if os.path.exists(tok_path):
        _tokenizer = load_tokenizer(tok_path)
    else:
        print("[!] Warning: Tokenizer file not found.")

    # intent verification: load sentence-transformers for /verify
    st_name = os.environ.get("ATROSHA_ST_MODEL", "all-MiniLM-L6-v2")
    print(f"[*] loading sentence-transformer: {st_name}")
    try:
        _st_model = SentenceTransformer(st_name)
        print(f"[+] sentence-transformer loaded ({st_name})")
    except Exception as e:
        print(f"[!] failed to load sentence-transformer: {e}")
        _st_model = None

    print("[+] semantic engine ready")

    yield

    _session = None
    _tokenizer = None
    _st_model = None

app = FastAPI(title="Atrosha Semantic Engine", lifespan=lifespan)


class PayloadRequest(BaseModel):
    method: str = "POST"
    target_url: str = ""
    headers: dict = {}
    body: dict = {}


class VerifyRequest(BaseModel):
    intent: str          # user's original natural language prompt
    action: str          # description of agent's proposed transaction
    threshold: float = 0.70


class VerifyResult(BaseModel):
    verdict: str         # APPROVE or REJECT
    similarity: float
    threshold: float
    latency_ms: float


class Verdict(BaseModel):
    verdict: str         # ALLOW, DENY, QUARANTINE
    confidence: float
    latency_ms: float
    source: str = ""     # "heuristic" or "semantic_v3"
    reason: str = ""     # matched pattern or model label


# deterministic blocklist — checked before the transformer
_BAD_PATTERNS = [
    r"ignore all previous",
    r"system override",
    r"bypass.*policy",
    r"drop table",
    r"\/etc\/passwd",
    r"\/etc\/shadow",
    r"admin mode",
    r"disregard policy",
    r"revealf.*prompt",
    r"acting as.*terminal",
    r"instruction.*override",
    r"mostra il prompt",
    r"ignora tutte",
    r"dime cómo hackear",
    r"leetspeak",
    r"decipher",
    r"hex payload",
]


@app.post("/classify", response_model=Verdict)
async def classify(req: PayloadRequest, raw: Request):
    if _session is None or _tokenizer is None:
        raise HTTPException(503, "model not loaded")

    t0 = time.perf_counter()

    # pull agent / org context from upstream proxy headers
    agent_id = raw.headers.get("x-atrosha-agent-id", req.headers.get("x-atrosha-agent-id", ""))
    org_id = raw.headers.get("x-atrosha-org-id", req.headers.get("x-atrosha-org-id", ""))

    # only keep headers the model was trained on
    _keep = {"authorization", "content-type", "x-atrosha-agent-id", "x-atrosha-signature"}
    clean_headers = {k: v for k, v in (req.headers or {}).items() if k.lower() in _keep}

    clean_payload = {
        "method": req.method,
        "target_url": req.target_url,
        "headers": clean_headers,
        "body": req.body,
    }
    payload_text = json.dumps(clean_payload, separators=(",", ":"))
    
    # --- Layer 1: Deterministic Heuristic Pre-filter ---
    raw_body_str = json.dumps(req.body).lower()
    for pat in _BAD_PATTERNS:
        if re.search(pat, raw_body_str):
            latency = (time.perf_counter() - t0) * 1000
            print(f"[HEURISTIC BLOCK] matched pattern: {pat}")

            push_verdict(
                agent_id=agent_id,
                target_url=req.target_url,
                verdict="DENY",
                confidence=1.0,
                latency_ms=latency,
                source="heuristic",
                matched_pattern=pat,
                payload_preview=raw_body_str[:500],
                organization_id=org_id or None,
            )

            return Verdict(
                verdict="DENY", confidence=1.0,
                latency_ms=round(latency, 2),
                source="heuristic", reason=pat,
            )

    # --- Layer 2: ONNX Semantic Deep Inspection ---
    encoded = _tokenizer.encode(payload_text)
    ids = encoded.ids[:512]

    pad_len = 512 - len(ids)
    input_ids = np.array([ids + [0] * pad_len], dtype=np.int64)
    attn_mask = np.array([[1] * len(ids) + [0] * pad_len], dtype=np.int64)

    logits = _session.run(None, {
        "input_ids": input_ids,
        "attention_mask": attn_mask,
    })[0]

    exp = np.exp(logits - np.max(logits))
    probs = exp / exp.sum(axis=-1, keepdims=True)

    pred_id = int(np.argmax(probs[0]))
    confidence = float(probs[0][pred_id])
    verdict = LABELS[pred_id]

    latency = (time.perf_counter() - t0) * 1000

    push_verdict(
        agent_id=agent_id,
        target_url=req.target_url,
        verdict=verdict,
        confidence=confidence,
        latency_ms=latency,
        source="semantic_v3",
        payload_preview=raw_body_str[:500],
        organization_id=org_id or None,
    )

    return Verdict(
        verdict=verdict,
        confidence=round(confidence, 4),
        latency_ms=round(latency, 2),
        source="semantic_v3",
        reason=verdict.lower(),
    )


@app.post("/verify", response_model=VerifyResult)
async def verify_intent(req: VerifyRequest):
    """Compare user's original intent against agent's proposed action via cosine similarity."""
    if _st_model is None:
        raise HTTPException(503, "sentence-transformer not loaded")

    t0 = time.perf_counter()

    # encode both into normalized vectors — dot product = cosine sim
    vec_a = _st_model.encode(req.intent, normalize_embeddings=True)
    vec_b = _st_model.encode(req.action, normalize_embeddings=True)
    sim = float(np.dot(vec_a, vec_b))

    verdict = "APPROVE" if sim >= req.threshold else "REJECT"
    latency = (time.perf_counter() - t0) * 1000

    print(f"[VERIFY] {verdict} | sim={sim:.4f} thr={req.threshold} | {latency:.1f}ms")
    print(f"  intent: {req.intent[:80]}")
    print(f"  action: {req.action[:80]}")

    return VerifyResult(
        verdict=verdict,
        similarity=round(sim, 4),
        threshold=req.threshold,
        latency_ms=round(latency, 2),
    )


@app.get("/health")
def health():
    return {
        "status": "alive",
        "model_loaded": _session is not None,
        "st_model_loaded": _st_model is not None,
        "audit_sink": os.environ.get("SUPABASE_URL") is not None,
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8002))
    uvicorn.run(app, host="0.0.0.0", port=port)
