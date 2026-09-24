"""PromptForge Backend FastAPI Application."""
from fastapi import FastAPI, Depends, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, OperationalError

from .database.connection import get_db, verify_database_connection
from .routes.auth import router as auth_router

app = FastAPI(
    title="PromptForge API",
    description="Modular prompt development, testing, and composition platform",
    version="0.1.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router)


@app.get("/", tags=["General"])
def read_root():
    """Root welcome endpoint."""
    return {"message": "Welcome to PromptForge API"}


@app.get("/health", tags=["Health"])
def health_check():
    """General application liveness health check."""
    return {"status": "ok"}


@app.get("/health/db", tags=["Health"])
def db_health_check(db: Session = Depends(get_db)):
    """PostgreSQL database connectivity health check.
    
    Verifies that the database engine can execute queries and the session is healthy.
    """
    try:
        # Execute lightweight ping query
        db.execute(text("SELECT 1"))
        return {
            "status": "ok",
            "database": "connected",
        }
    except (OperationalError, SQLAlchemyError):
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "error",
                "database": "disconnected",
                "detail": "Database is unreachable or connection failed.",
            },
        )
    except Exception:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "error",
                "database": "disconnected",
                "detail": "An unexpected error occurred during database check.",
            },
        )
