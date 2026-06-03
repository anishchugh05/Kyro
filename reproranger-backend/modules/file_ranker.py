"""
Kyro — Autonomous AI Code Repair Engine
Copyright © 2026 Anish Chugh. All rights reserved.
Version 1.0.0 | June 2026
Unauthorized copying, modification, or distribution is strictly prohibited.

File Ranker — TF-IDF-style keyword scoring to find the most relevant
files for a given issue, without sending the entire repo to the LLM.

Score = (filename_match * 3) + (path_match * 2) + content_tf_idf
"""
import re
import math
from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from modules.repo_ingestor import CodebaseMap, FileEntry

STOPWORDS = {
    "the", "a", "an", "is", "in", "on", "at", "to", "for", "of",
    "and", "or", "but", "not", "it", "be", "as", "are", "was", "were",
    "with", "this", "that", "have", "has", "had", "from", "by", "i",
    "we", "you", "they", "he", "she", "get", "gets", "got", "can",
    "could", "would", "should", "will", "do", "does", "did", "when",
    "where", "how", "what", "which", "who", "if", "then", "else",
    "return", "new", "null", "undefined", "true", "false",
}

BUG_ADJACENT_DIRS = {"auth", "security", "session", "api", "db", "database",
                     "middleware", "handler", "service", "routes", "store"}


@dataclass
class RankedFile:
    path: str
    score: float
    excerpt: str    # content snippet for the LLM prompt
    line_count: int


def _tokenize(text: str) -> list[str]:
    tokens = re.findall(r"[a-z][a-z0-9_]*", text.lower())
    return [t for t in tokens if t not in STOPWORDS and len(t) > 2]


def _camel_split(word: str) -> list[str]:
    """Split camelCase/PascalCase into individual tokens."""
    parts = re.sub(r"([A-Z])", r" \1", word).split()
    return [p.lower() for p in parts if len(p) > 1]


def rank_files(
    cmap: "CodebaseMap",
    issue_text: str,
    top_k: int = 8,
) -> list[RankedFile]:
    """Return the top_k most relevant FileEntries for the given issue."""
    # Build query term set (include camelCase splits)
    raw_tokens = _tokenize(issue_text)
    query_terms: set[str] = set(raw_tokens)
    for t in raw_tokens:
        query_terms.update(_camel_split(t))

    if not query_terms:
        # Fallback: return first top_k files
        return [
            RankedFile(path=f.path, score=0.0, excerpt=f.excerpt, line_count=f.line_count)
            for f in cmap.files[:top_k]
        ]

    total_files = max(len(cmap.files), 1)

    # IDF: how many files contain each term?
    term_doc_freq: dict[str, int] = {}
    for f in cmap.files:
        file_terms = set(_tokenize(f.path + " " + f.excerpt))
        for t in file_terms:
            term_doc_freq[t] = term_doc_freq.get(t, 0) + 1

    def idf(term: str) -> float:
        df = term_doc_freq.get(term, 0)
        if df == 0:
            return 0.0
        return math.log(total_files / df)

    ranked: list[RankedFile] = []
    for f in cmap.files:
        score = 0.0
        path_lower = f.path.lower()

        # Filename bonus: terms appearing in the file path
        path_tokens = set(_tokenize(path_lower))
        for t in query_terms:
            if t in path_tokens:
                score += 3.0 * idf(t)

        # Bug-adjacent directory bonus
        path_parts = {p.lower() for p in f.path.split("/")}
        if path_parts & BUG_ADJACENT_DIRS:
            score += 1.5

        # Content TF-IDF over excerpt
        content_tokens = _tokenize(f.excerpt)
        if content_tokens:
            content_freq: dict[str, int] = {}
            for t in content_tokens:
                content_freq[t] = content_freq.get(t, 0) + 1
            for t in query_terms:
                tf = content_freq.get(t, 0) / len(content_tokens)
                score += tf * idf(t)

        if score > 0:
            ranked.append(RankedFile(
                path=f.path,
                score=round(score, 4),
                excerpt=f.excerpt,
                line_count=f.line_count,
            ))

    ranked.sort(key=lambda r: r.score, reverse=True)
    if ranked:
        return ranked[:top_k]

    # If heuristic scoring found nothing useful, still provide the LLM with
    # a small deterministic slice of the repo instead of an empty candidate list.
    return [
        RankedFile(path=f.path, score=0.0, excerpt=f.excerpt, line_count=f.line_count)
        for f in cmap.files[:top_k]
    ]


def format_ranked_for_prompt(ranked: list[RankedFile], max_chars_per_file: int = 1500) -> str:
    """Format ranked files into a compact string for the LLM system prompt."""
    parts: list[str] = []
    for i, r in enumerate(ranked, 1):
        excerpt = r.excerpt[:max_chars_per_file]
        parts.append(
            f"--- File {i}: {r.path} (score={r.score}, lines={r.line_count}) ---\n{excerpt}"
        )
    return "\n\n".join(parts)
