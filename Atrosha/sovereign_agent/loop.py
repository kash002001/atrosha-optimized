import os
from ocr import extract_invoice_data
from brain import reason_about_invoice
from tools import execute_stripe_payment

def run_agent_loop(invoice_path: str, session_id: str):
    """
    The end-to-end execution loop for the Sovereign Financial Agent.
    """
    print(f"\n[1] Starting Zero-Knowledge Ingestion for: {invoice_path}")
    raw_text = extract_invoice_data(invoice_path)
    
    if not raw_text:
        print("Failed to read invoice.")
        return
        
    print("\n[2] Waking up Local Sovereign Brain (Ollama)...")
    extracted_data = reason_about_invoice(raw_text)
    
    vendor = extracted_data.get("vendor", "Unknown")
    amount = extracted_data.get("amount", 0.0)
    
    print(f"    --> Brain Extracted: Pay ${amount} to '{vendor}'")
    
    print("\n[3] Formulating Execution Intent...")
    print(f"    --> Passing Session ID: {session_id} to Atrosha Kernel")
    
    # Actually execute the tool via the Atrosha Bridge
    result = execute_stripe_payment(vendor, amount, session_id)
    
    print("\n[4] Execution Result from Atrosha Kernel:")
    print(f"    --> {result}")
    
if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Usage: python loop.py <invoice_pdf_path> <session_id>")
    else:
        run_agent_loop(sys.argv[1], sys.argv[2])
