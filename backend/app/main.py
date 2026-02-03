"""BirdNET-Pi FastAPI Application.

Main entry point for the web API.
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import get_settings
from .routers import detections, species, config, system, media, integrations


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    settings = get_settings()
    print(f"Starting BirdNET-Pi API for {settings.site_name}")
    print(f"Database: {settings.db_path}")
    yield
    # Shutdown
    print("Shutting down BirdNET-Pi API")


app = FastAPI(
    title="BirdNET-Pi API",
    description="API for BirdNET-Pi bird detection system",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(detections.router, prefix="/api", tags=["detections"])
app.include_router(species.router, prefix="/api", tags=["species"])
app.include_router(config.router, prefix="/api", tags=["config"])
app.include_router(system.router, prefix="/api", tags=["system"])
app.include_router(media.router, prefix="/api", tags=["media"])
app.include_router(integrations.router, prefix="/api", tags=["integrations"])


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    settings = get_settings()
    return {
        "status": "healthy",
        "site_name": settings.site_name,
    }


@app.get("/api/info")
async def app_info():
    """Application information."""
    settings = get_settings()
    
    # Read version from version.md
    version = "unknown"
    version_path = os.path.join(settings.base_path, 'version.md')
    if os.path.exists(version_path):
        with open(version_path) as f:
            version = f.read().strip()
    
    return {
        "name": "BirdNET-Pi",
        "version": version,
        "site_name": settings.site_name,
        "latitude": settings.latitude,
        "longitude": settings.longitude,
        "model": settings.model,
    }


# Mount static files for frontend (SvelteKit build)
# This should be last to not interfere with API routes
frontend_build_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', 'frontend', 'build')
if os.path.exists(frontend_build_path):
    app.mount("/", StaticFiles(directory=frontend_build_path, html=True), name="frontend")
