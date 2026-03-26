"""Password hashing utilities for application users."""
from __future__ import annotations

import base64
import hashlib
import hmac
import os


def hash_password(password: str, iterations: int = 240_000) -> str:
    """Hash a password using PBKDF2-HMAC-SHA256.

    Stored format:
    pbkdf2_sha256$<iterations>$<salt_b64>$<hash_b64>
    """
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    salt_b64 = base64.b64encode(salt).decode("ascii")
    digest_b64 = base64.b64encode(digest).decode("ascii")
    return f"pbkdf2_sha256${iterations}${salt_b64}${digest_b64}"


def verify_password(password: str, encoded_hash: str) -> bool:
    """Verify plaintext password against encoded PBKDF2 hash."""
    try:
        algorithm, raw_iterations, salt_b64, digest_b64 = encoded_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        iterations = int(raw_iterations)
        salt = base64.b64decode(salt_b64.encode("ascii"))
        expected = base64.b64decode(digest_b64.encode("ascii"))
    except (ValueError, TypeError, base64.binascii.Error):
        return False

    candidate = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return hmac.compare_digest(candidate, expected)
