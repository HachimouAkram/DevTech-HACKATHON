import urllib.request
import json
import time

def verify_paytech_integration():
    base_url = "http://localhost:8000"
    
    # 1. Test Request Payment without auth (should check token requirement if any)
    # The endpoints have Depends(get_current_user), so let's generate a test JWT or call direct
    import jwt
    secret = "terangacivil2026_super_secret_jwt_key_123456"
    test_token = jwt.encode({"sub": "admin", "role": "ADMIN", "exp": time.time() + 3600}, secret, algorithm="HS256")
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {test_token}"
    }

    # Test Wave direct target
    payload_wave = {
        "amount": 500,
        "description": "Demande Extrait de Naissance - Test Wave",
        "activity_name": "Extrait de Naissance",
        "target_payment": "Wave",
        "phone": "+221771234567",
        "full_name": "Amadou Diallo"
    }

    print("1. Sending POST to /api/paytech/request-payment (target: Wave)...")
    req = urllib.request.Request(
        f"{base_url}/api/paytech/request-payment",
        data=json.dumps(payload_wave).encode(),
        headers=headers
    )
    
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            print("Response:", json.dumps(data, indent=2))
            assert data.get("status") == "success"
            token = data.get("token")
            redirect_url = data.get("redirect_url")
            print(f"Token: {token}")
            print(f"Redirect URL: {redirect_url}")
            
            # Check status
            print(f"\n2. Checking status of token {token} via /api/paytech/status/{token}...")
            status_req = urllib.request.Request(
                f"{base_url}/api/paytech/status/{token}",
                headers=headers
            )
            with urllib.request.urlopen(status_req) as s_resp:
                s_data = json.loads(s_resp.read().decode())
                print("Status Response:", json.dumps(s_data, indent=2))
                assert s_data.get("status") == "success"

        print("\n PayTech Integration Verified Successfully!")
    except Exception as e:
        print(f"Error testing PayTech: {e}")

if __name__ == "__main__":
    verify_paytech_integration()
