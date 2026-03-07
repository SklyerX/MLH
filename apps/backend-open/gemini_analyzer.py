"""
gemini_analyzer.py
------------------
Sends cropped skin-zone images to the Gemini Vision API and returns a
structured JSON diagnosis for each zone.

Usage:
    import google.generativeai as genai
    from gemini_analyzer import analyze_zone, analyze_zones_parallel

    genai.configure(api_key="YOUR_API_KEY")

    # Analyze a single zone
    result = analyze_zone("forehead", pil_image, symptoms="itching on forehead")

    # Analyze multiple zones in parallel (recommended)
    results = analyze_zones_parallel(cropped_zones_dict, symptoms="itching")
"""

import json
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image
import google.generativeai as genai


# ---------------------------------------------------------------------------
# Per-zone context strings — tells Gemini which part of the face it sees
# ---------------------------------------------------------------------------
_ZONE_CONTEXT = {
    "forehead":         "You are examining a cropped image of the FOREHEAD.",
    "nose":             "You are examining a cropped image of the NOSE.",
    "t_zone":           "You are examining a cropped image of the T-ZONE "
                        "(the vertical strip covering the forehead and nose bridge).",
    "left_cheek":       "You are examining a cropped image of the LEFT CHEEK.",
    "right_cheek":      "You are examining a cropped image of the RIGHT CHEEK.",
    "chin":             "You are examining a cropped image of the CHIN and JAW area.",
    "under_eye_left":   "You are examining a cropped image of the LEFT UNDER-EYE area.",
    "under_eye_right":  "You are examining a cropped image of the RIGHT UNDER-EYE area.",
    "lips":             "You are examining a cropped image of the LIP area.",
}

# ---------------------------------------------------------------------------
# System prompt sent with every zone request
# ---------------------------------------------------------------------------
_SYSTEM_PROMPT = """\
You are a professional AI skin-analysis tool — NOT a medical doctor.
Your job is to examine the provided skin image patch and return a JSON diagnosis.

STRICT RULES:
1. Return ONLY a valid JSON object — no markdown fences, no preamble, no explanation.
2. Only report issues you can actually observe. Do not guess or fabricate.
3. If image quality is too poor to assess, set "confidence" below 0.5 and
   "issues_detected" to an empty list [].

Return exactly this JSON structure (all fields required):
{{
  "zone": "{zone_name}",
  "issues_detected": [],
  "severity": "clear",
  "skin_texture": "normal",
  "hydration": "normal",
  "redness": false,
  "pores": "minimal",
  "confidence": 0.9,
  "notes": ""
}}

Field value options:
- issues_detected : array of strings from this list only →
    ["acne", "blackheads", "whiteheads", "redness", "dryness", "oiliness",
     "hyperpigmentation", "dark spots", "uneven texture", "fine lines",
     "enlarged pores", "milia", "dark circles", "puffiness", "chapping"]
- severity        : "clear" | "mild" | "moderate" | "severe"
- skin_texture    : "smooth" | "normal" | "uneven" | "rough"
- hydration       : "well-hydrated" | "normal" | "dehydrated" | "oily"
- redness         : true | false
- pores           : "minimal" | "visible" | "enlarged"
- confidence      : float 0.0–1.0  (how clearly visible the skin is)
- notes           : one short optional sentence, or empty string ""
"""


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _build_prompt(zone_name: str, symptoms: str) -> str:
    """Combine the zone context, system prompt, and optional user symptoms."""
    context = _ZONE_CONTEXT.get(zone_name, f"You are examining the {zone_name.upper()} zone.")
    prompt = context + "\n\n" + _SYSTEM_PROMPT.format(zone_name=zone_name)

    if symptoms and symptoms.strip():
        prompt += (
            f"\n\nThe user also reports these symptoms: \"{symptoms.strip()}\". "
            "Factor this into your assessment where relevant."
        )

    return prompt


def _parse_response(raw_text: str, zone_name: str) -> dict:
    """
    Extract and parse the JSON object from Gemini's response.
    Handles cases where Gemini wraps the JSON in markdown code fences.
    """
    text = raw_text.strip()

    # Strip ```json ... ``` or ``` ... ``` fences if present
    fence_pattern = r"```(?:json)?\s*([\s\S]*?)\s*```"
    match = re.search(fence_pattern, text)
    if match:
        text = match.group(1).strip()

    # Attempt to parse
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        # Try to find the first { ... } block in the response
        brace_match = re.search(r"\{[\s\S]*\}", text)
        if brace_match:
            try:
                # Some versions of Gemini might put multiple JSONs or trailing text
                # Try to extract the first balanced JSON
                data = json.loads(brace_match.group())
            except json.JSONDecodeError:
                return _fallback_result(zone_name, reason="Could not parse Gemini response as JSON.")
        else:
            return _fallback_result(zone_name, reason="No JSON object found in Gemini response.")

    # Ensure the zone field is always correct (in case Gemini changes it)
    data["zone"] = zone_name
    return data


def _fallback_result(zone_name: str, reason: str = "") -> dict:
    """Return a safe empty result when analysis fails."""
    return {
        "zone": zone_name,
        "issues_detected": [],
        "severity": "unknown",
        "skin_texture": "unknown",
        "hydration": "unknown",
        "redness": False,
        "pores": "unknown",
        "confidence": 0.0,
        "notes": reason or "Analysis unavailable.",
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def analyze_zone(zone_name: str, zone_image: Image.Image, symptoms: str = "") -> dict:
    """
    Send one cropped zone image to Gemini Vision and return a diagnosis dict.

    Parameters
    ----------
    zone_name : str
        One of the keys in _ZONE_CONTEXT (e.g. "forehead", "nose").
    zone_image : PIL.Image.Image
        The cropped image for this zone.
    symptoms : str, optional
        Free-text symptoms the user typed in (e.g. "itching on forehead").

    Returns
    -------
    dict
        Diagnosis with keys: zone, issues_detected, severity, skin_texture,
        hydration, redness, pores, confidence, notes.
    """
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = _build_prompt(zone_name, symptoms)
        response = model.generate_content([prompt, zone_image])
        return _parse_response(response.text, zone_name)

    except Exception as exc:
        # Catch ALL exceptions so one bad zone never crashes the whole pipeline
        return _fallback_result(zone_name, reason=f"Error during analysis: {str(exc)}")


def analyze_zones_parallel(
    cropped_zones: dict,
    symptoms: str = "",
    max_workers: int = 4,
) -> dict:
    """
    Analyze multiple zones concurrently and return all results.

    Parameters
    ----------
    cropped_zones : dict[str, PIL.Image.Image]
        Output of face_zones.get_face_zones().
    symptoms : str, optional
        User-provided symptom text, passed to every zone analysis.
    max_workers : int
        Number of parallel threads (default 4 — one per typical zone batch).

    Returns
    -------
    dict[str, dict]
        Mapping of zone_name → diagnosis dict.
    """
    results: dict[str, dict] = {}

    if not cropped_zones:
        return results

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all zone analyses at once
        future_to_zone = {
            executor.submit(analyze_zone, zone_name, zone_image, symptoms): zone_name
            for zone_name, zone_image in cropped_zones.items()
        }

        # Collect results as they complete
        for future in as_completed(future_to_zone):
            zone_name = future_to_zone[future]
            try:
                results[zone_name] = future.result()
            except Exception as exc:
                # Should never reach here because analyze_zone catches internally,
                # but keep as a safety net.
                results[zone_name] = _fallback_result(
                    zone_name, reason=f"Unexpected error: {str(exc)}"
                )

    return results