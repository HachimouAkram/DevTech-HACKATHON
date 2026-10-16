from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from api.dependencies import get_current_user
from services.ai_service import generate_ai_report_cohere

router = APIRouter(prefix="/api/ai/reports", tags=["AI Reports"])

class ReportGenerateRequest(BaseModel):
    startDate: str
    endDate: str
    stats: Dict[str, Any]
    activityLabel: Optional[str] = "Tous les types d'actes"
    topDocuments: Optional[List[Dict[str, Any]]] = []
    performance: Optional[List[Dict[str, Any]]] = []

@router.post("/generate")
def generate_report(data: ReportGenerateRequest, current_user: dict = Depends(get_current_user)):
    try:
        report_text = generate_ai_report_cohere(data.model_dump(), current_user)
        return {"status": "success", "report": report_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
