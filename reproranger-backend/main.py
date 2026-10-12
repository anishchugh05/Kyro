"""
Kyro — Autonomous AI Code Repair Engine
Copyright © 2026 Anish Chugh. All rights reserved.
Version 1.0.0 | June 2026
Unauthorized copying, modification, or distribution is strictly prohibited.

Kyro Backend — FastAPI server
  POST /api/analyze       → creates a job, returns { jobId }
  WS   /ws/{job_id}       → streams agent events in real-time
  GET  /api/jobs/{job_id} → inspect job status
  GET  /api/stats         → real repo count from DB
  GET  /health            → liveness check
"""
import asyncio
import json
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from pydantic import BaseModel, field_validator

from modules.agent_loop import AgentLoop
from modules.job_store import JobStore
from modules.repo_ingestor import validate_repo_url
from utils.logger import setup_logger
from utils.rate_limiter import RateLimiter

load_dotenv()

logger = setup_logger(__name__)

# ─── Singletons ───────────────────────────────────────────────────────────────
job_store = JobStore()
rate_limiter = RateLimiter(
    max_requests=int(os.getenv("RATE_LIMIT_PER_MINUTE", "10")),
    window_seconds=60,
)
_active_jobs: set[str] = set()
_is_production = os.getenv("ENVIRONMENT", "development") == "production"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    logger.info("Kyro v1.0.0 starting (environment=%s)", os.getenv("ENVIRONMENT", "development"))
    yield
    logger.info("Kyro shutting down")


app = FastAPI(
    title="Kyro API",
    version="1.0.0",
    lifespan=lifespan,
    # Disable interactive docs in production — no accidental exposure
    docs_url=None if _is_production else "/docs",
    redoc_url=None if _is_production else "/redoc",
)

# ─── Trusted hosts ─────────────────────────────────────────────────────────────
_trusted_hosts = [
    h.strip()
    for h in os.getenv(
        "ALLOWED_HOSTS",
        "localhost,127.0.0.1,healthcheck.railway.app,*.railway.app"
    ).split(",")
    if h.strip()
]
app.add_middleware(TrustedHostMiddleware, allowed_hosts=_trusted_hosts)

# ─── CORS ─────────────────────────────────────────────────────────────────────
_configured_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://localhost:4173",
).split(",")
_allowed_origins = [o.strip() for o in _configured_origins if o.strip()]
_allow_origin_regex = os.getenv(
    "ALLOWED_ORIGIN_REGEX",
    r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=_allow_origin_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Request-ID"],
)


# ─── Security headers ─────────────────────────────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["Cache-Control"] = "no-store"
    if "server" in response.headers:
        del response.headers["server"]
    return response


# ─── Request / Response schemas ───────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    repo_url: str
    issue_text: str = ""

    @field_validator("repo_url")
    @classmethod
    def check_repo_url(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("repo_url is required")
        if not validate_repo_url(v):
            raise ValueError(
                "Invalid repository URL. Only GitHub, GitLab, and Bitbucket HTTPS URLs are accepted."
            )
        return v

    @field_validator("issue_text")
    @classmethod
    def check_issue_text(cls, v: str) -> str:
        v = v.strip()
        if len(v) > 8000:
            raise ValueError("issue_text must be under 8000 characters")
        return v


# ─── REST endpoints ───────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "version": "1.0.0",
        "author": "Anish Chugh",
        "active_jobs": len(_active_jobs),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/stats")
async def get_stats():
    return {"reposAnalyzed": job_store.count_successful_jobs()}


@app.post("/api/analyze", status_code=201)
async def create_analyze_job(body: AnalyzeRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    if not rate_limiter.is_allowed(client_ip):
        logger.warning("Rate limit exceeded for IP %s", client_ip)
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Try again in a minute.",
        )

    missing = [k for k in ("OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GOOGLE_API_KEY") if not os.getenv(k)]
    if missing:
        logger.error("Missing required API keys: %s", missing)
        raise HTTPException(
            status_code=503,
            detail=f"Server misconfiguration: missing API keys ({', '.join(missing)}).",
        )

    job_id = job_store.create_job(body.repo_url, body.issue_text)
    logger.info("Job created: %s for %s", job_id, body.repo_url)
    return {"jobId": job_id}


@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str):
    job = job_store.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "id": job.id,
        "repoUrl": job.repo_url,
        "status": job.status,
        "createdAt": job.created_at,
        "updatedAt": job.updated_at,
        "diff": job.diff_output,
        "error": job.error,
    }


# ─── WebSocket endpoint ───────────────────────────────────────────────────────
@app.websocket("/ws/{job_id}")
async def ws_agent(websocket: WebSocket, job_id: str):
    await websocket.accept()
    pending_sends: set[asyncio.Task] = set()
    socket_closing = False

    job = job_store.get_job(job_id)
    if not job:
        await websocket.send_json({"type": "error", "data": {"message": "Job not found"}})
        await websocket.close()
        return

    if job_id in _active_jobs:
        await websocket.send_json({"type": "error", "data": {"message": "Job already running"}})
        await websocket.close()
        return

    _active_jobs.add(job_id)
    logger.info("WebSocket connected for job %s", job_id)

    async def safe_send(payload: str) -> None:
        try:
            await websocket.send_text(payload)
        except Exception:
            pass

    def emit(msg_type: str, data: dict) -> None:
        nonlocal socket_closing
        if socket_closing:
            return
        payload = json.dumps({"type": msg_type, "data": data})
        try:
            loop = asyncio.get_running_loop()
            task = loop.create_task(safe_send(payload))
            pending_sends.add(task)
            task.add_done_callback(pending_sends.discard)
        except RuntimeError:
            pass

    try:
        agent = AgentLoop(emit=emit, job_store=job_store)
        await agent.run(job_id, job.repo_url, job.issue_text)
    except WebSocketDisconnect:
        job_store.update_job(job_id, status="failed", error="Client disconnected")
        logger.info("Client disconnected for job %s", job_id)
    except Exception as exc:
        logger.error("Unhandled error in job %s: %s", job_id, exc)
        try:
            await websocket.send_json({"type": "error", "data": {"message": str(exc)}})
        except Exception:
            pass
        job_store.update_job(job_id, status="failed", error=str(exc))
    finally:
        _active_jobs.discard(job_id)
        socket_closing = True
        try:
            if pending_sends:
                await asyncio.gather(*pending_sends, return_exceptions=True)
            await websocket.close()
        except Exception:
            pass


# ─── Entry point ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=not _is_production,
        log_level="info",
    )
