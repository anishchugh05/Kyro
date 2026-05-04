"""SQLite-backed job store — tracks every analysis run."""
import sqlite3
import uuid
import json
from datetime import datetime
from pathlib import Path
from typing import Optional
from dataclasses import dataclass, field

DB_PATH = Path("/tmp/reproranger/jobs.db")


@dataclass
class Job:
    id: str
    repo_url: str
    issue_text: str
    status: str          # pending | running | success | failed
    created_at: str
    updated_at: str
    repo_path: Optional[str] = None
    diff_output: Optional[str] = None
    error: Optional[str] = None
    metadata: dict = field(default_factory=dict)


class JobStore:
    def __init__(self):
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._init_schema()

    def _init_schema(self):
        self._conn.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                id          TEXT PRIMARY KEY,
                repo_url    TEXT NOT NULL,
                issue_text  TEXT NOT NULL,
                status      TEXT NOT NULL DEFAULT 'pending',
                created_at  TEXT NOT NULL,
                updated_at  TEXT NOT NULL,
                repo_path   TEXT,
                diff_output TEXT,
                error       TEXT,
                metadata    TEXT DEFAULT '{}'
            )
        """)
        self._conn.commit()

    def create_job(self, repo_url: str, issue_text: str) -> str:
        job_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        self._conn.execute(
            "INSERT INTO jobs VALUES (?,?,?,?,?,?,?,?,?,?)",
            (job_id, repo_url, issue_text, "pending", now, now, None, None, None, "{}"),
        )
        self._conn.commit()
        return job_id

    def get_job(self, job_id: str) -> Optional[Job]:
        row = self._conn.execute(
            "SELECT * FROM jobs WHERE id=?", (job_id,)
        ).fetchone()
        if not row:
            return None
        return Job(
            id=row["id"],
            repo_url=row["repo_url"],
            issue_text=row["issue_text"],
            status=row["status"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            repo_path=row["repo_path"],
            diff_output=row["diff_output"],
            error=row["error"],
            metadata=json.loads(row["metadata"] or "{}"),
        )

    def update_job(self, job_id: str, **fields):
        allowed = {"status", "repo_path", "diff_output", "error", "metadata"}
        updates = {k: v for k, v in fields.items() if k in allowed}
        if not updates:
            return
        if "metadata" in updates:
            updates["metadata"] = json.dumps(updates["metadata"])
        updates["updated_at"] = datetime.utcnow().isoformat()
        set_clause = ", ".join(f"{k}=?" for k in updates)
        values = list(updates.values()) + [job_id]
        self._conn.execute(f"UPDATE jobs SET {set_clause} WHERE id=?", values)
        self._conn.commit()
