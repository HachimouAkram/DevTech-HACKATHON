import time
import uuid
import json
import hashlib
import urllib.parse
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel
import requests

from config.settings import settings
from api.dependencies import get_current_user

router = APIRouter(tags=["PayTech"])

# Target payment methods supported natively by PayTech
VALID_PAYTECH_TARGETS = [
    "Orange Money",
    "Orange Money CI",
    "Orange Money ML",
    "Mtn Money CI",
    "Moov Money CI",
    "Moov Money ML",
    "Wave",
    "Wave CI",
    "Wizall",
    "Carte Bancaire",
    "Emoney",
    "Tigo Cash",
    "Free Money",
    "Moov Money BJ",
    "Mtn Money BJ"
]

class PayTechPaymentRequest(BaseModel):
    amount: int
    description: Optional[str] = None
    activity_name: Optional[str] = None
    target_payment: Optional[str] = None  # Wave, Orange Money, Free Money, Carte Bancaire (None = all methods)
    phone: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    custom_field: Optional[str] = None

# ─────────────────────────────────────────────────────────────────────────────
# 1. PAYTECH: Request Payment (Demande de paiement)
# Documentation officielle: https://doc.intech.sn/doc_paytech.php#paymentrequest
# Postman: https://paytech.sn/api/payment/request-payment
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/api/paytech/request-payment", dependencies=[Depends(get_current_user)])
def request_paytech_payment(data: PayTechPaymentRequest):
    api_key = settings.PAYTECH_API_KEY
    api_secret = settings.PAYTECH_API_SECRET
    
    if not api_key or not api_secret:
        raise HTTPException(
            status_code=400, 
            detail="Les clés PAYTECH_API_KEY et PAYTECH_API_SECRET ne sont pas configurées."
        )

    item_name = data.activity_name or data.description or "Demande Administrative"
    command_name = data.description or f"Paiement {item_name} - SenInnov"
    ref_command = f"CMD_{int(time.time())}_{uuid.uuid4().hex[:6].upper()}"

    payload = {
        "item_name": item_name,
        "item_price": data.amount,
        "currency": "XOF",
        "ref_command": ref_command,
        "command_name": command_name,
        "env": getattr(settings, "PAYTECH_ENV", "test"),
        "ipn_url": f"{settings.BACKEND_URL}/api/paytech/ipn",
        "success_url": f"{settings.FRONTEND_URL}/payment/success?ref={ref_command}",
        "cancel_url": f"{settings.FRONTEND_URL}/payment/cancel?ref={ref_command}",
        "custom_field": data.custom_field or json.dumps({
            "ref_command": ref_command,
            "item_name": item_name,
            "target_payment": data.target_payment,
            "payer_name": data.full_name,
            "payer_phone": data.phone,
            "payer_email": data.email
        })
    }

    if data.target_payment and data.target_payment.strip():
        payload["target_payment"] = data.target_payment.strip()

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "API_KEY": api_key,
        "API_SECRET": api_secret
    }

    try:
        response = requests.post(
            "https://paytech.sn/api/payment/request-payment",
            json=payload,
            headers=headers,
            timeout=15
        )
        res_data = response.json()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur de communication avec la passerelle PayTech: {str(e)}"
        )

    if response.status_code != 200 or res_data.get("success") != 1:
        error_msg = res_data.get("message") or f"HTTP {response.status_code}: {response.text}"
        raise HTTPException(
            status_code=400,
            detail=f"PayTech a refusé la demande de paiement: {error_msg}"
        )

    redirect_url = res_data.get("redirect_url") or res_data.get("redirectUrl")
    token = res_data.get("token")

    # Documentation officielle PayTech: Paramètres d'autofill & redirection directe
    if redirect_url:
        query_params = {}
        if data.target_payment and data.target_payment.strip():
            query_params["tp"] = data.target_payment.strip()
            query_params["nac"] = "0" if data.target_payment.strip().lower() == "carte bancaire" else "1"

        phone_raw = (data.phone or "").strip()
        clean_national = phone_raw.replace("+221", "").replace(" ", "").strip()
        clean_e164 = f"+221{clean_national}" if clean_national and not phone_raw.startswith("+") else phone_raw

        if clean_e164:
            query_params["pn"] = clean_e164
            query_params["nn"] = clean_national
            query_params["phone"] = clean_national
        if data.full_name:
            query_params["fn"] = data.full_name.strip()
            query_params["name"] = data.full_name.strip()
            query_params["full_name"] = data.full_name.strip()
        if data.email:
            query_params["em"] = data.email.strip()
            query_params["email"] = data.email.strip()

        if query_params:
            separator = "&" if "?" in redirect_url else "?"
            redirect_url = f"{redirect_url}{separator}{urllib.parse.urlencode(query_params)}" 

    return {
        "status": "success",
        "success": 1,
        "token": token,
        "sessionId": token,  # Pour compatibilité
        "redirect_url": redirect_url,
        "url": redirect_url, # Pour compatibilité
        "ref_command": ref_command,
        "target_payment": data.target_payment
    }


