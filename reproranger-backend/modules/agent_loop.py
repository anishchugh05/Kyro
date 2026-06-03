"""
Kyro — Autonomous AI Code Repair Engine
Copyright © 2026 Anish Chugh. All rights reserved.
Version 1.0.0 | June 2026
Unauthorized copying, modification, or distribution is strictly prohibited.

The Agent Loop — multi-provider autonomous repair pipeline.

Stage 1  Detective   (Gemini 1.5 Flash) — identifies 2-3 suspicious files from top 5 ranked
Stage 2  Skeptic     (Claude Haiku)     — challenges / validates the diagnosis
Stage 3  Arbitration (Pure Python)      — decides final file list, zero API calls
Stage 4  Fixer       (GPT-4o)           — generates precise search/replace patches
Stage 5  Validator   (Gemini, on retry) — analyzes test failure, suggests correction

Token budget: ~3,100 tokens per repo analysis.
All AI calls go through ai_provider.call_ai() — never import SDKs directly here.
"""
from __future__ import annotations

import asyncio
import json
import os
import re
from pathlib import Path
from typing import Any, Callable, Optional

from ai_provider import call_ai
from modules.diff_generator import build_diff_for_job
from modules.file_ranker import RankedFile, rank_files
from modules.github_pr import build_pr_body, create_pull_request_sync
from modules.job_store import JobStore
from modules.repo_ingestor import (
    CodebaseMap,
    RepoEdge,
    RepoNode,
    build_codebase_map,
    build_city_layout,
    cleanup_repo,
    clone_repo,
    detect_test_command,
)
from modules.sandbox import install_dependencies_async, run_tests_async

Emitter = Callable[[str, dict], Any]


