from __future__ import annotations

import json
import os
import re


def _fallback_assistant_reply(user_query: str, language: str) -> str:
    query = user_query.strip().lower()
    lang = language.strip().lower()

    if "plan" in query:
        if lang.startswith("hi"):
            return "Aapka Standard plan active hai. Agla payment Rs69 hai."
        return "Your Standard plan is active. Next payment Rs69."

    if "payout" in query:
        if lang.startswith("hi"):
            return "Aapka pichhla payout Rs720 process ho chuka hai."
        return "Your latest payout of Rs720 has been processed."

    if "weather" in query:
        if lang.startswith("hi"):
            return "Aaj aapke zone mein mausam risk medium hai."
        return "Weather risk in your zone is currently medium."

    if lang.startswith("hi"):
        return "Main plan, payout, aur weather sawalon mein madad kar sakta hoon."
    return "I can help with plan, payout, and weather questions."


def _call_gemini(system_prompt: str, user_prompt: str, api_key: str) -> str | None:
    # Prefer the newer Google Gen AI SDK if available.
    try:
        from google import genai as genai_sdk

        client = genai_sdk.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=user_prompt,
            config=genai_sdk.types.GenerateContentConfig(
                system_instruction=system_prompt,
            ),
        )
        text = (response.text or "").strip()
        return text or None
    except Exception:
        pass

    # Fall back to the legacy Generative AI SDK if that is what is installed.
    try:
        import google.generativeai as legacy_genai

        legacy_genai.configure(api_key=api_key)
        model = legacy_genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(
            [
                {"role": "user", "parts": [system_prompt]},
                {"role": "user", "parts": [user_prompt]},
            ]
        )
        text = (getattr(response, "text", "") or "").strip()
        return text or None
    except Exception:
        return None


def _generate_with_gemini(user_query: str, language: str, api_key: str) -> str | None:
    system_prompt = (
        "You are the FairRoute assistant. "
        "Answer only about plans, payouts, weather risk, and trigger status. "
        "Be concise and practical. "
        "Do not provide legal, medical, or financial advice. "
        "If user asks outside scope, politely refuse and redirect to supported topics."
    )

    user_prompt = (
        f"Preferred language: {language}. "
        f"User question: {user_query}. "
        "Keep the answer under 60 words."
    )

    return _call_gemini(system_prompt=system_prompt, user_prompt=user_prompt, api_key=api_key)


def generate_city_zone_suggestions(city: str, limit: int = 5) -> list[str]:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    normalized_city = city.strip()
    safe_limit = max(1, min(limit, 10))

    fallback = [
        "Central",
        "North",
        "South",
        "East",
        "West",
    ][:safe_limit]

    if not api_key or not normalized_city:
        return fallback

    system_prompt = (
        "You generate delivery zone names for Indian cities. "
        "Return only valid JSON with no markdown or explanation."
    )
    user_prompt = (
        f"City: {normalized_city}\n"
        f"Return exactly {safe_limit} major localities suitable as delivery zones.\n"
        "Output JSON in this shape: {\"zones\":[\"Area 1\",\"Area 2\"]}.\n"
        "Rules: short names, no duplicates, no numbering, no city name repetition unless needed."
    )

    text = _call_gemini(system_prompt=system_prompt, user_prompt=user_prompt, api_key=api_key)
    if not text:
        return fallback

    # Accept both clean JSON and noisy wrappers by extracting the first JSON object.
    match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if not match:
        return fallback

    try:
        payload = json.loads(match.group(0))
    except json.JSONDecodeError:
        return fallback

    raw_zones = payload.get("zones") if isinstance(payload, dict) else None
    if not isinstance(raw_zones, list):
        return fallback

    seen: set[str] = set()
    cleaned: list[str] = []
    for value in raw_zones:
        if not isinstance(value, str):
            continue
        area = value.strip()
        if not area:
            continue
        key = area.casefold()
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(area)
        if len(cleaned) >= safe_limit:
            break

    if not cleaned:
        return fallback

    while len(cleaned) < safe_limit:
        cleaned.append(fallback[len(cleaned)])

    return cleaned


def generate_assistant_reply(user_query: str, language: str) -> str:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return _fallback_assistant_reply(user_query, language)

    text = _generate_with_gemini(user_query=user_query, language=language, api_key=api_key)
    if text:
        return text

    return _fallback_assistant_reply(user_query, language)
