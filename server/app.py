"""FastAPI application exposing the detective game's dialogue endpoints."""

from __future__ import annotations

import logging
import pathlib
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from .admin_routes import router as admin_router
from .auth_routes import router as auth_router
from .auth_routes import state_router
from .cases import load_all_cases, get_active_case, get_all_cases, get_case
from .chat_routes import limiter, router as chat_router
from .config import settings
from .feedback_routes import router as feedback_router
from .supabase_client import get_supabase
from .tracking_routes import router as tracking_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

_WEB_DIR = pathlib.Path(__file__).resolve().parent.parent / "web"


# ── Lifespan: replaces deprecated @app.on_event("startup") ──────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load all case data at startup; cleanup (if any) on shutdown."""
    cases = load_all_cases()
    log.info("Loaded %d case(s): %s", len(cases), ", ".join(cases.keys()))
    yield


app = FastAPI(title="Detective Game Backend", version="0.1.0", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(Exception)
async def _global_exception_handler(request: Request, exc: Exception):
    """Catch-all: ensure every error returns JSON so the client can parse it."""
    log.exception("Unhandled exception on %s %s", request.method, request.url.path)
    # Include exception summary to aid remote debugging (no secrets leaked)
    exc_type = type(exc).__name__
    exc_msg = str(exc)[:200] if str(exc) else ""
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {exc_type}: {exc_msg}"},
    )


# ── CORS ─────────────────────────────────────────────────────────────────
# Configurable via ECHO_CORS_ORIGINS env var (comma-separated).
# Defaults to permissive "*" for development; set to specific origins
# in production (e.g. "https://yourdomain.com").

_cors_env = getattr(settings, "cors_origins", None)
if _cors_env:
    allow_origins = [o.strip() for o in _cors_env.split(",") if o.strip()]
else:
    allow_origins = ["*"]
    if settings.llm_provider == "local":
        log.info(
            "CORS allow_origins is wildcard '*' (local provider). "
            "This is expected for local development."
        )
    else:
        log.warning(
            "CORS allow_origins is wildcard '*'. "
            "Set ECHO_CORS_ORIGINS to your deployment domain in production "
            "(e.g. ECHO_CORS_ORIGINS=https://yourdomain.com)."
        )

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routers ───────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(state_router)
app.include_router(tracking_router)
app.include_router(feedback_router)
app.include_router(admin_router)
app.include_router(chat_router)


@app.get("/api/cases")
async def list_cases() -> dict:
    """Return all available cases."""
    cases = get_all_cases()
    return {
        "cases": [
            {
                "case_id": c.case_id,
                "frontend_dir": c.frontend_dir or c.case_id.replace("_", "-"),
                "title": c.title,
                "tagline": c.tagline,
                "npc_count": len(c.npc_profiles),
            }
            for c in cases.values()
        ]
    }


@app.get("/api/case")
async def get_case_info(case_id: str | None = None) -> dict:
    """Return a case identifier so the frontend can load the right assets."""
    if case_id:
        case = get_case(case_id)
    else:
        case = get_active_case()
    frontend_dir = case.frontend_dir or case.case_id.replace("_", "-")
    return {"case_id": case.case_id, "frontend_dir": frontend_dir}


@app.get("/api/npcs")
async def list_available_npcs(case_id: str | None = None) -> dict:
    """Return the NPCs available for conversation."""
    if case_id:
        case = get_case(case_id)
    else:
        case = get_active_case()
    profiles = case.npc_profiles
    return {
        "npcs": [
            {
                "npc_id": profile.npc_id,
                "display_name": profile.display_name,
                "voice": profile.voice,
                "voice_instruction": profile.voice_instruction,
            }
            for profile in profiles.values()
        ]
    }


@app.get("/health")
async def healthcheck() -> JSONResponse:
    """Health endpoint that verifies dependency connectivity."""
    deps = {"llm_provider": settings.llm_provider}

    # Check Supabase
    sb = get_supabase()
    if sb is not None:
        try:
            sb.table("game_sessions").select("session_id").limit(1).execute()
            deps["supabase"] = "ok"
        except Exception:
            deps["supabase"] = "error"
    else:
        deps["supabase"] = "not_configured"

    all_ok = deps.get("supabase") != "error"
    status_code = 200 if all_ok else 503
    return JSONResponse(
        content={"status": "ok" if all_ok else "degraded", **deps},
        status_code=status_code,
    )


# ── Admin page ───────────────────────────────────────────────────────────
_ADMIN_DIR = pathlib.Path(__file__).resolve().parent.parent / "web" / "admin"


@app.get("/admin")
@app.get("/admin/")
async def admin_page():
    """Serve the admin SPA."""
    admin_html = _ADMIN_DIR / "index.html"
    if not admin_html.is_file():
        raise HTTPException(status_code=404, detail="Admin page not found")
    return FileResponse(str(admin_html))


# Middleware: add Cache-Control: no-cache for JS/CSS assets so browsers always
# revalidate against the server instead of using stale heuristic-cached copies.
@app.middleware("http")
async def no_cache_js(request: Request, call_next):
    response = await call_next(request)
    path = request.url.path
    if path.endswith((".js", ".css")):
        response.headers["Cache-Control"] = "no-cache"
    return response


# Serve the web frontend as static files (must be mounted last so API routes
# take priority over the catch-all static handler).
if _WEB_DIR.is_dir():
    app.mount("/", StaticFiles(directory=str(_WEB_DIR), html=True), name="static")
