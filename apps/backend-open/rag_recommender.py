"""
rag_recommender.py
------------------
RAG-based product recommender using Gemini Text Embeddings + cosine similarity.

Usage:
    from rag_recommender import load_embeddings, get_recommendations

    # Load once at app startup
    products = load_embeddings("product_embeddings.json")

    # Call on each user request
    results = get_recommendations(
        ordered_findings=[
            {"finding": "acne (cheeks, moderate)", "zone": "cheeks", "severity": "moderate", "issue": "acne"},
        ],
        symptoms="itching on my forehead, burning on cheeks",
        embedded_products=products,
        top_k=3
    )
    # results is a list of:
    # { "product": {...}, "reason": "acne", "usage": "apply once daily" }
"""
import os
from dotenv import load_dotenv
from google import genai
load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

import json
import re
import numpy as np


# ---------------------------------------------------------------------------
# Load embeddings from disk
# ---------------------------------------------------------------------------

def load_embeddings(filepath: str) -> list[dict]:
    """
    Load product_embeddings.json from disk.
    Call this ONCE at app startup and pass the result to get_recommendations().
    """
    try:
        with open(filepath, "r") as f:
            data = json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return []

    # Convert embedding lists back to numpy arrays for fast math
    for product in data:
        product["embedding"] = np.array(product["embedding"], dtype=np.float32)

    return data


# ---------------------------------------------------------------------------
# Cosine similarity search
# ---------------------------------------------------------------------------

def _cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    """Return cosine similarity between two vectors (0.0 to 1.0)."""
    norm_a = np.linalg.norm(vec_a)
    norm_b = np.linalg.norm(vec_b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(vec_a, vec_b) / (norm_a * norm_b))


def _search_products(query: str, embedded_products: list[dict], top_k: int) -> list[dict]:
    """
    Embed the query and return the top_k most similar products.
    Returns full product dicts (without the embedding vector).
    """
    query_result = client.models.embed_content(
        model="models/gemini-embedding-001",
        contents=query,)
    query_vector = np.array(query_result.embeddings[0].values, dtype=np.float32)

    scored = []
    for product in embedded_products:
        score = _cosine_similarity(query_vector, product["embedding"])
        scored.append((score, product))

    scored.sort(key=lambda x: x[0], reverse=True)
    top_products = scored[:top_k]

    # Strip embedding vectors — they're large and Gemini doesn't need them
    clean = []
    for _, product in top_products:
        p = {k: v for k, v in product.items() if k != "embedding"}
        clean.append(p)

    return clean


# ---------------------------------------------------------------------------
# Ask Gemini to write reasons for each recommendation
# ---------------------------------------------------------------------------

def _generate_reasons(
    top_products: list[dict],
    ordered_findings: list[dict],
    symptoms: str,
) -> list[dict]:
    """
    Ask Gemini to return short reason (issue tag) + usage instruction per product.
    Returns a list of { product, reason, usage } dicts.
    """
    findings_text = "; ".join(f["finding"] for f in ordered_findings[:10]) if ordered_findings else "general skin care"
    symptoms_text = f' The user also reports: "{symptoms}".' if symptoms and symptoms.strip() else ""

    product_list_text = "\n".join([
        f'{i+1}. {p["name"]} by {p["brand"]} — '
        f'Key ingredients: {", ".join(p["key_ingredients"])}. '
        f'{p["description"]}'
        for i, p in enumerate(top_products)
    ])

    prompt = f"""
You are a skincare expert. For each product below, return:
1. "reason": a SHORT issue tag only (1–3 words). Examples: "acne", "blackheads", "clogged pores", "dryness", "dark circles"
2. "usage": a SHORT instruction (max 10 words). Examples: "wash every morning and night", "apply once daily", "apply before bed"

Customer's issues (ordered by severity): {findings_text}.{symptoms_text}

Products:
{product_list_text}

Return ONLY a JSON array of objects, one per product, same order:
[{{"reason": "acne", "usage": "apply once daily"}}, {{"reason": "blackheads", "usage": "wash morning and night"}}]
No markdown, no preamble, just the JSON array.
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )

    try:
        text = response.text.strip()
        if text.startswith("```"):
            match = re.search(r"\[[\s\S]*\]", text)
            text = match.group() if match else "[]"
        items = json.loads(text)
    except Exception:
        items = []

    results = []
    for i, product in enumerate(top_products):
        item = items[i] if i < len(items) and isinstance(items[i], dict) else {}
        reason = item.get("reason", "skincare") if isinstance(item.get("reason"), str) else "skincare"
        usage = item.get("usage", "use as directed") if isinstance(item.get("usage"), str) else "use as directed"
        results.append({"product": product, "reason": reason, "usage": usage})

    return results


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_recommendations(
    ordered_findings: list[dict],
    symptoms: str,
    embedded_products: list[dict],
    top_k: int = 3,
) -> list[dict]:
    """
    Find the best matching products for a user's skin findings, ordered by severity
    (most severe issues first).

    Parameters
    ----------
    ordered_findings : list[dict]
        List of {"finding": str, "zone": str, "severity": str, "issue": str},
        sorted by severity (most severe first). From main._build_ordered_findings().
    symptoms : str
        Free-text symptoms the user typed (e.g. "itching on forehead").
    embedded_products : list[dict]
        Output of load_embeddings() — call once at startup.
    top_k : int
        Number of products to recommend (default 3).

    Returns
    -------
    list[dict]
        Each item has:
          "product" → full product dict with name, brand, price, image_url, buy_link
          "reason"  → short issue tag (e.g. "acne", "blackheads")
          "usage"   → short usage instruction (e.g. "wash every morning and night")
    """
    if not embedded_products:
        return []

    # Build a rich search query from ordered findings (most severe first)
    query_parts = []
    if ordered_findings:
        findings_str = ", ".join(f["finding"] for f in ordered_findings[:5])
        query_parts.append(f"Skincare products for: {findings_str}")
    if symptoms and symptoms.strip():
        query_parts.append(f"User reports: {symptoms.strip()}")

    if not query_parts:
        query_parts.append("general skincare moisturizer")

    query = ". ".join(query_parts)

    try:
        top_products = _search_products(query, embedded_products, top_k)
        recommendations = _generate_reasons(top_products, ordered_findings, symptoms)
        return recommendations

    except Exception as exc:
        # Return safe fallback so the app never crashes here
        return [
            {
                "product": {k: v for k, v in p.items() if k != "embedding"},
                "reason": "skincare",
                "usage": "use as directed",
            }
            for p in embedded_products[:top_k]
        ]