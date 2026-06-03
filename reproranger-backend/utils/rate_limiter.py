"""
Kyro — Autonomous AI Code Repair Engine
Copyright © 2026 Anish Chugh. All rights reserved.
Version 1.0.0 | June 2026
Unauthorized copying, modification, or distribution is strictly prohibited.

Simple in-memory sliding-window rate limiter.
"""
import time
from collections import defaultdict, deque


class RateLimiter:
    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self._max = max_requests
        self._window = window_seconds
        self._log: dict[str, deque] = defaultdict(deque)

    def is_allowed(self, key: str) -> bool:
        now = time.monotonic()
        window = self._log[key]
        # Drop timestamps outside the window
        while window and window[0] < now - self._window:
            window.popleft()
        if len(window) >= self._max:
            return False
        window.append(now)
        return True

    def remaining(self, key: str) -> int:
        now = time.monotonic()
        window = self._log[key]
        while window and window[0] < now - self._window:
            window.popleft()
        return max(0, self._max - len(window))