# ─────────────────────────────────────────────────────────────────────────────
# 2. PAYTECH: Vérification de Statut de Paiement
# Documentation officielle: https://doc.intech.sn/doc_paytech.php#statusapis
# GET /payment/get-status?token_payment={token}
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/api/paytech/status/{token}", dependencies=[Depends(get_current_user)])
def get_paytech_payment_status(token: str):
    api_key = settings.PAYTECH_API_KEY
    api_secret = settings.PAYTECH_API_SECRET
    
    if not api_key or not api_secret:
        raise HTTPException(
            status_code=400, 
            detail="Les clés PAYTECH_API_KEY et PAYTECH_API_SECRET ne sont pas configurées."
        )

    headers = {
        "Accept": "application/json",
        "API_KEY": api_key,
        "API_SECRET": api_secret
    }

    try:
        response = requests.get(
            f"https://paytech.sn/api/payment/get-status?token_payment={token}",
            headers=headers,
            timeout=10
        )
        res_data = response.json()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la vérification de statut PayTech: {str(e)}"
        )

    payment_info = res_data.get("payment") or {}
    state = payment_info.get("state", "running")

    # Mappage vers formats standards
    is_paid = state in ["success", "completed", "sale_complete"]
    is_failed = state in ["failed", "canceled", "rejected"]

    return {
        "status": "success",
        "success": res_data.get("success", 1),
        "state": state,
        "payment_status": "paid" if is_paid else ("failed" if is_failed else "pending"),
        "payment": payment_info
    }


# ─────────────────────────────────────────────────────────────────────────────
# 3. PAYTECH: Webhook IPN (Instant Payment Notification)
# Documentation officielle: https://doc.intech.sn/doc_paytech.php#ipnfonctionment
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/api/paytech/ipn")
async def paytech_ipn_webhook(request: Request):
    content_type = request.headers.get("content-type", "")
    
    # PayTech peut envoyer en application/x-www-form-urlencoded ou application/json
    if "application/json" in content_type:
        data = await request.json()
    else:
        form = await request.form()
        data = dict(form)

    type_event = data.get("type_event")
    ref_command = data.get("ref_command")
    api_key_sha256 = data.get("api_key_sha256")
    api_secret_sha256 = data.get("api_secret_sha256")

    # Vérification sécurisée SHA256 selon la documentation officielle
    expected_key_hash = hashlib.sha256(settings.PAYTECH_API_KEY.encode()).hexdigest()
    expected_secret_hash = hashlib.sha256(settings.PAYTECH_API_SECRET.encode()).hexdigest()

    if api_key_sha256 != expected_key_hash or api_secret_sha256 != expected_secret_hash:
        return Response(content="Forbidden: Invalid Signature", status_code=403)

    print(f"[PayTech IPN] Reçu événement: {type_event} pour ref_command: {ref_command}")
    if type_event == "sale_complete":
        # Traitement paiement réussi
        print(f"[PayTech IPN] Paiement VALIDÉ pour {ref_command} via {data.get('payment_method')}")
    elif type_event == "sale_canceled":
        print(f"[PayTech IPN] Paiement ANNULÉ pour {ref_command}")

    return Response(content="OK", status_code=200)


# ─────────────────────────────────────────────────────────────────────────────
# 4. COMPATIBILITÉ LEGACY: Ancien endpoint AfrikPay redirigé vers PayTech
# ─────────────────────────────────────────────────────────────────────────────
class AfrikPayLegacySessionCreate(BaseModel):
    amount: int
    description: Optional[str] = None
    activity_name: Optional[str] = None
    target_payment: Optional[str] = None

@router.post("/api/afrikpay/create-session", dependencies=[Depends(get_current_user)])
def legacy_create_session(data: AfrikPayLegacySessionCreate):
    req = PayTechPaymentRequest(
        amount=data.amount,
        description=data.description,
        activity_name=data.activity_name,
        target_payment=data.target_payment
    )
    return request_paytech_payment(req)

@router.get("/api/afrikpay/confirm/{session_id}", dependencies=[Depends(get_current_user)])
def legacy_confirm_session(session_id: str):
    return get_paytech_payment_status(session_id)
