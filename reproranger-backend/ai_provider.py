"""
Kyro — Autonomous AI Code Repair Engine
Copyright © 2026 Anish Chugh. All rights reserved.
Version 1.0.0 | June 2026
Unauthorized copying, modification, or distribution is strictly prohibited.

Unified AI provider abstraction for Kyro.
ALL AI calls in the codebase must go through call_ai().
Never import openai / anthropic / google.generativeai directly elsewhere.
"""
from __future__ import annotations

import os

import anthropic
import google.generativeai as genai
import openai


def call_ai(
    prompt: str,
    provider: str,
    max_tokens: int,
    system_prompt: str = "",
) -> str:
    """
    Unified AI call.
      provider  : "openai" | "anthropic" | "google"
      max_tokens: hard cap on completion tokens
      temperature is always 0.2 (deterministic, not creative)

    Falls back to OpenAI automatically if the primary provider raises.
    """
    try:
        return _call_provider(prompt, provider, max_tokens, system_prompt)
    except Exception as primary_exc:
        if provider == "openai":
            raise
        try:
            return _call_provider(prompt, "openai", max_tokens, system_prompt)
        except Exception:
            raise primary_exc


def _call_provider(prompt: str, provider: str, max_tokens: int, system_prompt: str) -> str:
    if provider == "openai":
        return _call_openai(prompt, max_tokens, system_prompt)
    if provider == "anthropic":
        return _call_anthropic(prompt, max_tokens, system_prompt)
    if provider == "google":
        return _call_google(prompt, max_tokens, system_prompt)
    raise ValueError(f"Unknown provider: {provider!r}")


# ── OpenAI ────────────────────────────────────────────────────────────────────

def _call_openai(prompt: str, max_tokens: int, system_prompt: str) -> str:
    client = openai.OpenAI(
        api_key=os.environ["OPENAI_API_KEY"],
        timeout=float(os.getenv("OPENAI_TIMEOUT_SECONDS", "90")),
    )
    model = os.getenv("OPENAI_MODEL", "gpt-4o")
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})
    resp = client.chat.completions.create(
        model=model,
        messages=messages,
        max_tokens=max_tokens,
        temperature=0.2,
    )
    return (resp.choices[0].message.content or "").strip()


# ── Anthropic ─────────────────────────────────────────────────────────────────

def _call_anthropic(prompt: str, max_tokens: int, system_prompt: str) -> str:
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    model = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
    kwargs: dict = {
        "model": model,
        "max_tokens": max_tokens,
        "temperature": 0.2,
        "messages": [{"role": "user", "content": prompt}],
    }
    if system_prompt:
        kwargs["system"] = system_prompt
    resp = client.messages.create(**kwargs)
    return resp.content[0].text.strip()


# ── Google Gemini ─────────────────────────────────────────────────────────────

def _call_google(prompt: str, max_tokens: int, system_prompt: str) -> str:
    genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
    model_name = os.getenv("GOOGLE_MODEL", "gemini-1.5-flash")
    model_kwargs: dict = {"model_name": model_name}
    if system_prompt:
        model_kwargs["system_instruction"] = system_prompt
    model = genai.GenerativeModel(**model_kwargs)
    resp = model.generate_content(
        prompt,
        generation_config=genai.types.GenerationConfig(
            max_output_tokens=max_tokens,
            temperature=0.2,
        ),
    )
    return resp.text.strip()
