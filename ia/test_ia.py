import unittest
import json
from fastapi.testclient import TestClient
from .main import app
from .database import Base, engine

class TestAIAssistant(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Bind metadata to sqlite in-memory for testing if possible, 
        # but here we just test using the FastAPI client directly.
        cls.client = TestClient(app)

    def test_flow(self):
        # 1. Get initial sessions
        response = self.client.get("/api/ai/sessions")
        self.assertEqual(response.status_code, 200)
        initial_sessions = response.json()
        
        # 2. Create new session
        response = self.client.post("/api/ai/sessions", json={"title": "Test Chat"})
        self.assertEqual(response.status_code, 200)
        session = response.json()
        session_id = session["id"]
        self.assertEqual(session["title"], "Test Chat")
        
        # 3. List messages (should be empty)
        response = self.client.get(f"/api/ai/sessions/{session_id}/messages")
        self.assertEqual(response.status_code, 200)
        messages = response.json()
        self.assertEqual(len(messages), 0)
        
        # 4. Post message to AI
        response = self.client.post(
            f"/api/ai/sessions/{session_id}/messages", 
            json={"content": "Bonjour, je cherche des infos sur la naissance"}
        )
        self.assertEqual(response.status_code, 200)
        ai_reply = response.json()
        self.assertEqual(ai_reply["sender"], "assistant")
        self.assertIn("naissance", ai_reply["content"])
        
        # 5. List messages (should be 2: 1 user + 1 assistant)
        response = self.client.get(f"/api/ai/sessions/{session_id}/messages")
        self.assertEqual(response.status_code, 200)
        messages = response.json()
        self.assertEqual(len(messages), 2)
        self.assertEqual(messages[0]["sender"], "user")
        self.assertEqual(messages[1]["sender"], "assistant")
        
        # 6. Delete session
        response = self.client.delete(f"/api/ai/sessions/{session_id}")
        self.assertEqual(response.status_code, 200)
        
        # 7. Check session is gone
        response = self.client.get("/api/ai/sessions")
        sessions = response.json()
        self.assertNotIn(session_id, [s["id"] for s in sessions])

if __name__ == "__main__":
    unittest.main()
