import sys
import uvicorn
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# Add current directory to path to ensure imports work correctly
current_dir = Path(__file__).parent.absolute()
sys.path.insert(0, str(current_dir))

from app.core.config import settings
from app.core.database import init_db
from app.api.v1 import router as api_router
from app.letters.router import router as letters_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database connection
    await init_db()
    yield
    # Shutdown: Clean up resources if needed

app = FastAPI(
    title="Alif24 Platform API",
    description="Backend API for Alif24 Platform",
    version="1.0.0",
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
    lifespan=lifespan
)

# CORS Configuration
origins = ["*"]
if settings.CORS_ORIGINS:
    if isinstance(settings.CORS_ORIGINS, str):
        origins = settings.CORS_ORIGINS.split(",")
    else:
        origins = settings.CORS_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(api_router, prefix=settings.API_PREFIX)
# Include letters router under /api/v1/letters or just /letters. 
# Based on common patterns, let's include it under /letters or check if it should be under API_PREFIX.
# The previous debug script imported it separately, so we include it.
# Assuming /api/v1/letters for consistency if it's an API resource.
app.include_router(letters_router, prefix=f"{settings.API_PREFIX}/letters", tags=["letters"])

@app.get("/")
async def root():
    return {
        "message": "Alif24 Platform API is running",
        "docs": f"{settings.API_PREFIX}/docs",
        "redoc": f"{settings.API_PREFIX}/redoc"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=settings.DEBUG)
