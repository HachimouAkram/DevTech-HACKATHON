from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from api.routers import chat, payment, pointage, reports

# Initialize Database
init_db()

app = FastAPI(title="Teranga Civil AI Assistant", version="2.0")

# CORS Middleware config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(chat.router)
app.include_router(payment.router)
app.include_router(pointage.router)
app.include_router(reports.router)

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Teranga AI Assistant API is running"}