class AgentLoop:
    def __init__(self, emit: Emitter, job_store: JobStore):
        self._emit = emit
        self._job_store = job_store

    # ── Emit helpers ─────────────────────────────────────────────────────────

    def _log(self, level: str, message: str) -> None:
        self._emit("log", {"level": level, "message": message})

    def _set_phase(self, phase: str) -> None:
        self._emit("phase", {"phase": phase})

    def _set_progress(self, value: float) -> None:
        self._emit("progress", {"value": round(value, 2)})

    def _push_nodes(self, nodes: list[RepoNode], edges: list[RepoEdge]) -> None:
        self._emit("nodes", {
            "nodes": [_node_to_dict(n) for n in nodes],
            "edges": [_edge_to_dict(e) for e in edges],
        })

    def _mark_node(
        self,
        nodes: list[RepoNode],
        edges: list[RepoEdge],
        node_id: str,
        status: str,
    ) -> list[RepoNode]:
        updated = [
            RepoNode(**{**n.__dict__, "status": status}) if n.id == node_id else n
            for n in nodes
        ]
        self._push_nodes(updated, edges)
        return updated

    def _emit_stage(self, stage: str, provider: str, summary: str) -> None:
        self._emit("stage", {"stage": stage, "provider": provider, "summary": summary})

    # ── Codebase overview (Claude Haiku) ─────────────────────────────────────

    def run_overview(self, cmap: CodebaseMap) -> str:
        """Claude Haiku generates a 2-4 sentence technical overview of the whole codebase."""
        sample = sorted(cmap.files, key=lambda f: f.line_count, reverse=True)[:3]
        files_block = "\n\n".join(
            f"=== {f.path} ===\n" + "\n".join(f.excerpt.splitlines()[:30])
            for f in sample
        )
        system_prompt = (
            "You are a senior developer reading a new codebase. "
            "Write a 2-4 sentence technical overview: what the project is, "
            "what technology stack it uses, and what it does. "
            "Be specific and concrete. Do not use filler phrases like 'This codebase' or 'The project'. "
            "Start directly with the technology or domain."
        )
        user_msg = (
            f"File tree:\n{cmap.file_tree[:800]}\n\n"
            f"Key files:\n{files_block}"
        )
        return call_ai(user_msg, provider="anthropic", max_tokens=180, system_prompt=system_prompt)

    # ── Stage 1: Detective (Gemini) ───────────────────────────────────────────

    def run_detective(self, bug_report: str, ranked_files: list[RankedFile]) -> dict:
        """Gemini identifies 2-3 suspicious files from the top 5 ranked. Max 400 tokens."""
        top5 = ranked_files[:5]
        files_block = "\n\n".join(
            f"=== {r.path} ===\n" + "\n".join(r.excerpt.splitlines()[:150])
            for r in top5
        )
        system_prompt = (
            "You are a bug detective. Analyze the files and bug report. "
            "Respond ONLY with valid JSON — no prose, no markdown fences."
        )
        user_msg = (
            f"Bug report:\n{bug_report}\n\n"
            f"Candidate files:\n{files_block}\n\n"
            'Return JSON: {"suspected_files": ["path1", "path2"], '
            '"reasoning": {"path1": "one-line reason", "path2": "one-line reason"}}'
        )
        raw = call_ai(user_msg, provider="google", max_tokens=400, system_prompt=system_prompt)
        return json.loads(_strip_fences(raw))

    # ── Stage 2: Skeptic (Claude) ─────────────────────────────────────────────

    def run_skeptic(
        self,
        bug_report: str,
        detective_output: dict,
        ranked_files: list[RankedFile],
    ) -> dict:
        """Claude challenges the Detective. Gets 50-line summaries to save tokens. Max 300 tokens."""
        top5 = ranked_files[:5]
        files_block = "\n\n".join(
            f"=== {r.path} ===\n" + "\n".join(r.excerpt.splitlines()[:50])
            for r in top5
        )
        system_prompt = (
            "You are a skeptical code reviewer. Challenge the diagnosis if warranted. "
            "Respond ONLY with valid JSON — no prose, no markdown fences."
        )
        user_msg = (
            f"Bug report:\n{bug_report}\n\n"
            f"Detective's diagnosis:\n{json.dumps(detective_output)}\n\n"
            f"File summaries (50 lines each):\n{files_block}\n\n"
            'Return JSON: {"agrees": true, "final_files": ["path1"], '
            '"confidence": 0.9, "override_reason": "only present if agrees is false"}'
        )
        raw = call_ai(user_msg, provider="anthropic", max_tokens=300, system_prompt=system_prompt)
        return json.loads(_strip_fences(raw))

    # ── Stage 4: Fixer (GPT-4o) ───────────────────────────────────────────────

    def run_fixer(
        self,
        bug_report: str,
        files_to_fix: list[str],
        repo_path: str,
        cmap: CodebaseMap,
        correction_note: str = "",
    ) -> list[dict]:
        """GPT-4o generates search/replace patches. Max 600 tokens per file."""
        path_to_entry = {f.path: f for f in cmap.files}
        correction_block = (
            f"\n\nCORRECTION NOTE (previous patch failed tests):\n{correction_note}"
            if correction_note
            else ""
        )
        fixes: list[dict] = []

        for file_path in files_to_fix:
            abs_path = Path(repo_path) / file_path
            try:
                original = abs_path.read_text(encoding="utf-8", errors="replace")
            except FileNotFoundError:
                entry = path_to_entry.get(file_path)
                original = entry.excerpt if entry else ""

            lines = original.splitlines()
            excerpt = "\n".join(lines) if len(lines) <= 150 else "\n".join(lines[:150])
            truncation_note = f"(first 150 of {len(lines)} lines shown)" if len(lines) > 150 else ""

            system_prompt = (
                "You are a precise code fixer. Your job is to apply a concrete, minimal fix.\n"
                "Rules:\n"
                "  - Always apply SOME fix. Only respond NO_FIX if the file is 100% correct.\n"
                "  - FIND must be an exact verbatim substring of the file.\n"
                "  - Keep changes minimal — fix only what is described.\n"
                "Respond ONLY in this exact format — no markdown, no extra prose:\n\n"
                "---FIND---\n"
                "[exact verbatim text from the file to replace]\n"
                "---REPLACE---\n"
                "[corrected replacement]\n"
                "---END---\n\n"
                "Only respond NO_FIX if absolutely no change is needed."
            )
            user_msg = (
                f"Issue to fix:\n{bug_report}\n\n"
                f"File: {file_path} {truncation_note}\n"
                f"```\n{excerpt}\n```"
                f"{correction_block}"
            )
            raw = call_ai(user_msg, provider="openai", max_tokens=1000, system_prompt=system_prompt)
            result = _parse_fixer_response(raw, file_path, original)
            if result:
                fixes.append(result)
            else:
                self._log("info", f"No fix generated for {file_path}")

        return fixes

    # ── Stage 5: Validator retry (Gemini, called only on test failure) ────────

    def run_validator_retry(self, error_output: str, patch_summary: str) -> str:
        """Gemini analyses the test failure and suggests a correction. Max 200 tokens."""
        system_prompt = (
            "You are a test failure analyst. "
            "Briefly explain what the patch got wrong and how to correct it. "
            "Be concise — 2-3 sentences maximum."
        )
        user_msg = (
            f"Test failure output:\n{error_output[:600]}\n\n"
            f"Applied patch summary:\n{patch_summary[:400]}\n\n"
            "What specific change would fix these test failures?"
        )
        return call_ai(user_msg, provider="google", max_tokens=200, system_prompt=system_prompt)

    # ── Orchestration ─────────────────────────────────────────────────────────

    async def run(self, job_id: str, repo_url: str, issue_text: str) -> None:
        try:
            await self._pipeline(job_id, repo_url, issue_text)
        except Exception as exc:
            self._job_store.update_job(job_id, status="failed", error=str(exc))
            self._emit("error", {"message": str(exc)})
            self._emit("phase", {"phase": "idle"})

    async def _pipeline(self, job_id: str, repo_url: str, issue_text: str) -> None:
        loop = asyncio.get_running_loop()
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
        self._set_progress(0.25)

        # ── Codebase overview (Claude Haiku) ───────────────────────────────
        try:
            overview_text = await loop.run_in_executor(None, self.run_overview, cmap)
            self._emit("overview", {
                "text": overview_text.strip(),
                "stats": {"files": cmap.total_files, "lines": cmap.total_lines},
            })
        except Exception as exc:
            self._log("error", f"Overview generation failed: {exc}")

        nodes, edges = await loop.run_in_executor(None, build_city_layout, cmap)
        self._push_nodes(nodes, edges)
        self._log("action", f"Repo City assembled — {len(nodes)} buildings, {len(edges)} streets.")
        self._set_progress(0.30)

        # ── Exploring: rank files ──────────────────────────────────────────
        self._set_phase("exploring")
        self._log("thought", "Ranking files by relevance and risk...")
        ranked = await loop.run_in_executor(None, rank_files, cmap, analysis_brief, 8)
        self._log("info", f"Top candidates: {', '.join(r.path for r in ranked[:4])}")
        self._set_progress(0.35)

        path_to_node: dict[str, str] = {n.label: n.id for n in nodes}
        for r in ranked[:5]:
            nid = path_to_node.get(r.path)
            if nid:
                nodes = self._mark_node(nodes, edges, nid, "warning")
        self._set_progress(0.40)

        # ── Stage 1: Detective (Gemini) ────────────────────────────────────
        self._set_phase("targeting")
        self._log("action", "🔍 Gemini Detective — identifying root-cause files...")
        detective_output: dict = {}
        try:
            detective_output = await loop.run_in_executor(
                None, self.run_detective, analysis_brief, ranked
            )
            suspected = detective_output.get("suspected_files", [])
            self._log("info", f"Detective suspects: {', '.join(suspected)}")
            self._emit_stage("detective", "gemini", f"Suspected: {', '.join(str(s) for s in suspected[:3])}")
        except Exception as exc:
            self._log("error", f"Detective failed: {exc}. Using heuristic fallback.")
            detective_output = {"suspected_files": [r.path for r in ranked[:3]], "reasoning": {}}
        self._set_progress(0.48)

        # ── Stage 2: Skeptic (Claude) ──────────────────────────────────────
        self._log("action", "🤔 Claude Skeptic — challenging the diagnosis...")
        skeptic_output: dict = {}
        try:
            skeptic_output = await loop.run_in_executor(
                None, self.run_skeptic, analysis_brief, detective_output, ranked
            )
            agrees = skeptic_output.get("agrees", True)
            confidence = float(skeptic_output.get("confidence", 1.0))
            override = skeptic_output.get("override_reason", "")
            self._log(
                "info" if agrees else "thought",
                f"Skeptic {'agrees' if agrees else 'disagrees'} "
                f"(confidence: {confidence:.0%})"
                + (f" — {override}" if not agrees and override else ""),
            )
            self._emit_stage(
                "skeptic", "claude",
                f"{'Agrees' if agrees else 'Disagrees'} ({confidence:.0%} confidence)",
            )
        except Exception as exc:
            self._log("error", f"Skeptic failed: {exc}. Trusting Detective.")
            skeptic_output = {
                "agrees": True,
                "final_files": detective_output.get("suspected_files", []),
                "confidence": 1.0,
            }
        self._set_progress(0.55)

        # ── Stage 3: Arbitration (pure Python, zero API calls) ─────────────
        final_files = arbitrate(detective_output, skeptic_output)
        final_files = _normalize_paths(final_files)
        if not final_files:
            final_files = [r.path for r in ranked[:2]]
            self._log("info", "Arbitration returned no files — using top 2 ranked as fallback.")
        self._emit_stage("arbitration", "python", f"Final targets: {', '.join(final_files[:3])}")
        self._log("thought", f"Arbitration → {len(final_files)} file(s): {', '.join(final_files)}")
        self._set_progress(0.58)

        # Focus primary target in the city
        primary_path = final_files[0]
        primary_node_id = path_to_node.get(primary_path)
        if primary_node_id:
            nodes = self._mark_node(nodes, edges, primary_node_id, "buggy")
            self._emit("focus", {"nodeId": primary_node_id})
            edges = [
                RepoEdge(
                    id=e.id, from_id=e.from_id, to_id=e.to_id,
                    active=(e.from_id == primary_node_id or e.to_id == primary_node_id),
                )
                for e in edges
            ]
            self._push_nodes(nodes, edges)

        self._emit("issue", {
            "id": f"issue-{job_id[:8]}",
            "title": _extract_issue_title(analysis_brief),
            "body": analysis_brief[:800],
            "labels": _guess_labels(analysis_brief),
            "targetNodeId": primary_node_id,
        })

        # ── Build enriched fixer brief ─────────────────────────────────────
        # When no issue was provided, the AI agents found specific bugs.
        # Pass those findings to the Fixer so it has something concrete to fix.
        fixer_brief = analysis_brief
        if not issue_text.strip():
            findings: list[str] = []
            det_reasoning = detective_output.get("reasoning", {})
            for f in final_files[:1]:
                reason = det_reasoning.get(f, "")
                if reason:
                    findings.append(f"Detective: {reason}")
            # Skeptic's override_reason is the most specific — use it first
            if not skeptic_output.get("agrees", True):
                override = skeptic_output.get("override_reason", "")
                if override:
                    findings.insert(0, f"Skeptic: {override}")
            if findings:
                fixer_brief = (
                    f"Audit of {', '.join(final_files[:1])}.\n\n"
                    + "\n\n".join(findings)
                    + "\n\nApply a minimal, precise patch that fixes the most impactful issue above."
                )

        # ── Stage 4: Fixer (GPT-4o) ────────────────────────────────────────
        self._set_phase("repairing")
        self._log("action", "🔧 GPT-4o Fixer — generating patches...")
        test_cmd = await loop.run_in_executor(None, detect_test_command, repo_path)
        fixes: list[dict] = []

        fixes = await loop.run_in_executor(
            None, self.run_fixer, fixer_brief, final_files, repo_path, cmap
        )
        for fix in fixes:
            self._log("info", f"Patching {fix['file']}")
        self._emit_stage("fixer", "openai", f"Patched {len(fixes)} file(s)")
        self._set_progress(0.72)

        # Apply fixes and generate diff
        full_diff, diff_files = await loop.run_in_executor(
            None, build_diff_for_job, repo_path, fixes
        )
        if diff_files:
            primary_diff = diff_files[0]
            self._emit("diff", {
                "path": primary_diff.path,
                "lines": [_diff_line_to_dict(ln) for ln in primary_diff.lines],
            })

        # ── Tests + optional Stage 5 validator retry ───────────────────────
        test_error: Optional[str] = None
        if test_cmd and fixes:
            self._log("action", "Installing dependencies...")
            await install_dependencies_async(repo_path)
            self._log("action", f"Running: {test_cmd}")
            result = await run_tests_async(repo_path, test_cmd, timeout=90)

            if result.success:
                self._log("success", f"All tests pass! ({test_cmd})")
            else:
                test_error = result.output
                # Show just the first meaningful error line — not the full raw stack trace
                error_lines = [
                    l.strip() for l in result.output.splitlines()
                    if l.strip() and not l.strip().startswith(">") and len(l.strip()) > 5
                ]
                first_error = error_lines[0][:140] if error_lines else "unknown failure"
                self._log("error", f"Tests failed — {first_error}")

                # Stage 5: one validator retry
                self._log("action", "🔄 Gemini Validator — analysing failure...")
                try:
                    correction = await loop.run_in_executor(
                        None, self.run_validator_retry, test_error, full_diff[:400]
                    )
                    self._log("thought", f"Validator suggestion: {correction[:200]}")

                    self._log("action", "Re-patching with correction...")
                    retry_fixes = await loop.run_in_executor(
                        None, self.run_fixer,
                        analysis_brief, final_files, repo_path, cmap, correction,
                    )
                    if retry_fixes:
                        full_diff, diff_files = await loop.run_in_executor(
                            None, build_diff_for_job, repo_path, retry_fixes
                        )
                        fixes = retry_fixes
                        result2 = await run_tests_async(repo_path, test_cmd, timeout=90)
                        if result2.success:
                            self._log("success", "Tests pass after correction!")
                            test_error = None
                        else:
                            self._log("info", "Tests still failing — proceeding with best available patch.")
                except Exception as exc:
                    self._log("error", f"Validator retry failed: {exc}")
        else:
            self._log("info", "No test suite detected — skipping validation.")

        self._set_progress(0.90)

        # ── Complete ───────────────────────────────────────────────────────
        self._set_phase("complete")
        if primary_node_id:
            nodes = self._mark_node(nodes, edges, primary_node_id, "fixed")

        pr_title = f"fix: {_extract_issue_title(analysis_brief)[:60]}"
        self._log("success", f"Diff covers {len(fixes)} file(s). Ready for review.")
        self._emit_stage("complete", "system", f"{len(fixes)} file(s) patched")
        self._set_progress(0.95)

        # Open GitHub PR
        github_token = os.environ.get("GITHUB_TOKEN", "")
        pr_url: Optional[str] = None
        pr_number: Optional[int] = None

        if github_token and fixes:
            self._log("action", "Opening Pull Request on GitHub...")
            safe_suffix = re.sub(r"[^a-z0-9-]", "-", pr_title.lower())[:40].strip("-")
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
                self._emit("issue_url", {"url": pr_url, "number": pr_number})
            except Exception as exc:
                self._log("error", f"GitHub PR creation failed: {exc}")
                self._log("info", "Diff is available in the panel for manual review.")
        else:
            if not github_token:
                self._log("info", "GITHUB_TOKEN not set — skipping PR creation.")
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

        await loop.run_in_executor(None, cleanup_repo, job_id)


