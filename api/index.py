"""Vercel serverless function entry point."""

import os
import sys

# Ensure the project root is on the Python path so that the `server`
# package can be imported with its relative imports intact.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server.app import app  # noqa: E402, F401
