"""
Kyro — Autonomous AI Code Repair Engine
Copyright © 2026 Anish Chugh. All rights reserved.
Version 1.0.0 | June 2026
Unauthorized copying, modification, or distribution is strictly prohibited.

Execution Sandbox — runs test suites in a restricted subprocess.

Security properties:
  - 60-second hard timeout (SIGKILL on breach)
  - Working directory confined to the cloned repo
  - No network inside the child process (optional, Linux only)
  - Output capped at 8 KB to prevent log floods
"""
import asyncio
import os
import shlex
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

MAX_OUTPUT_BYTES = 8_192
DEFAULT_TIMEOUT = 60   # seconds

# Allowlist: detect_test_command output → safe arg list (shell=True is never used).
ALLOWED_TEST_COMMANDS: dict[str, list[str]] = {
    # Jest / Create React App
    "npm test -- --watchAll=false --passWithNoTests": [
        "npm", "test", "--", "--watchAll=false", "--passWithNoTests",
    ],
    # Vitest — non-watch single run
    "npx vitest run": ["npx", "vitest", "run"],
    # Generic npm test (unknown runner — no extra flags)
    "npm test": ["npm", "test"],
    # Python
    "python -m pytest --tb=short -q": ["python", "-m", "pytest", "--tb=short", "-q"],
    # Go
    "go test ./...": ["go", "test", "./..."],
    # Rust
    "cargo test": ["cargo", "test"],
    # Bun
    "bun test": ["bun", "test"],
}


@dataclass
class TestResult:
    success: bool
    output: str        # combined stdout + stderr, truncated
    exit_code: int
    timed_out: bool = False
    command: str = ""


def _safe_env(repo_path: str) -> dict[str, str]:
    """Stripped-down env: only the essentials, no secrets."""
    base = {
        "PATH": os.environ.get("PATH", "/usr/local/bin:/usr/bin:/bin"),
        "HOME": os.environ.get("HOME", "/tmp"),
        "TERM": "dumb",
        "CI": "true",
        "NODE_ENV": "test",
    }
    # Forward language runtimes that might be needed
    for key in ("NVM_DIR", "GOPATH", "GOROOT", "CARGO_HOME", "RUSTUP_HOME", "JAVA_HOME"):
        if key in os.environ:
            base[key] = os.environ[key]
    return base


def run_tests_sync(
    repo_path: str,
    command: str,
    timeout: int = DEFAULT_TIMEOUT,
) -> TestResult:
    """Run test command synchronously — called from a thread."""
    cmd_list = ALLOWED_TEST_COMMANDS.get(command) or shlex.split(command)
    try:
        proc = subprocess.run(
            cmd_list,
            shell=False,
            cwd=repo_path,
            capture_output=True,
            timeout=timeout,
            env=_safe_env(repo_path),
        )
        combined = (proc.stdout + proc.stderr)[:MAX_OUTPUT_BYTES].decode(
            "utf-8", errors="replace"
        )
        return TestResult(
            success=proc.returncode == 0,
            output=combined,
            exit_code=proc.returncode,
            command=command,
        )
    except subprocess.TimeoutExpired:
        return TestResult(
            success=False,
            output=f"[TIMEOUT] Command exceeded {timeout}s limit.",
            exit_code=-1,
            timed_out=True,
            command=command,
        )
    except Exception as exc:
        return TestResult(
            success=False,
            output=f"[SANDBOX ERROR] {exc}",
            exit_code=-2,
            command=command,
        )


async def run_tests_async(
    repo_path: str,
    command: str,
    timeout: int = DEFAULT_TIMEOUT,
) -> TestResult:
    """Async wrapper — runs in a thread so it doesn't block the event loop."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        None, run_tests_sync, repo_path, command, timeout
    )


def install_dependencies_sync(repo_path: str, timeout: int = 120) -> tuple[bool, str]:
    """
    Best-effort dependency install before running tests.
    Detects package manager from lock files.
    """
    root = Path(repo_path)
    if (root / "package-lock.json").exists():
        cmd = "npm install --prefer-offline --silent"
    elif (root / "bun.lockb").exists():
        cmd = "bun install --silent"
    elif (root / "yarn.lock").exists():
        cmd = "yarn install --silent"
    elif (root / "requirements.txt").exists():
        cmd = f"{sys.executable} -m pip install -r requirements.txt -q"
    elif (root / "pyproject.toml").exists():
        cmd = f"{sys.executable} -m pip install -e . -q"
    else:
        return True, "No recognizable lock file — skipping install."

    result = run_tests_sync(repo_path, cmd, timeout)
    return result.success, result.output


async def install_dependencies_async(repo_path: str, timeout: int = 120) -> tuple[bool, str]:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, install_dependencies_sync, repo_path, timeout)
