import fitz  # PyMuPDF
import re

def extract_invoice_data(pdf_path: str) -> str:
    """
    Extracts raw text from an invoice PDF.
    This acts as the 'Zero-Knowledge Eyes' of the Sovereign Agent.
    No data is sent to cloud OCR APIs.
    """
    text = ""
    try:
        doc = fitz.open(pdf_path)
        for page in doc:
            text += page.get_text("text") + "\n"
        return text.strip()
    except Exception as e:
        print(f"Failed to read PDF {pdf_path}: {e}")
        return ""

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        print(extract_invoice_data(sys.argv[1]))
    else:
        print("Usage: python ocr.py <path_to_invoice.pdf>")
