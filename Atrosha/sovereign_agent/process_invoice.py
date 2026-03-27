import uuid
from loop import run_agent_loop

run_agent_loop("meridian_invoice.pdf", session_id=f"ml-session-{uuid.uuid4().hex[:8]}", auto_confirm=True)
