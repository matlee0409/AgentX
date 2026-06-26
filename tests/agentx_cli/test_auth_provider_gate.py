"""Tests for is_provider_explicitly_configured()."""

import json
import pytest


def _write_config(tmp_path, config: dict) -> None:
    agentx_home = tmp_path / "agentx"
    agentx_home.mkdir(parents=True, exist_ok=True)
    import yaml
    (agentx_home / "config.yaml").write_text(yaml.dump(config))


def _write_auth_store(tmp_path, payload: dict) -> None:
    agentx_home = tmp_path / "agentx"
    agentx_home.mkdir(parents=True, exist_ok=True)
    (agentx_home / "auth.json").write_text(json.dumps(payload, indent=2))


@pytest.fixture(autouse=True)
def _clean_anthropic_env(monkeypatch):
    """Strip Anthropic env vars so CI secrets don't leak into tests."""
    for key in ("ANTHROPIC_API_KEY", "ANTHROPIC_TOKEN", "CLAUDE_CODE_OAUTH_TOKEN"):
        monkeypatch.delenv(key, raising=False)


def test_returns_false_when_no_config(tmp_path, monkeypatch):
    monkeypatch.setenv("AGENTX_HOME", str(tmp_path / "agentx"))
    (tmp_path / "agentx").mkdir(parents=True, exist_ok=True)

    from agentx_cli.auth import is_provider_explicitly_configured
    assert is_provider_explicitly_configured("anthropic") is False


def test_returns_true_when_active_provider_matches(tmp_path, monkeypatch):
    monkeypatch.setenv("AGENTX_HOME", str(tmp_path / "agentx"))
    _write_auth_store(tmp_path, {
        "version": 1,
        "providers": {},
        "active_provider": "anthropic",
    })

    from agentx_cli.auth import is_provider_explicitly_configured
    assert is_provider_explicitly_configured("anthropic") is True


def test_returns_true_when_config_provider_matches(tmp_path, monkeypatch):
    monkeypatch.setenv("AGENTX_HOME", str(tmp_path / "agentx"))
    _write_config(tmp_path, {"model": {"provider": "anthropic", "default": "claude-sonnet-4-6"}})

    from agentx_cli.auth import is_provider_explicitly_configured
    assert is_provider_explicitly_configured("anthropic") is True


def test_returns_false_when_config_provider_is_different(tmp_path, monkeypatch):
    monkeypatch.setenv("AGENTX_HOME", str(tmp_path / "agentx"))
    _write_config(tmp_path, {"model": {"provider": "kimi-coding", "default": "kimi-k2"}})
    _write_auth_store(tmp_path, {
        "version": 1,
        "providers": {},
        "active_provider": None,
    })

    from agentx_cli.auth import is_provider_explicitly_configured
    assert is_provider_explicitly_configured("anthropic") is False


def test_returns_true_when_anthropic_env_var_set(tmp_path, monkeypatch):
    monkeypatch.setenv("AGENTX_HOME", str(tmp_path / "agentx"))
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-api03-realkey")
    (tmp_path / "agentx").mkdir(parents=True, exist_ok=True)

    from agentx_cli.auth import is_provider_explicitly_configured
    assert is_provider_explicitly_configured("anthropic") is True


def test_claude_code_oauth_token_does_not_count_as_explicit(tmp_path, monkeypatch):
    """CLAUDE_CODE_OAUTH_TOKEN is set by Claude Code, not the user — must not gate."""
    monkeypatch.setenv("AGENTX_HOME", str(tmp_path / "agentx"))
    monkeypatch.setenv("CLAUDE_CODE_OAUTH_TOKEN", "sk-ant-oat01-auto-token")
    (tmp_path / "agentx").mkdir(parents=True, exist_ok=True)

    from agentx_cli.auth import is_provider_explicitly_configured
    assert is_provider_explicitly_configured("anthropic") is False
