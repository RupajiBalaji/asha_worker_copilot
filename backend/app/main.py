from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.database import engine, Base
from app.routers import patients, visits, chatbot, supervisor
from app.routers.referrals_followups import router_referral, router_followup

# Create / migrate tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ASHA Worker AI Co-pilot",
    description=(
        "AI-powered healthcare assistance for ASHA (Accredited Social Health Activist) workers. "
        "Provides real-time risk assessment, automated referrals, and follow-up scheduling."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow all origins for local dev; restrict to frontend domain in production
# Set ALLOWED_ORIGINS env var in Railway to your Vercel URL, e.g.:
#   ALLOWED_ORIGINS=https://your-app.vercel.app
_allowed_origins = os.environ.get("ALLOWED_ORIGINS", "*")
origins = [o.strip() for o in _allowed_origins.split(",")] if _allowed_origins != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve generated referral PDFs as static files under /referral-pdfs/
referrals_dir = os.path.join(os.path.dirname(__file__), "..", "referrals")
os.makedirs(referrals_dir, exist_ok=True)  # Create if it doesn't exist yet
app.mount("/referral-pdfs", StaticFiles(directory=referrals_dir), name="referral_pdfs")

# API routers
app.include_router(patients.router)
app.include_router(visits.router)
app.include_router(router_referral)
app.include_router(router_followup)
app.include_router(chatbot.router)
app.include_router(supervisor.router)


@app.get("/health", tags=["system"])
def health_check():
    """API health check — returns ok if the server is running."""
    return {"status": "ok", "version": "1.0.0"}


@app.get("/", tags=["system"])
def root():
    """Root endpoint — returns API info and links."""
    return {
        "message": "ASHA Worker AI Co-pilot API v1.0.0",
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/health",
    }
