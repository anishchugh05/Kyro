"""
The Agent Loop — the autonomous brain of Kyro.

Phases:
  A. Locator   — identifies which files contain the bug
  B. Fixer     — rewrites those files to fix the bug
  C. Validator — runs tests; if they fail, loops back to Fixer (max 3 attempts)

All events are streamed to the WebSocket via `emit`.
"""
from __future__ import annotations

import asyncio
import json
import os
import re
from typing import Callable, Any, Optional

from openai import OpenAI

from modules.repo_ingestor import (
    CodebaseMap, RepoNode, RepoEdge,
    build_codebase_map, build_city_layout,
    clone_repo, detect_test_command, cleanup_repo,
)
from modules.file_ranker import rank_files, format_ranked_for_prompt
from modules.sandbox import run_tests_async, install_dependencies_async
from modules.diff_generator import build_diff_for_job, DiffFile
from modules.job_store import JobStore
from modules.github_pr import create_pull_request_sync, build_pr_body

MODEL = os.getenv("OPENAI_MODEL", "gpt-5.2")
MAX_FIX_ATTEMPTS = 3

# Callable type: emit(type, data) -> None
Emitter = Callable[[str, dict], Any]


class AgentLoop:
    def __init__(self, emit: Emitter, job_store: JobStore):
        self._emit = emit
        self._job_store = job_store
        self._client = OpenAI(
            api_key=os.environ.get("OPENAI_API_KEY", ""),
            timeout=float(os.getenv("OPENAI_TIMEOUT_SECONDS", "90")),
        )

    def _log(self, level: str, message: str):
        self._emit("log", {"level": level, "message": message})

    def _set_phase(self, phase: str):
        self._emit("phase", {"phase": phase})

    def _set_progress(self, value: float):
        self._emit("progress", {"value": round(value, 2)})

    def _push_nodes(self, nodes: list[RepoNode], edges: list[RepoEdge]):
        self._emit("nodes", {
            "nodes": [_node_to_dict(n) for n in nodes],
            "edges": [_edge_to_dict(e) for e in edges],
        })

    def _generate_json(self, system_prompt: str, user_msg: str, max_completion_tokens: int) -> str:
        response = self._client.chat.completions.create(
            model=MODEL,
            response_format={"type": "json_object"},
            messages=[
                {"role": "developer", "content": system_prompt},
                {"role": "user", "content": user_msg},
            ],
            max_completion_tokens=max_completion_tokens,
        )
        content = response.choices[0].message.content or ""
        return content.strip()

    def _generate_text(self, system_prompt: str, user_msg: str, max_completion_tokens: int) -> str:
        """Plain-text generation — no JSON mode, so code in the response won't corrupt the output."""
        response = self._client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "developer", "content": system_prompt},
                {"role": "user", "content": user_msg},
            ],
            max_completion_tokens=max_completion_tokens,
        )
        content = response.choices[0].message.content or ""
        return content.strip()

    def _mark_node(
        self, nodes: list[RepoNode], edges: list[RepoEdge],
        node_id: str, status: str,
    ) -> list[RepoNode]:
        updated = [
            RepoNode(**{**n.__dict__, "status": status}) if n.id == node_id else n
            for n in nodes
        ]
        self._push_nodes(updated, edges)
        return updated

    # -------------------------------------------------------------------------
    # Phase A: Locator
    # -------------------------------------------------------------------------
    def _run_locator(
        self,
        cmap: CodebaseMap,
        ranked_excerpt: str,
        issue_text: str,
        file_tree: str,
    ) -> list[dict]:
        """Call the LLM to identify target files. Returns list of {file, reason}."""
        system_prompt = (
            "You are an expert software engineer performing a code audit. "
            "Analyze the codebase map and issue, then identify the 2-5 files most likely "
            "containing the bug. Be precise — only list files that genuinely need changes.\n\n"
            f"FILE TREE:\n{file_tree[:3000]}\n\n"
            f"CANDIDATE FILES (ranked by relevance):\n{ranked_excerpt}"
        )
        user_msg = (
            f"GitHub Issue:\n{issue_text}\n\n"
            "Respond with ONLY a JSON object (no markdown, no explanation):\n"
            '{"targets": [{"file": "relative/path.ext", "reason": "one-sentence explanation"}]}\n'
            "If you do not find a credible high-impact bug or reliability issue, return "
            '{"targets": []}.'
        )
        raw = self._generate_json(system_prompt, user_msg, max_completion_tokens=2048)
        # Strip markdown fences if present
        if raw.startswith("```"):
            raw = "\n".join(raw.split("\n")[1:])
            raw = raw.rstrip("`").strip()
        return json.loads(raw).get("targets", [])

    # -------------------------------------------------------------------------
    # Phase B: Fixer
    # -------------------------------------------------------------------------
    def _run_fixer(
        self,
        issue_text: str,
        target_files: list[dict],
        cmap: CodebaseMap,
        repo_path: str,
        previous_error: Optional[str] = None,
        attempt: int = 1,
    ) -> list[dict]:
        """
        Fix ONE file per call using a delimiter-based format instead of JSON.
        Embedding code inside JSON strings breaks when the code contains quotes/
        backslashes/newlines — the delimiter format avoids this entirely.

        Strategy by file size:
          ≤ 200 lines → request full corrected content  (max 2000 output tokens)
          > 200 lines → request a search/replace patch  (max 1000 output tokens)
        """
        from pathlib import Path

        primary = target_files[0]
        file_path = primary["file"]
        abs_path = Path(repo_path) / file_path

        try:
            original_content = abs_path.read_text(encoding="utf-8", errors="replace")
        except FileNotFoundError:
            path_to_entry = {f.path: f for f in cmap.files}
            entry = path_to_entry.get(file_path)
            original_content = entry.excerpt if entry else ""

        line_count = len(original_content.splitlines())

        correction_note = ""
        if previous_error:
            correction_note = (
                f"\n\nATTEMPT {attempt}/{MAX_FIX_ATTEMPTS} — previous fix failed tests:\n"
                f"{previous_error[:800]}\n\nFix the test failures AND the original issue."
            )

        if line_count <= 200:
            # ── Small file: full corrected content ──────────────────────────
            system_prompt = (
                "You are an expert software engineer. "
                "Return the corrected file in this EXACT format — no JSON, no markdown fences:\n\n"
                "FILE: path/to/file\n"
                "EXPLANATION: one-sentence summary of the change\n"
                "---BEGIN FILE---\n"
                "(complete corrected file content)\n"
                "---END FILE---"
            )
            user_msg = (
                f"Issue: {issue_text}\n"
                f"Why this file: {primary.get('reason', '')}\n\n"
                f"=== {file_path} ({line_count} lines) ===\n{original_content}"
                f"{correction_note}"
            )
            raw = self._generate_text(system_prompt, user_msg, max_completion_tokens=2000)
            result = _parse_file_response(raw, file_path)
            if result is None:
                self._log("error", f"Could not parse fixer response for {file_path}; skipping.")
                return []
            return [result]

        else:
            # ── Large file: targeted search/replace patch ────────────────────
            excerpt = "\n".join(original_content.splitlines()[:200])
            system_prompt = (
                "You are an expert software engineer. Fix the bug using a minimal search/replace patch.\n"
                "Rules:\n"
                "  - SEARCH must be an EXACT verbatim substring of the file (copy character-for-character)\n"
                "  - REPLACE is only the corrected version of that block\n"
                "  - Leave SEARCH empty if you need a full-file rewrite\n"
                "Return in this EXACT format — no JSON, no markdown fences:\n\n"
                "FILE: path/to/file\n"
                "EXPLANATION: one-sentence summary\n"
                "---BEGIN SEARCH---\n"
                "(verbatim block to replace, or leave empty for full rewrite)\n"
                "---END SEARCH---\n"
                "---BEGIN REPLACE---\n"
                "(corrected replacement block)\n"
                "---END REPLACE---"
            )
            user_msg = (
                f"Issue: {issue_text}\n"
                f"Why this file: {primary.get('reason', '')}\n\n"
                f"=== {file_path} (first 200 of {line_count} lines) ===\n{excerpt}"
                f"{correction_note}"
            )
            raw = self._generate_text(system_prompt, user_msg, max_completion_tokens=1000)
            result = _parse_patch_response(raw, file_path, original_content, self._log)
            if result is None:
                self._log("error", f"Could not parse patch response for {file_path}; skipping.")
                return []
            return [result]

    # -------------------------------------------------------------------------
    # Main orchestration
    # -------------------------------------------------------------------------
    async def run(self, job_id: str, repo_url: str, issue_text: str):
        """Full agentic pipeline — streams events to the connected WebSocket."""
        try:
            await self._pipeline(job_id, repo_url, issue_text)
        except Exception as exc:
            self._job_store.update_job(job_id, status="failed", error=str(exc))
            self._emit("error", {"message": str(exc)})
            self._emit("phase", {"phase": "idle"})

    async def _pipeline(self, job_id: str, repo_url: str, issue_text: str):
        loop = asyncio.get_event_loop()
        analysis_brief = _build_analysis_brief(issue_text)

        # ── Assembly: clone ────────────────────────────────────────────────
        self._set_phase("assembly")
        self._set_progress(0.05)
        self._log("info", f"Cloning repository: {repo_url}")
        self._job_store.update_job(job_id, status="running")

        repo_path = await loop.run_in_executor(None, clone_repo, repo_url, job_id)
        self._job_store.update_job(job_id, repo_path=repo_path)
        self._log("info", "Clone complete. Indexing codebase...")
        self._set_progress(0.15)

        cmap: CodebaseMap = await loop.run_in_executor(None, build_codebase_map, repo_path)
        self._log("info", f"Indexed {cmap.total_files} files ({cmap.total_lines:,} lines).")
        self._log("thought", "Building dependency graph & spatial layout...")
        self._set_progress(0.25)

        nodes, edges = await loop.run_in_executor(None, build_city_layout, cmap)
        self._push_nodes(nodes, edges)
        self._log("action", f"Repo City assembled — {len(nodes)} buildings, {len(edges)} streets.")
        self._set_progress(0.30)

        # ── Exploring: rank files ─────────────────────────────────────────
        self._set_phase("exploring")
        self._log("thought", "Scanning the repository and ranking files by risk and relevance...")
        ranked = await loop.run_in_executor(None, rank_files, cmap, analysis_brief, 8)
        self._log("info", f"Top candidates: {', '.join(r.path for r in ranked[:4])}")
        self._set_progress(0.35)

        # Mark candidates as "warning" on the city
        path_to_node: dict[str, str] = {n.label: n.id for n in nodes}
        for r in ranked[:5]:
            nid = path_to_node.get(r.path)
            if nid:
                nodes = self._mark_node(nodes, edges, nid, "warning")
        self._set_progress(0.40)

        # ── Phase A: Locator ─────────────────────────────────────────────
        self._set_phase("targeting")
        self._log("action", "LLM Locator agent activated — identifying root-cause files...")
        ranked_excerpt = format_ranked_for_prompt(ranked, max_chars_per_file=1000)
        self._log("info", f"Sending {max(len(ranked), 1)} candidate file(s) to the locator model...")
        target_files: list[dict] = []
        try:
            target_files = await loop.run_in_executor(
                None, self._run_locator,
                cmap, ranked_excerpt, analysis_brief, cmap.file_tree,
            )
            target_files = _normalize_target_files(target_files)
            self._log("info", "Locator model response received.")
        except Exception as exc:
            self._log("error", f"Locator model failed: {exc}")
            self._log("info", "Continuing with heuristic target selection.")
        if not target_files:
            target_files = _heuristic_targets_from_ranked(ranked)
            if target_files:
                self._log("info", "Falling back to heuristic target selection from ranked files.")
        self._log("success", f"Locator identified {len(target_files)} target file(s).")
        self._set_progress(0.50)

        if not target_files:
            self._emit("issue", {
                "id": f"issue-{job_id[:8]}",
                "title": "No problems found",
                "body": (
                    "Kyro completed a repository-wide audit and did not find a clear, "
                    "high-confidence bug or reliability issue worth patching automatically."
                ),
                "labels": ["audit", "clean"],
                "targetNodeId": None,
            })
            self._log("success", "No clear problems found in the repository.")
            self._set_phase("complete")
            self._set_progress(1.0)
            self._job_store.update_job(job_id, status="success", diff_output="")
            self._emit("done", {"jobId": job_id, "diff": ""})
            await loop.run_in_executor(None, cleanup_repo, job_id)
            return

        # Focus the first target node
        primary_path = target_files[0]["file"] if target_files else None
        primary_node_id = path_to_node.get(primary_path or "")
        if primary_node_id:
            nodes = self._mark_node(nodes, edges, primary_node_id, "buggy")
            self._emit("focus", {"nodeId": primary_node_id})
            # Activate edges connected to this node
            active_edges = [
                RepoEdge(id=e.id, from_id=e.from_id, to_id=e.to_id, active=(e.from_id == primary_node_id or e.to_id == primary_node_id))
                for e in edges
            ]
            edges = active_edges
            self._push_nodes(nodes, edges)

        # Emit issue context to frontend
        self._emit("issue", {
            "id": f"issue-{job_id[:8]}",
            "title": _extract_issue_title(analysis_brief),
            "body": analysis_brief[:800],
            "labels": _guess_labels(analysis_brief),
            "targetNodeId": primary_node_id,
        })

        for t in target_files:
            self._log("thought", f"Target: {t['file']} — {t['reason']}")
        self._set_progress(0.55)

        # ── Phase B + C: Fix + Validate loop ──────────────────────────────
        self._set_phase("repairing")
        self._log("action", "LLM Fixer agent engaged — generating patch...")

        test_cmd = await loop.run_in_executor(None, detect_test_command, repo_path)
        fixes: list[dict] = []
        test_error: Optional[str] = None

        for attempt in range(1, MAX_FIX_ATTEMPTS + 1):
            if attempt > 1:
                self._log("action", f"Self-correction loop — attempt {attempt}/{MAX_FIX_ATTEMPTS}...")
            try:
                fixes = await loop.run_in_executor(
                    None, self._run_fixer,
                    analysis_brief, target_files, cmap, repo_path, test_error, attempt,
                )
            except Exception as exc:
                self._log("error", f"Fixer model failed: {exc}")
                if attempt == MAX_FIX_ATTEMPTS:
                    raise
                test_error = f"Model failure during fixer step: {exc}"
                continue

            for fix in fixes:
                self._log("info", f"Patching {fix['file']}: {fix.get('explanation', '')[:120]}")
            self._set_progress(0.60 + attempt * 0.05)

            # Write fixes + generate diff
            full_diff, diff_files = await loop.run_in_executor(
                None, build_diff_for_job, repo_path, fixes,
            )

            # Stream the first diff file to the frontend
            if diff_files:
                primary_diff = diff_files[0]
                self._emit("diff", {
                    "path": primary_diff.path,
                    "lines": [_diff_line_to_dict(l) for l in primary_diff.lines],
                })

            # Validate
            if test_cmd:
                self._log("action", f"Installing dependencies...")
                _, install_log = await install_dependencies_async(repo_path)

                self._log("action", f"Running: {test_cmd}")
                result = await run_tests_async(repo_path, test_cmd, timeout=90)
                if result.success:
                    self._log("success", f"All tests pass! ({test_cmd})")
                    test_error = None
                    break
                else:
                    test_error = result.output
                    self._log("error", f"Tests failed (attempt {attempt}):\n{result.output[:400]}")
                    if attempt == MAX_FIX_ATTEMPTS:
                        self._log("error", "Max correction attempts reached. Proceeding with best patch.")
            else:
                self._log("info", "No test suite detected — skipping validation.")
                test_error = None
                break

        self._set_progress(0.90)

        # ── Complete ─────────────────────────────────────────────────────
        self._set_phase("complete")
        if primary_node_id:
            nodes = self._mark_node(nodes, edges, primary_node_id, "fixed")

        pr_title = f"fix: {_extract_issue_title(analysis_brief)[:60]}"
        self._log("success", f"Diff covers {len(fixes)} file(s). Ready for review.")
        self._set_progress(0.95)

        # ── Open a real GitHub PR ─────────────────────────────────────────
        github_token = os.environ.get("GITHUB_TOKEN", "")
        pr_url: Optional[str] = None
        pr_number: Optional[int] = None

        if github_token and fixes:
            self._log("action", "Opening Pull Request on GitHub...")
            import re as _re
            safe_suffix = _re.sub(r"[^a-z0-9-]", "-", pr_title.lower())[:40].strip("-")
            branch_name = f"kyro/{safe_suffix}-{job_id[:8]}"
            pr_body = build_pr_body(analysis_brief, fixes, full_diff)
            try:
                pr_result = await loop.run_in_executor(
                    None,
                    create_pull_request_sync,
                    repo_url, github_token, fixes, branch_name, pr_title, pr_body,
                )
                pr_url = pr_result.url
                pr_number = pr_result.number
                self._log("success", f"PR #{pr_result.number} opened → {pr_result.url}")
                # Update the issue panel with the real PR link
                self._emit("issue_url", {"url": pr_url, "number": pr_number})
            except Exception as exc:
                self._log("error", f"GitHub PR creation failed: {exc}")
                self._log("info", "Diff is still available in the panel for manual review.")
        else:
            if not github_token:
                self._log("info", "GITHUB_TOKEN not set — skipping PR creation. Diff is ready for manual review.")
            self._log("success", f'PR proposal ready: "{pr_title}"')

        self._set_progress(1.0)
        self._job_store.update_job(
            job_id,
            status="success",
            diff_output=full_diff if fixes else "",
        )
        self._emit("done", {
            "jobId": job_id,
            "prTitle": pr_title,
            "prUrl": pr_url,
            "prNumber": pr_number,
            "diff": full_diff,
        })

        # Purge cloned repo
        await loop.run_in_executor(None, cleanup_repo, job_id)


