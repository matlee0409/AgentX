"""Contract tests for the Docker image's immutable /opt/agentx install tree."""
from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DOCKERFILE = REPO_ROOT / "Dockerfile"


def _dockerfile_text() -> str:
    return DOCKERFILE.read_text()


def test_dockerfile_makes_opt_agentx_root_owned_and_non_writable() -> None:
    text = _dockerfile_text()

    assert "COPY --chown=agentx:agentx . ." not in text
    assert "COPY . ." in text
    assert "chown -R root:root /opt/agentx" in text
    assert "chmod -R a+rX /opt/agentx" in text
    assert "chmod -R a-w /opt/agentx" in text

    immutable_block = re.search(
        r"RUN mkdir -p /opt/agentx/bin && \\\n"
        r"(?:.*\\\n)+?"
        r"\s+chmod -R a-w /opt/agentx",
        text,
    )
    assert immutable_block, "Dockerfile must lock /opt/agentx after installing code/deps"


def test_dockerfile_keeps_mutable_state_under_opt_data() -> None:
    text = _dockerfile_text()

    assert "ENV AGENTX_HOME=/opt/data" in text
    assert "ENV AGENTX_WRITE_SAFE_ROOT=/opt/data" in text
    assert 'VOLUME [ "/opt/data" ]' in text


def test_dockerfile_disables_runtime_install_mutations() -> None:
    text = _dockerfile_text()

    assert "ENV PYTHONDONTWRITEBYTECODE=1" in text
    assert "ENV AGENTX_DISABLE_LAZY_INSTALLS=1" in text
    assert "AGENTX_TUI_DIR=/opt/agentx/ui-tui" in text


def test_dockerfile_does_not_chown_install_trees_to_agentx() -> None:
    text = _dockerfile_text()
    forbidden_patterns = (
        r"chown\s+-R\s+agentx:agentx\s+/opt/agentx/\.venv",
        r"chown\s+-R\s+agentx:agentx\s+/opt/agentx/ui-tui",
        r"chown\s+-R\s+agentx:agentx\s+/opt/agentx/gateway",
        r"chown\s+-R\s+agentx:agentx\s+/opt/agentx/node_modules",
    )
    for pattern in forbidden_patterns:
        assert not re.search(pattern, text), (
            "runtime install trees under /opt/agentx must stay immutable; "
            f"found forbidden pattern {pattern!r}"
        )


def test_dockerfile_bakes_code_scoped_install_method_stamp() -> None:
    """The 'docker' install-method stamp is baked next to the code.

    detect_install_method() reads the code-scoped stamp
    (/opt/agentx/.install_method) first; baking it at build time keeps the
    published image self-identifying as 'docker' WITHOUT writing into the
    shared $AGENTX_HOME data volume (which a host install may also use).
    It must live inside the immutable block so the runtime user can't alter it.
    """
    text = _dockerfile_text()
    assert "printf 'docker\\n' > /opt/agentx/.install_method" in text

    immutable_block = re.search(
        r"RUN mkdir -p /opt/agentx/bin && \\\n"
        r"(?:.*\\\n)+?"
        r"\s+chmod -R a-w /opt/agentx",
        text,
    )
    assert immutable_block, "immutable block must exist"
    assert ".install_method" in immutable_block.group(0), (
        "the code-scoped install-method stamp must be baked inside the "
        "immutable /opt/agentx block"
    )


def test_dockerfile_redirects_lazy_installs_to_durable_target() -> None:
    """Immutable image seals the venv but redirects lazy installs to the
    writable data volume, so opt-in backends still install at first use
    without being able to break the sealed core.

    Guards the contract between the Dockerfile env var, the stage2-hook
    seeding, and tools/lazy_deps.py — these three must agree on the path.
    """
    text = _dockerfile_text()
    target = "/opt/data/lazy-packages"

    # The redirect target must be set AND must live under the data volume,
    # never under the immutable /opt/agentx tree.
    assert f"ENV AGENTX_LAZY_INSTALL_TARGET={target}" in text
    assert target.startswith("/opt/data/"), "target must be on the durable volume"
    assert "ENV AGENTX_LAZY_INSTALL_TARGET=/opt/agentx" not in text

    # The seal flag must still be present — the redirect rides on top of it,
    # it does not replace it.
    assert "ENV AGENTX_DISABLE_LAZY_INSTALLS=1" in text

    # stage2-hook must seed + chown the target dir so first-use installs
    # succeed as the unprivileged agentx runtime user.
    stage2 = (REPO_ROOT / "docker" / "stage2-hook.sh").read_text()
    assert '"$AGENTX_HOME/lazy-packages"' in stage2, (
        "stage2-hook.sh must create the lazy-packages dir on the data volume"
    )
    assert "lazy-packages" in stage2.split("for sub in", 1)[1].split(";", 1)[0], (
        "lazy-packages must be in the per-boot chown subdir list so it stays "
        "agentx-owned"
    )
