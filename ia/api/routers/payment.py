from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import requests
from config.settings import settings
from api.dependencies import get_current_user

router = APIRouter(prefix="/api/afrikpay", tags=["AfrikPay"], dependencies=[Depends(get_current_user)])

class AfrikPaySessionCreate(BaseModel):
    amount: int
    description: str
    activity_name: str

@router.post("/create-session")
def create_afrikpay_session(data: AfrikPaySessionCreate):
    api_key = settings.AFRIKPAY_TEST_KEY
    if not api_key:
        raise HTTPException(status_code=400, detail="La clé API AfrikPay n'est pas configurée dans ia/.env")
    
    hosts = ["https://developers.afrikpay.tech/api", "https://afikpay-developper.vercel.app/api"]
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "amount": data.amount,
        "currency": "XOF",
        "successUrl": "https://teranga-civil.sn/payment/success",
        "cancelUrl": "https://teranga-civil.sn/payment/cancel"
    }
    
    last_error = None
    for host in hosts:
        url = f"{host}/v1/checkout/sessions"
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            if response.status_code in (200, 201):
                res_data = response.json()
                session_id = res_data.get("sessionId")
                payment_url = res_data.get("url")
                if payment_url and "localhost" in payment_url:
                    parts = payment_url.split("/pay/")
                    if len(parts) == 2:
                        payment_url = f"https://developers.afrikpay.tech/pay/{parts[1]}"
                return {"status": "success", "sessionId": session_id, "url": payment_url}
            else:
                last_error = f"HTTP {response.status_code}: {response.text}"
        except Exception as e:
            last_error = str(e)
            
    raise HTTPException(status_code=500, detail=f"Erreur de connexion à AfrikPay. Dernier message: {last_error}")

@router.get("/confirm/{session_id}")
def confirm_afrikpay_payment(session_id: str):
    api_key = settings.AFRIKPAY_TEST_KEY
    if not api_key:
        raise HTTPException(status_code=400, detail="La clé API AfrikPay n'est pas configurée dans ia/.env")
        
    hosts = ["https://developers.afrikpay.tech/api", "https://afikpay-developper.vercel.app/api"]
    headers = {"Authorization": f"Bearer {api_key}"}
    
    last_error = None
    for host in hosts:
        url = f"{host}/v1/checkout/sessions/{session_id}"
        try:
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 200:
                res_data = response.json()
                status_val = res_data.get("status", "pending")
                return {"status": "success", "payment_status": status_val, "response_text": status_val}
            else:
                last_error = f"HTTP {response.status_code}: {response.text}"
        except Exception as e:
            last_error = str(e)
            
    raise HTTPException(status_code=500, detail=f"Erreur de connexion à AfrikPay pour confirmation: {last_error}")
