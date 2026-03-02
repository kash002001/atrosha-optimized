import os
import asyncio
import logging
from datetime import datetime, timezone

log = logging.getLogger("atrosha.audit")

# non-blocking supabase audit sink
# fires verdicts into the dashboard's `transactions` table so owners
# can see blocks in real-time without touching the rust proxy flow

_supa = None

def _get_client():
    global _supa
    if _supa is not None:
        return _supa

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")

    if not url or not key:
        log.warning("SUPABASE_URL / SUPABASE_SERVICE_KEY not set — audit sink disabled")
        return None

    try:
        from supabase import create_client
        _supa = create_client(url, key)
        log.info("[+] audit sink connected to supabase")
        return _supa
    except Exception as e:
        log.error(f"[!] failed to init supabase client: {e}")
        return None


def push_verdict(
    agent_id: str,
    target_url: str,
    verdict: str,
    confidence: float,
    latency_ms: float,
    source: str,        # "heuristic" or "semantic_v3"
    matched_pattern: str | None = None,
    payload_preview: str = "",
    organization_id: str | None = None,
):
    """fire-and-forget insert into supabase. runs in a background thread
    so it never blocks the /classify hot path."""

    client = _get_client()
    if client is None:
        return

    # map engine verdict -> dashboard status column
    status = "approved" if verdict == "ALLOW" else "denied"

    reason = source
    if matched_pattern:
        reason = f"{source}:{matched_pattern}"

    row = {
        "agent_id": agent_id or "unknown",
        "destination": target_url or "",
        "status": status,
        "amount": 0,
        "currency": "USD",
        "verdict_confidence": round(confidence, 4),
        "verdict_latency_ms": round(latency_ms, 2),
        "verdict_source": source,
        "verdict_reason": reason,
        "payload_preview": payload_preview[:500],  # cap at 500 chars
    }

    if organization_id:
        row["organization_id"] = organization_id

    # async fire-and-forget — don't crash if supabase is down
    async def _insert():
        try:
            client.table("transactions").insert(row).execute()
        except Exception as e:
            log.warning(f"audit sink write failed (non-fatal): {e}")

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(_insert())
    except RuntimeError:
        # no event loop running, skip
        pass
