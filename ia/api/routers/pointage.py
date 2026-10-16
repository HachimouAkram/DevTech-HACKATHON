from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Optional
import json
import psycopg2
from datetime import datetime, time
from config.settings import settings
from api.dependencies import get_current_user
from face_rec import FaceRecognizer

router = APIRouter(prefix="/api/ai/pointage", tags=["Facial Recognition Pointage"], dependencies=[Depends(get_current_user)])

def get_db_connection():
    if not settings.DATABASE_URL:
        raise Exception("DATABASE_URL not found in env")
    return psycopg2.connect(settings.DATABASE_URL)

@router.get("/has-face/{user_id}")
def check_has_face(user_id: int):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id FROM facial_embeddings WHERE user_id = %s;", (user_id,))
        exists = cur.fetchone() is not None
        cur.close()
        conn.close()
        return {"has_face": exists}
    except Exception as e:
        print("Error checking face existence:", e)
        return {"has_face": False, "error": str(e)}

@router.post("/register-face/{user_id}")
async def register_face(user_id: int, file: UploadFile = File(...)):
    try:
        contents = await file.read()
        recognizer = FaceRecognizer.get_instance()
        embedding = recognizer.extract_embedding(contents)
        if not embedding:
            raise HTTPException(status_code=400, detail="Aucun visage détecté sur l'image")
            
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE id = %s;", (user_id,))
        user_exists = cur.fetchone()
        if not user_exists:
            cur.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
            
        embedding_str = json.dumps(embedding)
        cur.execute("SELECT id FROM facial_embeddings WHERE user_id = %s;", (user_id,))
        existing_emb = cur.fetchone()
        
        if existing_emb:
            cur.execute("UPDATE facial_embeddings SET embedding = %s WHERE user_id = %s;", (embedding_str, user_id))
        else:
            cur.execute("INSERT INTO facial_embeddings (user_id, embedding) VALUES (%s, %s);", (user_id, embedding_str))
            
        conn.commit()
        cur.close()
        conn.close()
        return {"status": "success", "message": "Empreinte faciale enregistrée avec succès"}
    except HTTPException as he:
        raise he
    except Exception as e:
        print("Error in register_face:", e)
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'enregistrement de l'empreinte faciale : {str(e)}")

