import requests
import json
import time

URL = "http://localhost:8003"

def main():
    time.sleep(2)
    import fitz
    
    def upload_invoice(amount, filename):
        doc = fitz.open()
        page = doc.new_page()
        page.insert_text((50, 50), f"Invoice from Cloudflare\nTotal due: ${amount:.2f}\nDate: 2026-03-01")
        pdf_bytes = doc.write()
        doc.close()
        files = [('files', (filename, pdf_bytes, 'application/pdf'))]
        return requests.post(f"{URL}/ingest/batch", files=files).json()

    print("--- 1. Set Cloudflare auto-approve threshold to 1000 ---")
    vendors = requests.get(f"{URL}/vendors").json()
    cf = next((v for v in vendors if v['name'] == 'Cloudflare Inc.'), None)
    if cf:
        requests.put(f"{URL}/vendors/{cf['id']}", json={"auto_approve_below": 1000.0})

    print("\n--- 2. Uploading 3 normal invoices ($500) to build history ---")
    for i in range(3):
        res = upload_invoice(500.0, f"cf_normal_{i}.pdf")
        print(f"Normal {i+1}: needs_review={res[0]['needs_review']}, auto={res[0]['auto_approved']}, msg={res[0]['message']}")

    print("\n--- 3. Uploading anomalous invoice ($900) ---")
    # $900 is > 1.5 * 500 = 750 (even though it's below the $1000 threshold!)
    res = upload_invoice(900.0, "cf_anomaly.pdf")
    print(f"Anomaly: needs_review={res[0]['needs_review']}, auto={res[0]['auto_approved']}, msg={res[0]['message']}")

if __name__ == "__main__":
    main()
