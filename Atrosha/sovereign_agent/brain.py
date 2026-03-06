import re
import os
import json
from schemas import InvoiceData, Confidence

# regex patterns for common invoice fields
_AMOUNT_PATTERNS = [
    r'(?:total\s*(?:due|amount|balance)?|amount\s*due|balance\s*due|grand\s*total|net\s*amount)\s*[:\s]*\$?\s*([\d,]+\.?\d*)',
    r'\$\s*([\d,]+\.\d{2})',  # standalone dollar amounts
    r'(?:USD|usd)\s*([\d,]+\.?\d*)',
]

_VENDOR_PATTERNS = [
    r'(?:invoice\s+from|bill\s+from|from)\s*[:\s]*(.+?)(?:\n|$)',
    r'(?:vendor|supplier|company|billed?\s+by|payable\s+to|pay\s+to)\s*[:\s]*(.+?)(?:\n|$)',
    r'^([A-Z][A-Za-z\s&.,]+(?:Inc|LLC|Ltd|Corp|Co|GmbH|SA|PLC)[.]?)',  # company name with suffix
]

_DATE_PATTERNS = [
    r'(?:due\s*date|payment\s*due|pay\s*by|due)\s*[:\s]*([\d]{1,2}[/-][\d]{1,2}[/-][\d]{2,4})',
    r'(?:due\s*date|payment\s*due|pay\s*by|due)\s*[:\s]*(\w+\s+\d{1,2},?\s+\d{4})',
    r'(\d{4}-\d{2}-\d{2})',  # ISO dates
]

_INVOICE_NUM_PATTERNS = [
    r'(?:invoice\s*(?:#|no|num|number)?|inv)\s*[:\s#]*([A-Za-z0-9-]+)',
]


def _find_first(text: str, patterns: list[str], flags=re.IGNORECASE | re.MULTILINE) -> str | None:
    for pat in patterns:
        m = re.search(pat, text, flags)
        if m:
            return m.group(1).strip()
    return None


def _parse_amount(raw: str) -> float:
    cleaned = raw.replace(",", "").strip()
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def _extract_all_amounts(text: str) -> list[float]:
    amounts = []
    for pat in _AMOUNT_PATTERNS:
        for m in re.finditer(pat, text, re.IGNORECASE | re.MULTILINE):
            val = _parse_amount(m.group(1))
            if val > 0:
                amounts.append(val)
    return sorted(set(amounts), reverse=True)


def parse_invoice(text: str) -> InvoiceData:
    if not text or not text.strip():
        return InvoiceData(raw_text=text, confidence=Confidence.LOW, source="regex")

    vendor_raw = _find_first(text, _VENDOR_PATTERNS)
    amounts = _extract_all_amounts(text)
    due_date = _find_first(text, _DATE_PATTERNS)
    inv_num = _find_first(text, _INVOICE_NUM_PATTERNS)

    # pick the largest amount as the total (heuristic — most invoices list line items then total)
    amount = amounts[0] if amounts else 0.0

    # clean vendor name
    vendor = "Unknown"
    if vendor_raw:
        vendor = re.sub(r'\s+', ' ', vendor_raw).strip().rstrip('.')
        # chop trailing noise
        vendor = vendor.split('\n')[0].strip()

    # confidence scoring
    has_vendor = vendor != "Unknown"
    has_amount = amount > 0
    if has_vendor and has_amount:
        conf = Confidence.HIGH
    elif has_vendor or has_amount:
        conf = Confidence.MEDIUM
    else:
        conf = Confidence.LOW

    return InvoiceData(
        vendor=vendor,
        amount=amount,
        due_date=due_date,
        invoice_number=inv_num,
        confidence=conf,
        raw_text=text,
        source="regex",
    )


def parse_invoice_with_fallback(text: str) -> InvoiceData:
    result = parse_invoice(text)

    # only attempt LLM if regex couldn't get both vendor + amount
    if result.confidence == Confidence.LOW and os.getenv("USE_LLM_FALLBACK", "").lower() == "true":
        try:
            import ollama
            prompt = f"""Extract the Vendor Name and Total Amount Due from this invoice text.
Return ONLY valid JSON: {{"vendor": "...", "amount": 123.45}}

INVOICE TEXT:
{text}"""
            resp = ollama.chat(
                model=os.getenv("OLLAMA_MODEL", "llama3.2"),
                messages=[{"role": "user", "content": prompt}],
                options={"temperature": 0.0},
            )
            content = resp["message"]["content"]
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()

            data = json.loads(content)
            result.vendor = data.get("vendor", result.vendor)
            result.amount = float(data.get("amount", result.amount))
            result.source = "llm"
            result.confidence = Confidence.MEDIUM  # never HIGH for LLM
        except Exception as e:
            print(f"[brain] llm fallback failed: {e}")

    return result


if __name__ == "__main__":
    samples = [
        "Invoice from Cloudflare Inc.\nTotal due: $500.00\nDate: 2026-03-05",
        "VENDOR: AWS\nInvoice #INV-2026-0042\nAmount Due: $12,345.67\nDue Date: 03/15/2026",
        "Bill from OpenAI\nUsage charges: $25,000.00\nBalance Due: $25,000.00\nPay by: March 10, 2026",
        "Random text with no invoice data whatsoever",
    ]
    for s in samples:
        r = parse_invoice_with_fallback(s)
        print(f"vendor={r.vendor} amount={r.amount} conf={r.confidence} src={r.source}")
        print()