@router.post("/verify-face")
async def verify_face(
    file: UploadFile = File(...),
    centre_id: Optional[int] = Form(None),
    bureau_id: Optional[int] = Form(None),
    type_session: str = Form("Entrée"),
    heure_reference: str = Form("08:00")
):
    try:
        if not centre_id and not bureau_id:
            raise HTTPException(status_code=400, detail="centre_id ou bureau_id est obligatoire")

        contents = await file.read()
        recognizer = FaceRecognizer.get_instance()
        embedding = recognizer.extract_embedding(contents)
        if not embedding:
            raise HTTPException(status_code=400, detail="Aucun visage détecté")
            
        conn = get_db_connection()
        cur = conn.cursor()
        
        actif = True
        if centre_id:
            cur.execute("SELECT heure_ouverture, heure_fermeture, heure_limite_arrivee, actif FROM pointage_config WHERE centre_id = %s LIMIT 1;", (centre_id,))
        else:
            cur.execute("SELECT heure_ouverture, heure_fermeture, heure_limite_arrivee, actif FROM pointage_config WHERE bureau_id = %s LIMIT 1;", (bureau_id,))
            
        config_row = cur.fetchone()
        if config_row and config_row[3] is not None:
            actif = config_row[3]
            
        if not actif:
            cur.close()
            conn.close()
            raise HTTPException(status_code=400, detail="Le pointage est désactivé pour ce centre/bureau.")
            
        now_dt = datetime.now()
        now_time = now_dt.time()
        
        try:
            heure_ref_time = datetime.strptime(heure_reference, "%H:%M").time()
        except:
            heure_ref_time = time(8, 0)
            
        query = """
            SELECT fe.user_id, fe.embedding, u.nom_complet
            FROM facial_embeddings fe
            JOIN users u ON fe.user_id = u.id
            WHERE (%s IS NULL OR u.centre_id = %s)
              AND (%s IS NULL OR u.bureau_id = %s)
              AND u.actif = true;
        """
        cur.execute(query, (centre_id, centre_id, bureau_id, bureau_id))
        rows = cur.fetchall()
        
        if not rows:
            cur.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Aucun agent avec empreinte faciale configurée dans ce centre/bureau.")
            
        best_match_id = None
        best_match_name = None
        best_similarity = -1.0
        
        for row in rows:
            u_id, u_emb_str, u_name = row
            try:
                u_emb = json.loads(u_emb_str)
                sim = recognizer.compare_embeddings(embedding, u_emb)
                if sim > best_similarity:
                    best_similarity = sim
                    best_match_id = u_id
                    best_match_name = u_name
            except Exception as ex:
                print(f"Error parsing embedding for user {u_id}: {ex}")
                
        if best_similarity < 0.60:
            cur.close()
            conn.close()
            raise HTTPException(status_code=400, detail="Visage non reconnu ou non autorisé.")
            
        today_date = now_dt.date()
        cur.execute("SELECT id, heure_arrivee, heure_depart, statut FROM pointages WHERE user_id = %s AND date = %s;", (best_match_id, today_date))
        pointage_row = cur.fetchone()
        
        statut_str = "PRESENT"
        message = ""
        
        if type_session == "Entrée":
            if pointage_row and pointage_row[1] is not None:
                h_arr = pointage_row[1]
                if not isinstance(h_arr, time):
                    h_arr = datetime.strptime(str(h_arr), "%H:%M:%S").time()
                message = f"Déjà pointé pour l'entrée aujourd'hui à {h_arr.strftime('%H:%M')}"
                cur.close()
                conn.close()
                return {"status": "already_pointed", "agent_id": best_match_id, "nom_complet": best_match_name, "message": message}
                
            if now_time > heure_ref_time:
                statut_str = "RETARD"
            else:
                statut_str = "PRESENT"
                
            if not pointage_row:
                cur.execute("INSERT INTO pointages (user_id, date, heure_arrivee, statut, centre_id, bureau_id) VALUES (%s, %s, %s, %s, %s, %s);", (best_match_id, today_date, now_time, statut_str, centre_id, bureau_id))
            else:
                cur.execute("UPDATE pointages SET heure_arrivee = %s, statut = %s WHERE id = %s;", (now_time, statut_str, pointage_row[0]))
            message = f"✓ Entrée enregistrée pour {best_match_name} à {now_time.strftime('%H:%M')} ({statut_str})"
            
        else:
            if now_time < heure_ref_time:
                statut_str = "SORTI AVANT L'HEURE"
            else:
                statut_str = "SORTI EN RETARD" if now_time > time(heure_ref_time.hour, min(heure_ref_time.minute + 15, 59)) else "SORTI A L'HEURE"
                
            if not pointage_row:
                cur.execute("INSERT INTO pointages (user_id, date, heure_depart, statut, centre_id, bureau_id) VALUES (%s, %s, %s, %s, %s, %s);", (best_match_id, today_date, now_time, statut_str, centre_id, bureau_id))
            else:
                p_id, h_arr, h_dep, p_statut = pointage_row
                if h_dep is not None:
                    h_d = h_dep if isinstance(h_dep, time) else datetime.strptime(str(h_dep), "%H:%M:%S").time()
                    message = f"Déjà pointé pour la sortie aujourd'hui à {h_d.strftime('%H:%M')}"
                    cur.close()
                    conn.close()
                    return {"status": "already_pointed", "agent_id": best_match_id, "nom_complet": best_match_name, "message": message}
                
                cur.execute("UPDATE pointages SET heure_depart = %s, statut = %s WHERE id = %s;", (now_time, statut_str, p_id))
            message = f"✓ Sortie enregistrée pour {best_match_name} à {now_time.strftime('%H:%M')} ({statut_str})"
                
        conn.commit()
        cur.close()
        conn.close()
        
        return {"status": "success", "agent_id": best_match_id, "nom_complet": best_match_name, "type_pointage": type_session, "statut": statut_str, "message": message}
    except HTTPException as he:
        raise he
    except Exception as e:
        print("Error in verify_face:", e)
        raise HTTPException(status_code=500, detail=f"Erreur lors de la vérification faciale : {str(e)}")
