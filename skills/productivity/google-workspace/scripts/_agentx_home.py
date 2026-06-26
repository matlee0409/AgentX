"""Resolve AGENTX_HOME for standalone skill scripts.

Skill scripts may run outside the AgentX process (e.g. system Python,
nix env, CI) where ``agentx_constants`` is not importable.  This module
provides the same ``get_agentx_home()`` and ``display_agentx_home()``
contracts as ``agentx_constants`` without requiring it on ``sys.path``.

When ``agentx_constants`` IS available it is used directly so that any
future enhancements (profile resolution, Docker detection, etc.) are
picked up automatically.  The fallback path replicates the core logic
from ``agentx_constants.py`` using only the stdlib.

All scripts under ``google-workspace/scripts/`` should import from here
instead of duplicating the ``AGENTX_HOME = Path(os.getenv(...))`` pattern.
"""

from __future__ import annotations

import os
from pathlib import Path

try:
    from agentx_constants import display_agentx_home as display_agentx_home
    from agentx_constants import get_agentx_home as get_agentx_home
except (ModuleNotFoundError, ImportError):

    def get_agentx_home() -> Path:
        """Return the AgentX home directory (default: ~/.agentx).

        Mirrors ``agentx_constants.get_agentx_home()``."""
        val = os.environ.get("AGENTX_HOME", "").strip()
        return Path(val) if val else Path.home() / ".agentx"

    def display_agentx_home() -> str:
        """Return a user-friendly ``~/``-shortened display string.

        Mirrors ``agentx_constants.display_agentx_home()``."""
        home = get_agentx_home()
        try:
            return "~/" + str(home.relative_to(Path.home()))
        except ValueError:
            return str(home)
