"""
main.py
-------
Flask backend entry point for the Skin Analyzer app.

Endpoints:
    POST /analyze   — receives image + zones + symptoms, returns full skin report

Run:
    cd backend
    python3 main.py
"""

import json
import os
import re
import tempfile
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

from google import genai
from face_zones import ALL_ZONE_NAMES, get_face_zones
from gemini_analyzer import analyze_zones_parallel
from rag_recommender import get_recommendations, load_embeddings

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError(
        "GEMINI_API_KEY not found. "
        "Make sure you have a .env file in the backend/ folder with GEMINI_API_KEY=your_key"
    )

client = genai.Client(api_key=api_key)

app = Flask(__name__)
CORS(app)  # Allow requests from the frontend at localhost:3000

# ---------------------------------------------------------------------------
# Load product embeddings ONCE at startup (not on every request)
# ---------------------------------------------------------------------------

EMBEDDINGS_FILE = os.path.join(os.path.dirname(__file__), "product_embeddings.json")

if not os.path.exists(EMBEDDINGS_FILE):
    raise RuntimeError(
        "product_embeddings.json not found. "
        "Run  python3 build_embeddings.py  first to generate it."
    )

print("Loading product embeddings...")
embedded_products = load_embeddings(EMBEDDINGS_FILE)
print(f"Loaded {len(embedded_products)} products. Ready.")

# ---------------------------------------------------------------------------
# Allowed image file extensions
# ---------------------------------------------------------------------------

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def _allowed_file(filename: str) -> bool:
    ext = os.path.splitext(filename)[1].lower()
    return ext in ALLOWED_EXTENSIONS


# ---------------------------------------------------------------------------
# Helper: build a plain-English summary from zone results
# ---------------------------------------------------------------------------

def _build_summary(zone_results: dict, ordered_findings: list[dict], symptoms: str) -> str:
    """Build a plain-English summary from zone results and ordered findings."""
    if not zone_results:
        summary = "No areas were analyzed."
    elif not ordered_findings:
        summary = "Your skin looks clear across all analyzed zones."
    else:
        # Use findings_detailed from zones for a specific summary
        findings_parts = []
        for r in zone_results.values():
            fd = (r or {}).get("findings_detailed", "").strip()
            if fd:
                findings_parts.append(fd)
        if findings_parts:
            summary = " ".join(findings_parts)
        else:
            # Fallback: use ordered findings
            top_strs = [f["finding"] for f in ordered_findings[:5]]
            summary = f"Main concerns: {'; '.join(top_strs)}."

    if symptoms and symptoms.strip():
        summary += f" You also reported: {symptoms.strip()}."

    return summary


def _parse_severity_from_finding(finding: str) -> str | None:
    """
    Parse severity from finding string. Format: "issue (zone, severity)" or "mild X (zone)".
    Returns severity if found, else None.
    """
    # Match (zone, severity) - e.g. "clogged pores (nose, moderate)" -> "moderate"
    m = re.search(r"\([^,]*,\s*([^)]+)\)", finding)
    if m:
        s = m.group(1).strip().lower()
        if s in ("severe", "moderate", "mild", "clear", "extreme"):
            return "severe" if s == "extreme" else s
    # Match leading severity: "mild blackheads (forehead)", "extreme acne"
    for word in ("extreme", "severe", "moderate", "mild"):
        if finding.lower().startswith(word + " "):
            return "severe" if word == "extreme" else word
    return None


def _build_ordered_findings(zone_results: dict) -> list[dict]:
    """
    Build a list from zone_results, sorted by severity (most severe first).
    Each item: {"finding": str, "zone": str, "severity": str, "issue": str}
    Severity is parsed from the finding string when present; else uses zone severity.
    """
    severity_order = {"severe": 4, "moderate": 3, "mild": 2, "clear": 1, "unknown": 0}

    findings: list[dict] = []
    for zone_name, result in zone_results.items():
        if not result:
            continue
        zone_severity = result.get("severity", "clear") or "clear"
        issues = result.get("issues_detected", [])
        for issue_str in issues:
            if isinstance(issue_str, str) and issue_str.strip():
                finding = issue_str.strip()
                severity = _parse_severity_from_finding(finding) or zone_severity
                findings.append({
                    "finding": finding,
                    "zone": zone_name,
                    "severity": severity,
                    "issue": finding,
                })

    # Sort by severity (most severe first)
    findings.sort(
        key=lambda f: severity_order.get(f["severity"].lower(), 0),
        reverse=True,
    )
    return findings


