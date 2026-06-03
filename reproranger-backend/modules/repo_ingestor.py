"""
Kyro — Autonomous AI Code Repair Engine
Copyright © 2026 Anish Chugh. All rights reserved.
Version 1.0.0 | June 2026
Unauthorized copying, modification, or distribution is strictly prohibited.

Repo Ingestor — clones a public GitHub repo and builds:
  1. A condensed codebase map (file tree + first-200-line excerpts)
  2. A visual city layout (nodes + edges) for the frontend
"""
import os
import re
import math
import shutil
import subprocess
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse
from dataclasses import dataclass, field

# ─── Allowed clone hosts — SSRF protection ────────────────────────────────────
_ALLOWED_CLONE_HOSTS = {"github.com", "gitlab.com", "bitbucket.org"}

REPO_BASE = Path("/tmp/reproranger/repos")

# Extensions we care about for analysis
CODE_EXTENSIONS = {
    ".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".rs",
    ".java", ".kt", ".rb", ".php", ".cs", ".cpp", ".c",
    ".swift", ".vue", ".svelte",
}
SKIP_DIRS = {
    "node_modules", ".git", "__pycache__", ".mypy_cache",
    "dist", "build", ".next", ".nuxt", "coverage", ".venv",
    "venv", "env", ".env", "vendor",
}


@dataclass
class FileEntry:
    path: str           # relative to repo root
    size_bytes: int
    line_count: int
    excerpt: str        # first 200 lines of content
    imports: list[str] = field(default_factory=list)


@dataclass
class CodebaseMap:
    repo_url: str
    repo_path: str
    file_tree: str          # human-readable tree
    files: list[FileEntry]  # indexed file entries
    total_files: int
    total_lines: int


@dataclass
class RepoNode:
    id: str
    label: str
    x: float
    z: float
    height: int
    status: str = "neutral"


@dataclass
class RepoEdge:
    id: str
    from_id: str
    to_id: str
    active: bool = False


def validate_repo_url(url: str) -> bool:
    """
    Returns True only if the URL is a safe, allowlisted HTTPS repo URL.
    Prevents SSRF, local file access, and shell-injection vectors.
    """
    try:
        url = url.strip()
        if re.search(r"[;&|`$<>()\\\x00-\x1f]", url):
            return False
        normalized = _normalize_github_url(url)
        parsed = urlparse(normalized)
        if parsed.scheme != "https":
            return False
        host = parsed.netloc.split(":")[0].lower()
        if host not in _ALLOWED_CLONE_HOSTS:
            return False
        parts = [p for p in parsed.path.strip("/").replace(".git", "").split("/") if p]
        if len(parts) < 2:
            return False
        return True
    except Exception:
        return False


def safe_read_file(base_path: Path, rel_path: str) -> Optional[str]:
    """
    Read a file that must stay inside base_path.
    Returns None on any error so callers can skip without inspecting content.
    Prevents path traversal (../../etc/passwd), caps file size at 500 KB.
    """
    try:
        full_path = (base_path / rel_path).resolve()
        if not str(full_path).startswith(str(base_path.resolve())):
            return None  # path traversal attempt
        size = full_path.stat().st_size
        if size > 500_000:
            return None  # too large to analyze
        return full_path.read_text(encoding="utf-8", errors="replace")
    except (PermissionError, FileNotFoundError, OSError):
        return None


def _normalize_github_url(url: str) -> str:
    url = url.strip().rstrip("/")
    if url.startswith("github.com/"):
        url = "https://" + url
    if not url.startswith("http"):
        url = "https://github.com/" + url
    if not url.endswith(".git"):
        url += ".git"
    return url


def clone_repo(repo_url: str, job_id: str) -> str:
    """Clone repo to /tmp/reproranger/repos/<job_id>. Returns local path."""
    normalized = _normalize_github_url(repo_url)
    dest = REPO_BASE / job_id
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True, exist_ok=True)

    env = os.environ.copy()
    github_token = os.getenv("GITHUB_TOKEN")
    if github_token:
        normalized = normalized.replace(
            "https://github.com/", f"https://{github_token}@github.com/"
        )

    result = subprocess.run(
        ["git", "clone", "--depth=1", "--single-branch", normalized, str(dest)],
        capture_output=True,
        text=True,
        timeout=120,
        env=env,
    )
    if result.returncode != 0:
        raise RuntimeError(f"git clone failed: {result.stderr.strip()}")

    return str(dest)


def _extract_imports(content: str, extension: str) -> list[str]:
    """Extract imported file paths from source code (best-effort)."""
    imports: list[str] = []
    if extension in {".ts", ".tsx", ".js", ".jsx"}:
        # ES import: import ... from './path'
        for m in re.finditer(r"""from\s+['"]([^'"]+)['"]""", content):
            imports.append(m.group(1))
        # require('./path')
        for m in re.finditer(r"""require\(['"]([^'"]+)['"]\)""", content):
            imports.append(m.group(1))
    elif extension == ".py":
        for m in re.finditer(r"^(?:from|import)\s+([\w.]+)", content, re.MULTILINE):
            imports.append(m.group(1))
    elif extension == ".go":
        for m in re.finditer(r'"([^"]+)"', content):
            imports.append(m.group(1))
    return imports[:20]  # cap per file


