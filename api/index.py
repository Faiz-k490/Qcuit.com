"""
Vercel Serverless entry point for the Qcuit backend.

Vercel treats any file under the project-root ``/api`` directory as a
Serverless Function. This thin wrapper exposes the existing Flask
application (defined in ``website/api``) as a WSGI ``app`` object, which the
``@vercel/python`` runtime serves directly.

All ``/api/*`` (and ``/health``) requests are rewritten to this function by
``vercel.json``; the React build is served as static assets from Vercel's CDN.
"""

import os
import sys

# Make the backend package (``website/api``) importable as top-level ``api``.
_HERE = os.path.dirname(os.path.abspath(__file__))
_WEBSITE = os.path.abspath(os.path.join(_HERE, os.pardir, "website"))
if _WEBSITE not in sys.path:
    sys.path.insert(0, _WEBSITE)

# Ensure the backend package wins over this root-level ``/api`` directory,
# which Python might otherwise treat as a namespace package named ``api``.
if "api" in sys.modules and getattr(sys.modules["api"], "__file__", None) is None:
    del sys.modules["api"]

# Notebook artifacts must live on the only writable path in a serverless
# environment. Persistence is best-effort/ephemeral (per-invocation).
os.environ.setdefault("QCUIT_DATA_DIR", "/tmp/qcuit-data")
os.environ.setdefault("FLASK_ENV", "production")

from api import create_app  # noqa: E402  (import after sys.path setup)

app = create_app("production")
