from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import os
import json
import tempfile
from groq import Groq
from config.settings import settings
from database import get_db, ChatSession, ChatMessage
from api.dependencies import get_current_user
from services.ai_service import generate_ai_response_cohere

router = APIRouter(prefix="/api/ai/sessions", tags=["AI Chatbot"])

class MessageCreate(BaseModel):
    content: str
    context: Optional[dict] = None

class MessageResponse(BaseModel):
    id: int
    sender: str
    content: str
    created_at: str
    transcription: Optional[str] = None

    class Config:
        from_attributes = True

class SessionCreate(BaseModel):
    title: Optional[str] = None

class SessionResponse(BaseModel):
    id: str
    title: str
    created_at: str

    class Config:
        from_attributes = True

@router.get("", response_model=List[SessionResponse])
def get_sessions(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = str(current_user.get("sub") or current_user.get("id") or current_user.get("email") or "guest")
    sessions = db.query(ChatSession).filter(ChatSession.user_id == user_id).order_by(ChatSession.created_at.desc()).all()
    res = []
    for s in sessions:
        res.append(SessionResponse(id=s.id, title=s.title, created_at=s.created_at.isoformat()))
    return res

@router.post("", response_model=SessionResponse)
def create_session(data: SessionCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = str(current_user.get("sub") or current_user.get("id") or current_user.get("email") or "guest")
    title = data.title or "Nouvelle discussion"
    new_sess = ChatSession(title=title, user_id=user_id)
    db.add(new_sess)
    db.commit()
    db.refresh(new_sess)
    return SessionResponse(id=new_sess.id, title=new_sess.title, created_at=new_sess.created_at.isoformat())

@router.get("/{session_id}/messages", response_model=List[MessageResponse])
def get_messages(session_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = str(current_user.get("sub") or current_user.get("id") or current_user.get("email") or "guest")
    sess = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user_id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc()).all()
    res = []
    for m in messages:
        res.append(MessageResponse(id=m.id, sender=m.sender, content=m.content, created_at=m.created_at.isoformat()))
    return res

@router.post("/{session_id}/messages", response_model=MessageResponse)
def send_message(session_id: str, data: MessageCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = str(current_user.get("sub") or current_user.get("id") or current_user.get("email") or "guest")
    sess = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user_id).first()
    if not sess:
        sess = ChatSession(id=session_id, title="Nouvelle discussion", user_id=user_id)
        db.add(sess)
        db.commit()
        db.refresh(sess)
        
    history_messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc()).all()
    formatted_history = []
    for msg in history_messages:
        role = "USER" if msg.sender == "user" else "CHATBOT"
        formatted_history.append({"role": role, "message": msg.content})

    user_msg = ChatMessage(session_id=session_id, sender="user", content=data.content)
    db.add(user_msg)
    
    if sess.title == "Nouvelle discussion":
        snippet = data.content[:35] + ("..." if len(data.content) > 35 else "")
        sess.title = snippet
        db.add(sess)
        
    ai_content = generate_ai_response_cohere(data.content, formatted_history, context=data.context, current_user=current_user)
    ai_msg = ChatMessage(session_id=session_id, sender="assistant", content=ai_content)
    db.add(ai_msg)
    db.commit()
    db.refresh(ai_msg)
    
    return MessageResponse(id=ai_msg.id, sender=ai_msg.sender, content=ai_msg.content, created_at=ai_msg.created_at.isoformat())

@router.post("/{session_id}/voice", response_model=MessageResponse)
def send_voice_message(
    session_id: str, 
    audio: UploadFile = File(...), 
    context: str = Form(None),
    current_user: dict = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    user_id = str(current_user.get("sub") or current_user.get("id") or current_user.get("email") or "guest")
    
    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="Clé API Groq manquante pour la transcription vocale.")
        
    client = Groq(api_key=settings.GROQ_API_KEY)
    
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".m4a") as tmp_file:
        tmp_file.write(audio.file.read())
        tmp_file_path = tmp_file.name

    try:
        with open(tmp_file_path, "rb") as audio_file:
            transcription = client.audio.transcriptions.create(
                file=(audio.filename, audio_file.read()),
                model="whisper-large-v3",
                language="fr"
            )
        transcribed_text = transcription.text
    except Exception as e:
        if os.path.exists(tmp_file_path):
            os.remove(tmp_file_path)
        raise HTTPException(status_code=500, detail=f"Erreur de transcription audio: {str(e)}")
        
    # Clean up temp file
    if os.path.exists(tmp_file_path):
        os.remove(tmp_file_path)
        
    if not transcribed_text or not transcribed_text.strip():
        raise HTTPException(status_code=400, detail="L'audio était vide ou inaudible.")

    # Proceed as standard chat message with transcribed text
    sess = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user_id).first()
    if not sess:
        sess = ChatSession(id=session_id, title="Nouvelle discussion", user_id=user_id)
        db.add(sess)
        db.commit()
        db.refresh(sess)
        
    history_messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc()).all()
    formatted_history = []
    for msg in history_messages:
        role = "USER" if msg.sender == "user" else "CHATBOT"
        formatted_history.append({"role": role, "message": msg.content})

    user_msg = ChatMessage(session_id=session_id, sender="user", content=f"🎤 (Audio) : {transcribed_text}")
    db.add(user_msg)
    
    if sess.title == "Nouvelle discussion":
        snippet = transcribed_text[:35] + ("..." if len(transcribed_text) > 35 else "")
        sess.title = snippet
        db.add(sess)
        
    parsed_context = None
    if context:
        try:
            parsed_context = json.loads(context)
        except:
            pass

    ai_content = generate_ai_response_cohere(transcribed_text, formatted_history, context=parsed_context, current_user=current_user)
    ai_msg = ChatMessage(session_id=session_id, sender="assistant", content=ai_content)
    db.add(ai_msg)
    db.commit()
    db.refresh(ai_msg)
    
    return MessageResponse(
        id=ai_msg.id, 
        sender=ai_msg.sender, 
        content=ai_msg.content, 
        created_at=ai_msg.created_at.isoformat(),
        transcription=transcribed_text
    )


@router.delete("")
def delete_all_sessions(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = str(current_user.get("sub") or current_user.get("id") or current_user.get("email") or "guest")
    sessions_to_delete = db.query(ChatSession).filter(ChatSession.user_id == user_id).all()
    for s in sessions_to_delete:
        db.delete(s)
    db.commit()
    return {"status": "success", "message": "Toutes les discussions de l'utilisateur ont été supprimées"}

@router.delete("/{session_id}")
def delete_session(session_id: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = str(current_user.get("sub") or current_user.get("id") or current_user.get("email") or "guest")
    sess = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user_id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    db.delete(sess)
    db.commit()
    return {"status": "success", "message": "Discussion supprimée"}