# ── Stage 3: Arbitration (pure Python) ────────────────────────────────────────

def arbitrate(detective_output: dict, skeptic_output: dict) -> list[str]:
    """
    Decides which files to fix — zero API calls.
    - Skeptic agrees  → Detective's files
    - Skeptic disagrees AND confidence >= 0.7 → Skeptic's override files
    - Skeptic disagrees AND confidence < 0.7  → Detective's files (insufficient confidence)
    """
    agrees = skeptic_output.get("agrees", True)
    if agrees:
        return list(detective_output.get("suspected_files", []))
    confidence = float(skeptic_output.get("confidence", 0.0))
    if confidence >= 0.7:
        return list(skeptic_output.get("final_files", []))
    return list(detective_output.get("suspected_files", []))


# ── Patch parsing ──────────────────────────────────────────────────────────────

def _parse_fixer_response(raw: str, file_path: str, original_content: str) -> Optional[dict]:
    """Parse ---FIND--- / ---REPLACE--- / ---END--- format from the fixer."""
    if "NO_FIX" in raw.upper():
        return None

    find_marker = "---FIND---"
    replace_marker = "---REPLACE---"
    end_marker = "---END---"

    find_start = raw.find(find_marker)
    replace_start = raw.find(replace_marker)
    end_start = raw.find(end_marker)

    if replace_start == -1 or end_start == -1:
        return None

    find_text = (
        raw[find_start + len(find_marker):replace_start].strip()
        if find_start != -1
        else ""
    )
    replace_text = raw[replace_start + len(replace_marker):end_start].strip()

    if not find_text:
        new_content = replace_text
    elif find_text in original_content:
        new_content = original_content.replace(find_text, replace_text, 1)
    else:
        new_content = _fuzzy_patch(original_content, find_text, replace_text)
        if new_content is None:
            return None

    return {"file": file_path, "new_content": new_content, "explanation": ""}


