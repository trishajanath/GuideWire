from __future__ import annotations

import os

from google import genai


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


def generate_assistant_reply(user_query: str, language: str) -> str:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return _fallback_assistant_reply(user_query, language)

    try:
        client = genai.Client(api_key=api_key)

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

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=user_prompt,
            config=genai.types.GenerateContentConfig(
                system_instruction=system_prompt,
            ),
        )
        text = (response.text or "").strip()
        if text:
            return text
    except Exception:
        pass

    return _fallback_assistant_reply(user_query, language)