def build_codebase_map(repo_path: str) -> CodebaseMap:
    """Walk the repo and build the codebase map."""
    root = Path(repo_path)
    files: list[FileEntry] = []
    tree_lines: list[str] = []

    for dirpath, dirnames, filenames in os.walk(root):
        # Prune skip dirs in-place
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        rel_dir = Path(dirpath).relative_to(root)
        depth = len(rel_dir.parts)
        indent = "  " * depth
        folder_name = rel_dir.name or root.name
        tree_lines.append(f"{indent}{folder_name}/")

        for fname in sorted(filenames):
            fpath = Path(dirpath) / fname
            ext = fpath.suffix.lower()
            rel_path = str(fpath.relative_to(root))
            tree_lines.append(f"{indent}  {fname}")

            if ext not in CODE_EXTENSIONS:
                continue
            raw = safe_read_file(root, rel_path)
            if raw is None:
                continue

            lines = raw.splitlines()
            excerpt = "\n".join(lines[:200])
            imports = _extract_imports(raw, ext)
            files.append(FileEntry(
                path=rel_path,
                size_bytes=fpath.stat().st_size,
                line_count=len(lines),
                excerpt=excerpt,
                imports=imports,
            ))

    file_tree = "\n".join(tree_lines[:300])  # cap tree output
    total_lines = sum(f.line_count for f in files)

    return CodebaseMap(
        repo_url="",
        repo_path=repo_path,
        file_tree=file_tree,
        files=files,
        total_files=len(files),
        total_lines=total_lines,
    )


def build_city_layout(cmap: CodebaseMap) -> tuple[list[RepoNode], list[RepoEdge]]:
    """
    Convert the codebase map into a Repo City for the 3D frontend.

    Strategy:
    - Group files by top-level directory → "districts"
    - Lay out districts on a grid, files within each district clustered together
    - Building height ∝ log(line_count)
    """
    if not cmap.files:
        return [], []

    # Group by first directory component
    districts: dict[str, list[FileEntry]] = {}
    for f in cmap.files:
        parts = Path(f.path).parts
        district = parts[0] if len(parts) > 1 else "root"
        districts.setdefault(district, []).append(f)

    nodes: list[RepoNode] = []
    edges: list[RepoEdge] = []
    path_to_id: dict[str, str] = {}

    district_list = sorted(districts.items(), key=lambda kv: -len(kv[1]))
    districts_per_row = math.ceil(math.sqrt(len(district_list)))

    node_idx = 0
    for d_idx, (district_name, district_files) in enumerate(district_list):
        d_row = d_idx // districts_per_row
        d_col = d_idx % districts_per_row
        # Each district occupies a 4×4 block
        base_x = d_col * 4 - (districts_per_row * 2)
        base_z = d_row * 4 - (len(district_list) // districts_per_row * 2)

        files_per_row = math.ceil(math.sqrt(len(district_files)))
        for f_idx, f in enumerate(district_files[:40]):  # cap per district
            f_row = f_idx // files_per_row
            f_col = f_idx % files_per_row
            x = base_x + f_col * 0.9
            z = base_z + f_row * 0.9
            # Height: log scale capped at 8
            height = max(1, min(8, round(math.log1p(f.line_count / 50))))
            node_id = f"n{node_idx}"
            nodes.append(RepoNode(
                id=node_id,
                label=f.path,
                x=round(x, 2),
                z=round(z, 2),
                height=height,
            ))
            path_to_id[f.path] = node_id
            node_idx += 1

    # Build edges from import relationships
    edge_idx = 0
    seen: set[tuple[str, str]] = set()
    for f in cmap.files:
        src_id = path_to_id.get(f.path)
        if not src_id:
            continue
        for imp in f.imports:
            # Resolve relative imports to a real path
            imp_clean = imp.lstrip("./").split("?")[0]
            for candidate_path, tgt_id in path_to_id.items():
                if imp_clean and (
                    candidate_path.endswith(imp_clean)
                    or candidate_path.replace("/", ".").endswith(imp_clean)
                ):
                    pair = (src_id, tgt_id)
                    if pair not in seen and src_id != tgt_id:
                        edges.append(RepoEdge(
                            id=f"e{edge_idx}",
                            from_id=src_id,
                            to_id=tgt_id,
                        ))
                        seen.add(pair)
                        edge_idx += 1
                        if edge_idx >= 200:
                            break

    return nodes, edges


def detect_test_command(repo_path: str) -> Optional[str]:
    """
    Detect the CI-safe test command for the repo.
    Respects the actual test runner so framework-specific flags never bleed across.
    """
    import json as _json

    root = Path(repo_path)

    if (root / "package.json").exists():
        try:
            pkg = _json.loads((root / "package.json").read_text())
            scripts = pkg.get("scripts", {})
            test_script = scripts.get("test", "").lower()
            all_deps = {
                **pkg.get("dependencies", {}),
                **pkg.get("devDependencies", {}),
            }
            uses_vitest = "vitest" in test_script or "vitest" in all_deps
            uses_jest = (
                "jest" in test_script
                or "react-scripts" in test_script
                or "jest" in all_deps
                or "react-scripts" in all_deps
            )
            if uses_vitest:
                return "npx vitest run"
            if uses_jest:
                return "npm test -- --watchAll=false --passWithNoTests"
            if "test" in scripts:
                # Unknown runner — run as-is without extra flags that might break it
                return "npm test"
        except Exception:
            pass
        return None  # Cannot safely determine runner — skip tests

    if (
        (root / "pytest.ini").exists()
        or (root / "setup.cfg").exists()
        or (root / "setup.py").exists()
        or (root / "pyproject.toml").exists()
    ):
        return "python -m pytest --tb=short -q"

    if (root / "go.mod").exists():
        return "go test ./..."

    if (root / "Cargo.toml").exists():
        return "cargo test"

    return None


def cleanup_repo(job_id: str):
    """Remove cloned repo from disk after job completes."""
    dest = REPO_BASE / job_id
    if dest.exists():
        shutil.rmtree(dest, ignore_errors=True)
