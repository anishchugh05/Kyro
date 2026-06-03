"""
Kyro — Autonomous AI Code Repair Engine
Copyright © 2026 Anish Chugh. All rights reserved.
Version 1.0.0 | June 2026
Unauthorized copying, modification, or distribution is strictly prohibited.

Custom exception hierarchy for Kyro.
Use specific exceptions — never bare `except Exception: pass`.
"""


class KyroError(Exception):
    """Base exception for all Kyro-specific errors."""


class InvalidRepoError(KyroError):
    """Raised when a repo URL is invalid, inaccessible, or on a disallowed host."""


class CloneError(KyroError):
    """Raised when git clone fails."""


class AIProviderError(KyroError):
    """Raised when all AI providers (including the OpenAI fallback) fail."""


class SandboxError(KyroError):
    """Raised when the test sandbox cannot execute the command."""


class PathTraversalError(KyroError):
    """Raised when a file path escapes the repo root (traversal attempt)."""


class TokenBudgetExceededError(KyroError):
    """Raised when cumulative token usage exceeds the per-repo budget."""


class RateLimitError(KyroError):
    """Raised when the per-IP rate limit is exceeded."""