# ─── Patch helpers ───────────────────────────────────────────────────────────

def _strip_fences(raw: str) -> str:
    """Remove markdown code fences that some models add despite instructions."""
    raw = raw.strip()
    if raw.startswith("```"):
        lines = raw.splitlines()
        raw = "\n".join(lines[1:])
        raw = raw.rstrip("`").rstrip()
    return raw


def _fuzzy_patch(original: str, search: str, replace: str):
    """
    Fallback when `search` doesn't match verbatim.
    Tries matching after stripping leading whitespace from every line.
    Returns the patched string, or None if no match found.
    """
    orig_lines = original.splitlines()
    search_lines = search.splitlines()
    n = len(search_lines)
    norm_search = [l.strip() for l in search_lines]

    for i in range(len(orig_lines) - n + 1):
        window = [l.strip() for l in orig_lines[i:i + n]]
        if window == norm_search:
            new_lines = orig_lines[:i] + replace.splitlines() + orig_lines[i + n:]
            return "\n".join(new_lines)
    return None


def _parse_file_response(raw: str, fallback_path: str) -> Optional[dict]:
    """Parse the delimiter-based full-file response the fixer returns."""
    file_match = re.search(r"^FILE:\s*(.+)$", raw, re.MULTILINE)
    file_path = file_match.group(1).strip() if file_match else fallback_path
    explanation_match = re.search(r"^EXPLANATION:\s*(.+)$", raw, re.MULTILINE)
    explanation = explanation_match.group(1).strip() if explanation_match else ""
    begin = raw.find("---BEGIN FILE---")
    end = raw.find("---END FILE---")
    if begin == -1 or end == -1:
        return None
    new_content = raw[begin + len("---BEGIN FILE---"):end].lstrip("\n").rstrip("\n")
    return {"file": file_path, "new_content": new_content, "explanation": explanation}


