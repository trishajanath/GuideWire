from __future__ import annotations

import sys
from pathlib import Path

# Ensure backend modules are importable when running as a Vercel Python function.
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from main import app  # noqa: E402
