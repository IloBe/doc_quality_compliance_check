"""Repository-wide pytest bootstrap.

This file keeps the test layout unchanged while making shared source trees
available to every collected test module, including service-local suites.
"""
from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent
for candidate in (_ROOT / "src", _ROOT / "services" / "orchestrator" / "src"):
    if candidate.exists() and str(candidate) not in sys.path:
        sys.path.insert(0, str(candidate))