def _parse_patch_response(raw: str, fallback_path: str, original_content: str, log_fn: Callable) -> Optional[dict]:
    """Parse the delimiter-based search/replace response the fixer returns."""
    file_match = re.search(r"^FILE:\s*(.+)$", raw, re.MULTILINE)
    file_path = file_match.group(1).strip() if file_match else fallback_path
    explanation_match = re.search(r"^EXPLANATION:\s*(.+)$", raw, re.MULTILINE)
    explanation = explanation_match.group(1).strip() if explanation_match else ""
    search_begin = raw.find("---BEGIN SEARCH---")
    search_end = raw.find("---END SEARCH---")
    replace_begin = raw.find("---BEGIN REPLACE---")
    replace_end = raw.find("---END REPLACE---")
    if replace_begin == -1 or replace_end == -1:
        return None
    search = (
        raw[search_begin + len("---BEGIN SEARCH---"):search_end].lstrip("\n").rstrip("\n")
        if search_begin != -1 and search_end != -1
        else ""
    )
    replace = raw[replace_begin + len("---BEGIN REPLACE---"):replace_end].lstrip("\n").rstrip("\n")
    if not search:
        new_content = replace
    elif search in original_content:
        new_content = original_content.replace(search, replace, 1)
    else:
        new_content = _fuzzy_patch(original_content, search, replace)
        if new_content is None:
            log_fn("error", f"Patch search string not found in {file_path}; skipping.")
            return None
    return {"file": file_path, "new_content": new_content, "explanation": explanation}


