"""
Kyro — Autonomous AI Code Repair Engine
Copyright © 2026 Anish Chugh. All rights reserved.
Version 1.0.0 | June 2026
Unauthorized copying, modification, or distribution is strictly prohibited.

Diff Generator — produces a unified diff from original vs. fixed files
and converts it to the DiffFile format the frontend expects.
"""
from __future__ import annotations

import difflib
import re
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Tuple


@dataclass
class DiffLine:
    kind: str    # "add" | "del" | "ctx" | "hunk"
    content: str
    line_no: Optional[int] = None


@dataclass
class DiffFile:
    path: str
    lines: List[DiffLine]


def generate_unified_diff(
    original_content: str,
    new_content: str,
    file_path: str,
    context_lines: int = 3,
) -> str:
    """Return a standard unified diff string (like `git diff` output)."""
    original_lines = original_content.splitlines(keepends=True)
    new_lines = new_content.splitlines(keepends=True)
    diff = difflib.unified_diff(
        original_lines,
        new_lines,
        fromfile=f"a/{file_path}",
        tofile=f"b/{file_path}",
        n=context_lines,
    )
    return "".join(diff)


def parse_unified_diff(diff_str: str, file_path: str) -> DiffFile:
    """Convert a unified diff string into the frontend DiffFile schema."""
    lines: List[DiffLine] = []
    current_line_no: Optional[int] = None

    for raw in diff_str.splitlines():
        if raw.startswith("@@"):
            m = re.search(r"\+(\d+)", raw)
            current_line_no = int(m.group(1)) if m else None
            lines.append(DiffLine(kind="hunk", content=raw))
        elif raw.startswith("---") or raw.startswith("+++"):
            continue
        elif raw.startswith("+"):
            lines.append(DiffLine(kind="add", content=raw[1:]))
            if current_line_no is not None:
                current_line_no += 1
        elif raw.startswith("-"):
            lines.append(DiffLine(kind="del", content=raw[1:]))
        else:
            content = raw[1:] if raw.startswith(" ") else raw
            lines.append(DiffLine(kind="ctx", content=content, line_no=current_line_no))
            if current_line_no is not None:
                current_line_no += 1

    return DiffFile(path=file_path, lines=lines)


def build_diff_for_job(
    repo_path: str,
    fixes: List[dict],  # [{"file": str, "new_content": str}]
) -> Tuple[str, List[DiffFile]]:
    """
    Apply fixes and return:
      - full_diff: raw unified diff string (for the PR body)
      - diff_files: per-file DiffFile objects for the frontend
    """
    root = Path(repo_path)
    full_diff_parts: List[str] = []
    diff_files: List[DiffFile] = []

    for fix in fixes:
        rel_path = fix["file"]
        new_content: str = fix["new_content"]
        abs_path = root / rel_path

        try:
            original = abs_path.read_text(encoding="utf-8", errors="replace")
        except FileNotFoundError:
            original = ""

        udiff = generate_unified_diff(original, new_content, rel_path)
        if not udiff:
            continue

        full_diff_parts.append(udiff)
        diff_files.append(parse_unified_diff(udiff, rel_path))

        abs_path.parent.mkdir(parents=True, exist_ok=True)
        abs_path.write_text(new_content, encoding="utf-8")

    return "\n".join(full_diff_parts), diff_files
