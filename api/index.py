"""Vercel serverless function entry point."""

import os
import sys
import traceback

# Ensure the project root is on the Python path so that the `server`
# package can be imported with its relative imports intact.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from server.app import app  # noqa: E402, F401
except Exception:
    # If the app fails to import, create a minimal ASGI app that returns the error
    # so we can diagnose on Vercel where logs are hard to access.
    _import_error = traceback.format_exc()

    async def app(scope, receive, send):  # noqa: F811
        if scope["type"] == "http":
            body = f"App import failed:\n\n{_import_error}".encode()
            await send({
                "type": "http.response.start",
                "status": 500,
                "headers": [[b"content-type", b"text/plain"]],
            })
            await send({"type": "http.response.body", "body": body})