# ---------------------------------------------------------------------------
# POST /analyze
# ---------------------------------------------------------------------------

@app.route("/analyze", methods=["POST"])
def analyze():
    # ---- 1. Validate image ------------------------------------------------
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded. Please attach an image file."}), 400

    image_file = request.files["image"]

    if not image_file.filename:
        return jsonify({"error": "Image file has no filename."}), 400

    if not _allowed_file(image_file.filename):
        return jsonify({
            "error": (
                f"Unsupported file type '{os.path.splitext(image_file.filename)[1]}'. "
                "Please upload a JPG, PNG, or WEBP image."
            )
        }), 400

    # ---- 2. Validate zones ------------------------------------------------
    raw_zones = request.form.get("zones", "[]")
    try:
        selected_zones: list[str] = json.loads(raw_zones)
    except json.JSONDecodeError:
        return jsonify({"error": "Invalid zones format. Expected a JSON array."}), 400

    if not selected_zones:
        return jsonify({"error": "No zones selected. Please select at least one zone."}), 400

    # Expand "whole_face" to every individual zone
    if "whole_face" in selected_zones:
        selected_zones = ALL_ZONE_NAMES

    # Remove any unrecognised zone names
    selected_zones = [z for z in selected_zones if z in ALL_ZONE_NAMES]
    if not selected_zones:
        return jsonify({
            "error": "None of the selected zones are recognised. "
                     f"Valid zones: {', '.join(ALL_ZONE_NAMES)}"
        }), 400

    # ---- 3. Optional symptoms text ----------------------------------------
    symptoms: str = request.form.get("symptoms", "").strip()

    # ---- 4. Save image to a temp file -------------------------------------
    suffix = os.path.splitext(image_file.filename)[1].lower() or ".jpg"
    tmp_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            image_file.save(tmp.name)
            tmp_path = tmp.name

        # ---- 5. Detect face and crop zones --------------------------------
        try:
            cropped_zones = get_face_zones(tmp_path, selected_zones)
        except FileNotFoundError as exc:
            return jsonify({"error": str(exc)}), 400
        except ValueError as exc:
            # No face detected
            return jsonify({"error": str(exc)}), 422

        if not cropped_zones:
            return jsonify({
                "error": "Could not crop any zones from the image. "
                         "Please use a well-lit, front-facing photo."
            }), 422

        # ---- 6. Analyze zones with Gemini Vision (parallel) ---------------
        zone_results: dict = analyze_zones_parallel(
            cropped_zones=cropped_zones,
            symptoms=symptoms,
            max_workers=4,
        )

        # ---- 7. Build ordered findings (zone + issue + severity, most severe first) ----
        ordered_findings = _build_ordered_findings(zone_results)
        top_issues = [f["finding"] for f in ordered_findings[:5]]  # for backward compat

        # ---- 8. RAG product recommendations (ordered by severity) ----------------
        recommendations = get_recommendations(
            ordered_findings=ordered_findings,
            symptoms=symptoms,
            embedded_products=embedded_products,
            top_k=3,
        )

        # ---- 9. Build summary ---------------------------------------------------
        summary = _build_summary(zone_results, ordered_findings, symptoms)

        # ---- 10. Return full response -------------------------------------------
        return jsonify({
            "summary": summary,
            "top_issues": top_issues,
            "ordered_findings": ordered_findings,
            "zones": zone_results,
            "recommendations": recommendations,
            "zones_analyzed": list(zone_results.keys()),
        })

    except Exception as exc:
        # Catch-all so the server never returns a raw 500 traceback to the user
        app.logger.error(f"Unexpected error during analysis: {exc}", exc_info=True)
        return jsonify({
            "error": "An unexpected error occurred during analysis. Please try again."
        }), 500

    finally:
        # Always clean up the temp file
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


# ---------------------------------------------------------------------------
# Health check — useful to confirm the server is running
# ---------------------------------------------------------------------------

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "products_loaded": len(embedded_products),
    })


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(debug=True, port=5000)