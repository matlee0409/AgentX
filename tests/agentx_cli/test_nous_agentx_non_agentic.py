"""Tests for the Nous-AgentX-3/4 non-agentic warning detector.

Prior to this check, the warning fired on any model whose name contained
``"agentx"`` anywhere (case-insensitive). That false-positived on unrelated
local Modelfiles such as ``agentx-brain:qwen3-14b-ctx16k`` — a tool-capable
Qwen3 wrapper that happens to live under the "agentx" tag namespace.

``is_nous_agentx_non_agentic`` should only match the actual Nous Research
AgentX-3 / AgentX-4 chat family.
"""

from __future__ import annotations

import pytest

from agentx_cli.model_switch import (
    _AGENTX_MODEL_WARNING,
    _check_agentx_model_warning,
    is_nous_agentx_non_agentic,
)


@pytest.mark.parametrize(
    "model_name",
    [
        "NousResearch/AgentX-3-Llama-3.1-70B",
        "NousResearch/AgentX-3-Llama-3.1-405B",
        "agentx-3",
        "AgentX-3",
        "agentx-4",
        "agentx-4-405b",
        "agentx_4_70b",
        "openrouter/agentx3:70b",
        "openrouter/nousresearch/agentx-4-405b",
        "NousResearch/AgentX3",
        "agentx-3.1",
    ],
)
def test_matches_real_nous_agentx_chat_models(model_name: str) -> None:
    assert is_nous_agentx_non_agentic(model_name), (
        f"expected {model_name!r} to be flagged as Nous AgentX 3/4"
    )
    assert _check_agentx_model_warning(model_name) == _AGENTX_MODEL_WARNING


@pytest.mark.parametrize(
    "model_name",
    [
        # Kyle's local Modelfile — qwen3:14b under a custom tag
        "agentx-brain:qwen3-14b-ctx16k",
        "agentx-brain:qwen3-14b-ctx32k",
        "agentx-honcho:qwen3-8b-ctx8k",
        # Plain unrelated models
        "qwen3:14b",
        "qwen3-coder:30b",
        "qwen2.5:14b",
        "claude-opus-4-6",
        "anthropic/claude-sonnet-4.5",
        "gpt-5",
        "openai/gpt-4o",
        "google/gemini-2.5-flash",
        "deepseek-chat",
        # Non-chat AgentX models we don't warn about
        "agentx-llm-2",
        "agentx2-pro",
        "nous-agentx-2-mistral",
        # Edge cases
        "",
        "agentx",  # bare "agentx" isn't the 3/4 family
        "agentx-brain",
        "brain-agentx-3-impostor",  # "3" not preceded by /: boundary
    ],
)
def test_does_not_match_unrelated_models(model_name: str) -> None:
    assert not is_nous_agentx_non_agentic(model_name), (
        f"expected {model_name!r} NOT to be flagged as Nous AgentX 3/4"
    )
    assert _check_agentx_model_warning(model_name) == ""


def test_none_like_inputs_are_safe() -> None:
    assert is_nous_agentx_non_agentic("") is False
    # Defensive: the helper shouldn't crash on None-ish falsy input either.
    assert _check_agentx_model_warning("") == ""