# ─── Serialisation helpers ────────────────────────────────────────────────────

def _node_to_dict(n: RepoNode) -> dict:
    return {"id": n.id, "label": n.label, "x": n.x, "z": n.z, "height": n.height, "status": n.status}


def _edge_to_dict(e: RepoEdge) -> dict:
    return {"id": e.id, "from": e.from_id, "to": e.to_id, "active": e.active}


def _diff_line_to_dict(l) -> dict:
    d = {"kind": l.kind, "content": l.content}
    if l.line_no is not None:
        d["lineNo"] = l.line_no
    return d


def _extract_issue_title(issue_text: str) -> str:
    """Use the first non-empty line as the issue title."""
    for line in issue_text.strip().splitlines():
        line = line.strip()
        if line:
            return line[:80]
    return "Bug fix"


def _build_analysis_brief(issue_text: str) -> str:
    if issue_text.strip():
        return issue_text.strip()
    return (
        "Repository-wide audit.\n"
        "Analyze this codebase without a user-provided bug report. Identify the most important "
        "bug, correctness risk, or reliability issue visible from the repository itself. Focus on "
        "high-impact files, explain the likely root cause, and propose the best fix."
    )


def _normalize_target_files(target_files: list[dict]) -> list[dict]:
    normalized: list[dict] = []
    for target in target_files:
        path = str(target.get("file", "")).strip()
        reason = str(target.get("reason", "")).strip()
        if not path:
            continue
        normalized.append(
            {
                "file": path,
                "reason": reason or "Selected from repository audit signals.",
            }
        )
    return normalized[:5]


def _heuristic_targets_from_ranked(ranked) -> list[dict]:
    fallback: list[dict] = []
    for candidate in ranked[:3]:
        fallback.append(
            {
                "file": candidate.path,
                "reason": "Chosen from heuristic file ranking because the locator did not return a usable target.",
            }
        )
    return fallback


def _guess_labels(issue_text: str) -> list[str]:
    labels = ["bug"]
    lower = issue_text.lower()
    if any(w in lower for w in ["auth", "login", "session", "token", "password"]):
        labels.append("auth")
    if any(w in lower for w in ["crash", "error", "exception", "fatal"]):
        labels.append("crash")
    if any(w in lower for w in ["slow", "performance", "memory", "leak"]):
        labels.append("performance")
    if any(w in lower for w in ["security", "xss", "injection", "cve"]):
        labels.append("security")
    return labels
