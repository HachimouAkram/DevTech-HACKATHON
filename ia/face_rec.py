import os
import numpy as np
import cv2
import insightface

class FaceRecognizer:
    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        print("Initialisation du modèle de reconnaissance faciale InsightFace (buffalo_sc)...")
        # Initialize FaceAnalysis with the lightweight buffalo_sc model
        self.app = insightface.app.FaceAnalysis(name='buffalo_sc', providers=['CPUExecutionProvider'])
        self.app.prepare(ctx_id=0, det_size=(640, 640))
        print("InsightFace initialisé avec succès.")

    def extract_embedding(self, image_bytes: bytes) -> list:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Impossible de décoder l'image")

        faces = self.app.get(img)
        if not faces:
            return None

        # Get the largest face based on bounding box area
        faces = sorted(faces, key=lambda x: (x.bbox[2] - x.bbox[0]) * (x.bbox[3] - x.bbox[1]), reverse=True)
        return faces[0].embedding.tolist()

    @staticmethod
    def compare_embeddings(emb1, emb2) -> float:
        v1 = np.array(emb1)
        v2 = np.array(emb2)
        dot = np.dot(v1, v2)
        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return float(dot / (norm1 * norm2))
