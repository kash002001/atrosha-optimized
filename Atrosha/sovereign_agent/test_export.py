import requests

URL = "http://localhost:8003"

def main():
    print("--- Fetching Xero CSV ---")
    res_xero = requests.get(f"{URL}/export/csv/xero")
    print(res_xero.text)

    print("\n--- Fetching QuickBooks CSV ---")
    res_qb = requests.get(f"{URL}/export/csv/quickbooks")
    print(res_qb.text)

if __name__ == "__main__":
    main()
