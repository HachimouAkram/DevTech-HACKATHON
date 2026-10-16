import requests
import sys

def verify_afrikpay_proxy():
    base_url = "http://localhost:8000"
    
    # 1. Create a payment session
    create_url = f"{base_url}/api/afrikpay/create-session"
    payload = {
        "amount": 1000,
        "description": "Verification test of AfrikPay integration proxy",
        "activity_name": "Copie d'acte de naissance"
    }
    
    print("Sending POST to /api/afrikpay/create-session...")
    try:
        r = requests.post(create_url, json=payload, timeout=10)
        print("Status code:", r.status_code)
        if r.status_code != 200:
            print("Error details:", r.text)
            sys.exit(1)
            
        res = r.json()
        print("Response JSON:")
        print(res)
        
        session_id = res.get("sessionId")
        payment_url = res.get("url")
        
        if not session_id or not payment_url:
            print("Error: Missing sessionId or url in response.")
            sys.exit(1)
            
        print("✓ Session created successfully!")
        print(f"  Session ID: {session_id}")
        print(f"  Payment URL: {payment_url}")
        
        # 2. Confirm the session
        confirm_url = f"{base_url}/api/afrikpay/confirm/{session_id}"
        print(f"Sending GET to {confirm_url}...")
        r_conf = requests.get(confirm_url, timeout=10)
        print("Status code:", r_conf.status_code)
        if r_conf.status_code != 200:
            print("Error details:", r_conf.text)
            sys.exit(1)
            
        res_conf = r_conf.json()
        print("Response JSON:")
        print(res_conf)
        
        if res_conf.get("status") == "success":
            print(f"✓ Payment confirmation endpoint works! Status: {res_conf.get('payment_status')}")
        else:
            print("Error: Confirmation response indicates failure.")
            sys.exit(1)
            
    except Exception as e:
        print("Exception occurred:", e)
        sys.exit(1)

if __name__ == "__main__":
    verify_afrikpay_proxy()
