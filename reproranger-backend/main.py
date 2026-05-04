"""
Kyro Backend — FastAPI server
  POST /api/analyze       → creates a job, returns { jobId }
  WS   /ws/{job_id}       → streams agent events in real-time
  GET  /api/jobs/{job_id} → inspect job status
  GET  /health            → liveness check
"""
import asyncio
import json
import os
from contextlib import asynccontextmanager
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator

from modules.agent_loop import AgentLoop
from modules.job_store import JobStore
from utils.rate_limiter import RateLimiter

load_dotenv()

# ─── Singletons ───────────────────────────────────────────────────────────────
job_store = JobStore()
rate_limiter = RateLimiter(
    max_requests=int(os.getenv("RATE_LIMIT_PER_MINUTE", "10")),
    window_seconds=60,
)
_active_jobs: set[str] = set()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="Kyro API",
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
configured_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://localhost:4173",
).split(",")

allowed_origins = [o.strip() for o in configured_origins if o.strip()]
allow_origin_regex = os.getenv(
    "ALLOWED_ORIGIN_REGEX",
    r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Request / Response schemas ───────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    repo_url: str
    issue_text: str = ""

    @field_validator("repo_url")
    @classmethod
    def validate_repo_url(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("repo_url is required")
        return v

    @field_validator("issue_text")
    @classmethod
    def validate_issue_text(cls, v: str) -> str:
        v = v.strip()
        if len(v) > 8000:
            raise ValueError("issue_text must be under 8000 characters")
        return v


# ─── REST endpoints ───────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "active_jobs": len(_active_jobs)}


@app.post("/api/analyze", status_code=201)
async def create_analyze_job(body: AnalyzeRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    if not rate_limiter.is_allowed(client_ip):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Try again in a minute.",
        )
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=503,
            detail="OPENAI_API_KEY is not configured on the server.",
        )
    job_id = job_store.create_job(body.repo_url, body.issue_text)
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

    async def safe_send(payload: str):
        try:
            await websocket.send_text(payload)
        except Exception:
            pass

    def emit(msg_type: str, data: dict):
        """Synchronous emitter — schedules send on the event loop."""
        nonlocal socket_closing
        if socket_closing:
            return
        payload = json.dumps({"type": msg_type, "data": data})
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                task = loop.create_task(safe_send(payload))
                pending_sends.add(task)
                task.add_done_callback(pending_sends.discard)
        except Exception:
            pass

    try:
        agent = AgentLoop(emit=emit, job_store=job_store)
        await agent.run(job_id, job.repo_url, job.issue_text)
    except WebSocketDisconnect:
        job_store.update_job(job_id, status="failed", error="Client disconnected")
    except Exception as exc:
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
        reload=True,
        log_level="info",
    )
