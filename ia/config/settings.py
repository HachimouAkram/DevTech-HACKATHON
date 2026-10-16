import os

# Load environment variables robustly
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
if os.path.exists(env_path):
    with open(env_path, "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                if "=" in line:
                    key, val = line.split("=", 1)
                    os.environ[key.strip()] = val.strip()

class Settings:
    DATABASE_URL = os.environ.get("DATABASE_URL")
    COHERE_API_KEY = os.environ.get("COHERE_API_KEY", "")
    AFRIKPAY_TEST_KEY = os.environ.get("AFRIKPAY_TEST_KEY")
    JWT_SECRET = os.environ.get("JWT_SECRET", "terangacivil2026_super_secret_jwt_key_123456")
    GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

settings = Settings()
