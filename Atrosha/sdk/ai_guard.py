
import re
import time

class Guard:
    """
    AI Guard for intercepting and securing LLM interactions.
    Enforces PII redaction and Topic Banning.
    """
    def __init__(self, client=None, sensitive_topics=None):
        self.client = client
        self.sensitive_topics = sensitive_topics or ["competitor_x", "project_omega", "internal_repo"]
        
        # PII Regex Patterns
        self.pii_patterns = {
            "EMAIL": r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
            "PHONE": r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b",
            "SSN": r"\b\d{3}-\d{2}-\d{4}\b",
            "CREDIT_CARD": r"\b(?:\d{4}[-\s]?){3}\d{4}\b"
        }

    def scan_prompt(self, prompt: str) -> str:
        """
        Scans a prompt for sensitive information and policy violations.
        Returns the sanitized prompt (or raises a ValueError if blocked).
        """
        start_time = time.time()
        
        # 1. Topic Ban Check
        prompt_lower = prompt.lower()
        for topic in self.sensitive_topics:
            if topic in prompt_lower:
                self._log_event("BLOCKED", "Topic Ban", topic)
                raise ValueError(f"[Atrosha Guard] Blocked: Contains prohibited topic '{topic}'")

        # 2. PII Redaction
        sanitized_prompt = prompt
        redacted_count = 0
        
        for pii_type, pattern in self.pii_patterns.items():
            matches = re.findall(pattern, sanitized_prompt)
            if matches:
                redacted_count += len(matches)
                sanitized_prompt = re.sub(pattern, f"[{pii_type}_REDACTED]", sanitized_prompt)

        status = "MODIFIED" if redacted_count > 0 else "ALLOWED"
        self._log_event(status, "PII Scan", f"Redacted {redacted_count} items")
        
        return sanitized_prompt

    def scan_response(self, response: str) -> dict:
        """
        Scans the model response for leakage or harmful content.
        """
        # In a real implementation, this would check for secret leakage pattern matching
        return {"status": "allowed", "analysis": "clean"}

    def _log_event(self, status: str, check_type: str, details: str):
        """
        Internal logging. In production, this pushes to the Atrosha Observer.
        """
        print(f"[Atrosha Guard] {status} | {check_type}: {details}")
        # if self.client:
        #     self.client.log_transaction(...)
