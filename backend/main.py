import sys
import traceback
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# Add current directory to path
current_dir = Path(__file__).parent.absolute()
sys.path.insert(0, str(current_dir))

try:
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
    allow_credentials = False
    if settings.CORS_ORIGINS:
        if isinstance(settings.CORS_ORIGINS, str):
            origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")]
        else:
            origins = settings.CORS_ORIGINS
        # Only enable credentials if specific origins are set (not wildcard)
        allow_credentials = "*" not in origins

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=allow_credentials,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include Routers
    app.include_router(api_router, prefix=settings.API_PREFIX)
    app.include_router(letters_router, prefix=f"{settings.API_PREFIX}/letters", tags=["letters"])

    @app.get("/")
    async def root():
        return {
            "message": "Alif24 Platform API is running",
            "docs": f"{settings.API_PREFIX}/docs",
            "redoc": f"{settings.API_PREFIX}/redoc"
        }

except Exception as e:
    # If app fails to start, create a fallback app that shows the error
    error_msg = f"Failed to start FastAPI app: {str(e)}\n{traceback.format_exc()}"
    print(error_msg)  # Print to Vercel logs
    
    app = FastAPI(title="Startup Error")
    
    @app.get("/{catchall:path}")
    async def fallback_route(request: Request):
        return JSONResponse(
            status_code=500,
            content={
                "error": "Application failed to start",
                "detail": error_msg.split('\n')
            }
        )

if __name__ == "__main__":
    import uvicorn
    # Try to get settings if available, else default
    try:
        from app.core.config import settings
        port = settings.PORT
        debug = settings.DEBUG
    except:
        port = 5000
        debug = True
        
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=debug)
