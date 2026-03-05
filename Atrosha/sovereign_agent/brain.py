import ollama
import json

def reason_about_invoice(invoice_text: str) -> dict:
    """
    Uses local SLM (e.g., Mistral or Llama3) to extract structured
    vendor and amount data from the raw OCR text.
    """
    prompt = f"""
    You are an expert Accounts Payable agent. Extract the Vendor Name and Total Amount Due from the following invoice text.
    Return ONLY a valid JSON object with keys "vendor" and "amount". The amount should be a number.

    INVOICE TEXT:
    {invoice_text}
    """
    
    try:
        response = ollama.chat(
            model='llama3.2', # or mistral
            messages=[{'role': 'user', 'content': prompt}],
            options={"temperature": 0.0}
        )
        content = response['message']['content']
        # Extract JSON from potential markdown codeblocks
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
            
        return json.loads(content)
    except Exception as e:
        print(f"Failed to reason about invoice: {e}")
        return {"vendor": "Unknown", "amount": 0.0}

if __name__ == "__main__":
    sample = "Invoice from Cloudflare Inc.\nTotal due: $500.00\nDate: 2026-03-05"
    print(reason_about_invoice(sample))
