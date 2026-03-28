"""In-memory rate limiting utilities for API abuse protection."""
from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from threading import Lock


@dataclass
class RateLimitDecision:
    """Result of a rate-limit check."""

    allowed: bool
    retry_after_seconds: int = 0


class FixedWindowRateLimiter:
    """Thread-safe fixed-window limiter backed by process memory."""

    def __init__(self) -> None:
        self._events: dict[str, deque[datetime]] = defaultdict(deque)
        self._lock = Lock()

    @staticmethod
    def _now_utc() -> datetime:
        return datetime.now(timezone.utc)

    def check(self, *, key: str, max_requests: int, window_seconds: int) -> RateLimitDecision:
        """Check whether key is allowed under max/window constraints."""
        if max_requests <= 0 or window_seconds <= 0:
            return RateLimitDecision(allowed=True)

        now = self._now_utc()
        cutoff = now - timedelta(seconds=window_seconds)

        with self._lock:
            bucket = self._events[key]
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()

            if len(bucket) >= max_requests:
                earliest = bucket[0]
                retry_at = earliest + timedelta(seconds=window_seconds)
                retry_after = max(1, int((retry_at - now).total_seconds()))
                return RateLimitDecision(allowed=False, retry_after_seconds=retry_after)

            bucket.append(now)
            return RateLimitDecision(allowed=True)

    def clear(self, *, key: str | None = None) -> None:
        """Clear limiter state for a specific key or all keys."""
        with self._lock:
            if key is None:
                self._events.clear()
                return
            self._events.pop(key, None)


class LoginThrottleStore:
    """Tracks login failures and temporary lockouts by account and IP."""

    def __init__(self) -> None:
        self._attempts: dict[str, deque[datetime]] = defaultdict(deque)
        self._lockouts: dict[str, datetime] = {}
        self._lock = Lock()

    @staticmethod
    def _now_utc() -> datetime:
        return datetime.now(timezone.utc)

    def _prune(self, key: str, *, now: datetime, window_seconds: int) -> None:
        cutoff = now - timedelta(seconds=window_seconds)
        bucket = self._attempts[key]
        while bucket and bucket[0] <= cutoff:
            bucket.popleft()
        if not bucket:
            self._attempts.pop(key, None)

    def _lockout_remaining(self, key: str, *, now: datetime) -> int:
        until = self._lockouts.get(key)
        if until is None:
            return 0
        if until <= now:
            self._lockouts.pop(key, None)
            return 0
        return max(1, int((until - now).total_seconds()))

    def check_lockout(self, *, key: str) -> int:
        """Return remaining lockout seconds for key (0 when unlocked)."""
        now = self._now_utc()
        with self._lock:
            return self._lockout_remaining(key, now=now)

    def record_failure(
        self,
        *,
        key: str,
        max_attempts: int,
        window_seconds: int,
        lockout_seconds: int,
    ) -> int:
        """Record a failed attempt. Returns lockout seconds when threshold reached."""
        if max_attempts <= 0 or window_seconds <= 0 or lockout_seconds <= 0:
            return 0

        now = self._now_utc()
        with self._lock:
            active = self._lockout_remaining(key, now=now)
            if active > 0:
                return active

            self._prune(key, now=now, window_seconds=window_seconds)
            bucket = self._attempts[key]
            bucket.append(now)

            if len(bucket) >= max_attempts:
                until = now + timedelta(seconds=lockout_seconds)
                self._lockouts[key] = until
                self._attempts.pop(key, None)
                return lockout_seconds

            return 0

    def clear(self, *, key: str) -> None:
        """Clear failures and lockout state for key."""
        with self._lock:
            self._attempts.pop(key, None)
            self._lockouts.pop(key, None)

    def clear_all(self) -> None:
        """Clear all failures and lockout state."""
        with self._lock:
            self._attempts.clear()
            self._lockouts.clear()


api_global_limiter = FixedWindowRateLimiter()
auth_login_throttle = LoginThrottleStore()
