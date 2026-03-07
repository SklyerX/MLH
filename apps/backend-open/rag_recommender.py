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
        detected_issues=["acne", "oiliness", "enlarged pores"],
        symptoms="itching on my forehead, burning on cheeks",
        embedded_products=products,
        top_k=3
    )
    # results is a list of:
    # { "product": { name, brand, price, image_url, buy_link, ... }, "reason": "..." }
"""

import json
import numpy as np
import google.generativeai as genai


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
    query_result = genai.embed_content(
        model="models/gemini-embedding-001",
        content=query,
        task_type="retrieval_query",
    )
    query_vector = np.array(query_result["embedding"], dtype=np.float32)

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
    detected_issues: list[str],
    symptoms: str,
) -> list[dict]:
    """
    Ask Gemini to write a short personalised reason for each product.
    Returns a list of { product, reason } dicts.
    """
    issues_text = ", ".join(detected_issues) if detected_issues else "general skin care"
    symptoms_text = f' The user also reports: "{symptoms}".' if symptoms and symptoms.strip() else ""

    product_list_text = "\n".join([
        f'{i+1}. {p["name"]} by {p["brand"]} — '
        f'Key ingredients: {", ".join(p["key_ingredients"])}. '
        f'{p["description"]}'
        for i, p in enumerate(top_products)
    ])

    prompt = f"""
You are a skincare expert writing product recommendations for a customer.

The customer's skin analysis detected these issues: {issues_text}.{symptoms_text}

Here are the matched products:
{product_list_text}

For each product, write ONE short sentence (max 20 words) explaining exactly why it helps THIS customer's specific issues.
Be specific — mention the ingredient and the issue it addresses.

Return ONLY a JSON array of strings, one reason per product, in the same order.
Example: ["Salicylic acid unclogs pores and reduces your blackheads.", "Ceramides repair your dry skin barrier."]
No markdown, no preamble, just the JSON array.
"""

    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content(prompt)

    try:
        text = response.text.strip()
        # Strip markdown fences if present
        if text.startswith("```"):
            import re
            match = re.search(r"\[[\s\S]*\]", text)
            text = match.group() if match else "[]"
        reasons = json.loads(text)
    except Exception:
        # Fallback: generic reason for each product
        reasons = [
            f"Recommended for your {issues_text}."
            for _ in top_products
        ]

    return [
        {"product": product, "reason": reason}
        for product, reason in zip(top_products, reasons)
    ]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_recommendations(
    detected_issues: list[str],
    symptoms: str,
    embedded_products: list[dict],
    top_k: int = 3,
) -> list[dict]:
    """
    Find the best matching products for a user's detected skin issues and symptoms.

    Parameters
    ----------
    detected_issues : list[str]
        Issues found by gemini_analyzer (e.g. ["acne", "oiliness"]).
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
          "reason"  → one sentence explaining why it suits this user
    """
    if not embedded_products:
        return []

    # Build a rich search query from issues + symptoms
    query_parts = []
    if detected_issues:
        query_parts.append(f"Skincare products for: {', '.join(detected_issues)}")
    if symptoms and symptoms.strip():
        query_parts.append(f"User reports: {symptoms.strip()}")

    if not query_parts:
        query_parts.append("general skincare moisturizer")

    query = ". ".join(query_parts)

    try:
        top_products = _search_products(query, embedded_products, top_k)
        recommendations = _generate_reasons(top_products, detected_issues, symptoms)
        return recommendations

    except Exception as exc:
        # Return safe fallback so the app never crashes here
        return [
            {
                "product": {k: v for k, v in p.items() if k != "embedding"},
                "reason": "Recommended based on your skin analysis."
            }
            for p in embedded_products[:top_k]
        ]