def _fuzzy_patch(original: str, search: str, replace: str) -> Optional[str]:
    """Fallback: match after stripping leading whitespace from every line."""
    orig_lines = original.splitlines()
    search_lines = search.splitlines()
    n = len(search_lines)
    norm_search = [ln.strip() for ln in search_lines]
    for i in range(len(orig_lines) - n + 1):
        if [ln.strip() for ln in orig_lines[i:i + n]] == norm_search:
            new_lines = orig_lines[:i] + replace.splitlines() + orig_lines[i + n:]
            return "\n".join(new_lines)
    return None


def _strip_fences(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("```"):
        lines = raw.splitlines()
        raw = "\n".join(lines[1:]).rstrip("`").rstrip()
    return raw


# ── Serialisation helpers ──────────────────────────────────────────────────────

def _node_to_dict(n: RepoNode) -> dict:
    return {"id": n.id, "label": n.label, "x": n.x, "z": n.z, "height": n.height, "status": n.status}


def _edge_to_dict(e: RepoEdge) -> dict:
    return {"id": e.id, "from": e.from_id, "to": e.to_id, "active": e.active}


def _diff_line_to_dict(ln) -> dict:
    d = {"kind": ln.kind, "content": ln.content}
    if ln.line_no is not None:
        d["lineNo"] = ln.line_no
    return d


# ── Text helpers ───────────────────────────────────────────────────────────────

def _extract_issue_title(issue_text: str) -> str:
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


def _normalize_paths(paths: list) -> list[str]:
    return [str(p).strip() for p in paths if str(p).strip()][:5]


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
