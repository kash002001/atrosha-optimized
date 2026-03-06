import requests
import json
import time

URL = "http://localhost:8003"

def main():
    # 1. Wait for server
    time.sleep(2)

    # 2. Check if server up
    print("Health check:", requests.get(f"{URL}/health").json())

    # 3. Create a fake invoice PDF
    import fitz
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), "Invoice from AWS\nTotal due: $120.00\nDate: 2026-03-01")
    fake_invoice = doc.write()
    doc.close()
    
    # 4. Upload fake invoice
    print("\n--- Uploading Invoice ---")
    files = [
        ('files', ('test_aws.pdf', fake_invoice, 'application/pdf'))
    ]
    res = requests.post(f"{URL}/ingest/batch", files=files)
    try:
        print("Batch Response:", json.dumps(res.json(), indent=2))
    except json.JSONDecodeError:
        print("Error, non-JSON response:", res.status_code, res.text)
    
    # 5. Get AWS Vendor ID
    print("\n--- Getting Vendors ---")
    vendors = requests.get(f"{URL}/vendors").json()
    aws_vendor = next((v for v in vendors if v['name'] == 'AWS'), None)
    
    if not aws_vendor:
        print("AWS vendor not found!")
        return
        
    print("AWS Vendor:", aws_vendor)
    
    # 6. Update AWS threshold to $500
    print("\n--- Setting AWS Threshold to $500 ---")
    requests.put(f"{URL}/vendors/{aws_vendor['id']}", json={"auto_approve_below": 500.0})
    
    # 7. Upload fake invoice again to trigger auto-approve
    print("\n--- Uploading Invoice Again (Should Auto-Approve) ---")
    files = [
        ('files', ('test_aws2.pdf', fake_invoice, 'application/pdf'))
    ]
    res = requests.post(f"{URL}/ingest/batch", files=files)
    try:
        print("Batch Response 2:", json.dumps(res.json(), indent=2))
    except json.JSONDecodeError:
        print("Error, non-JSON response:", res.status_code, res.text)
    
if __name__ == "__main__":
    main()
