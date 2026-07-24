"""BirdNET-Pi FastAPI Application.

Main entry point for the web API.
"""
import html
import json
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from .config import get_settings
from .routers import detections, species, config, system, media, integrations, files
from .version_metadata import read_version_metadata, normalized_service_version, normalized_git_hash


BLOCKED_FALLBACK_SUFFIXES = {
    '.php',
    '.php3',
    '.php4',
    '.php5',
    '.php7',
    '.php8',
    '.phtml',
    '.phar',
    '.phps',
    '.pht',
    '.phtm',
}
BLOCKED_FALLBACK_NAMES = {'.git'}


def is_blocked_fallback_path(full_path: str) -> bool:
    """Reject legacy/probe paths before serving the SPA shell."""
    parts = Path(full_path).parts
    for part in parts:
        lower_part = part.lower()
        if lower_part in BLOCKED_FALLBACK_NAMES or lower_part == '.env' or lower_part.startswith('.env.'):
            return True
        if Path(lower_part).suffix in BLOCKED_FALLBACK_SUFFIXES:
            return True
    return False


def script_safe_json(data: dict) -> str:
    """Serialize JSON for inline script contexts."""
    return (
        json.dumps(data, separators=(',', ':'))
        .replace('<', '\\u003c')
        .replace('>', '\\u003e')
        .replace('&', '\\u0026')
    )


def frontend_html_response(path: Path) -> HTMLResponse:
    """Serve the SPA shell with the configured site name embedded for first paint."""
    settings = get_settings()
    site_name = settings.site_name or "BirdNET-Pi"
    page = path.read_text(encoding='utf-8')
    escaped_site_name = html.escape(site_name, quote=True)
    bootstrap = (
        '<script>'
        f'window.__BIRDNET_BOOTSTRAP__={script_safe_json({"siteName": site_name})};'
        '</script>'
    )

    page = page.replace('<title>BirdNET-Pi</title>', f'<title>{escaped_site_name}</title>', 1)
    page = page.replace(
        'content="BirdNET-Pi - Raspberry Pi bird detection system"',
        f'content="{escaped_site_name} - Raspberry Pi bird detection system"',
        1,
    )
    if 'window.__BIRDNET_BOOTSTRAP__' not in page:
        page = page.replace('</head>', f'\t\t{bootstrap}\n\t</head>', 1)

    return HTMLResponse(page, headers={"Cache-Control": "no-cache"})


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
app.include_router(files.router, prefix="/api", tags=["files"])


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
    metadata = read_version_metadata(settings.base_path)

    return {
        "name": "BirdNET-Pi",
        "version": normalized_service_version(metadata),
        "git_hash": normalized_git_hash(metadata),
        "git_branch": metadata.get("git_branch", "unknown"),
        "api_version": metadata.get("api_version", "1.0.0"),
        "build_date_utc": metadata.get("build_date_utc", "unknown"),
        "site_name": settings.site_name,
        "latitude": settings.latitude,
        "longitude": settings.longitude,
        "model": settings.model,
    }


# Frontend static files configuration
frontend_build_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', 'frontend', 'build')

if os.path.exists(frontend_build_path):
    # Mount static assets (JS, CSS, images, etc.) under /_app
    app_assets_path = os.path.join(frontend_build_path, '_app')
    if os.path.exists(app_assets_path):
        app.mount("/_app", StaticFiles(directory=app_assets_path), name="app_assets")

    # Serve favicon
    @app.get("/favicon.ico")
    async def favicon():
        favicon_path = os.path.join(frontend_build_path, 'favicon.ico')
        if os.path.exists(favicon_path):
            return FileResponse(favicon_path)
        # Fallback to favicon.png
        favicon_png = os.path.join(frontend_build_path, 'favicon.png')
        if os.path.exists(favicon_png):
            return FileResponse(favicon_png, media_type="image/png")
        return FileResponse(favicon_path)  # Will 404 if neither exists

    # SPA fallback: serve index.html for any non-API route
    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        """Serve the SvelteKit SPA for any non-API route.

        This handles client-side routing by serving index.html for all
        paths that don't match static files or API routes.
        """
        if is_blocked_fallback_path(full_path):
            raise HTTPException(status_code=404, detail="Not found")

        # Check if the path maps to an actual static file
        file_path = Path(frontend_build_path) / full_path

        # If it's a file that exists, serve it
        if file_path.is_file():
            if file_path.suffix == '.html':
                return frontend_html_response(file_path)
            return FileResponse(file_path)

        # Check for .html extension (pre-rendered pages)
        html_path = file_path.with_suffix('.html')
        if html_path.is_file():
            return frontend_html_response(html_path)

        # Check for index.html in directory
        index_path = file_path / 'index.html'
        if index_path.is_file():
            return frontend_html_response(index_path)

        # SPA fallback: serve the main index.html
        index_html = Path(frontend_build_path) / 'index.html'
        if index_html.is_file():
            return frontend_html_response(index_html)

        # Last resort fallback (shouldn't happen)
        return FileResponse(os.path.join(frontend_build_path, 'index.html'))
