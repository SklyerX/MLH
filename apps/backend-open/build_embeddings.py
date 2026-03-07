import json
import os
import time
from dotenv import load_dotenv
from google import genai

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PRODUCTS_FILE = os.path.join(BASE_DIR, "products.json")
EMBEDDINGS_FILE = os.path.join(BASE_DIR, "product_embeddings.json")
EMBEDDING_MODEL = "models/gemini-embedding-001"

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError(
        "GEMINI_API_KEY is not set. Add it to your .env file before running this script."
    )

client = genai.Client(api_key=api_key)


def build_text_for_embedding(product: dict) -> str:
    return (
        f"{product['name']} by {product['brand']}. "
        f"Category: {product['category']}. "
        f"Targets: {', '.join(product['target_issues'])}. "
        f"Key ingredients: {', '.join(product['key_ingredients'])}. "
        f"Best for: {', '.join(product['skin_types'])} skin. "
        f"{product['description']}"
    )


def main():
    with open(PRODUCTS_FILE, "r", encoding="utf-8") as f:
        products = json.load(f)

    print(f"Building embeddings for {len(products)} products...")
    embedded = []

    for i, product in enumerate(products, start=1):
        text = build_text_for_embedding(product)

        try:
            result = client.models.embed_content(
                model=EMBEDDING_MODEL,
                contents=text,
            )

            embedded.append({
                **product,
                "embedding": result.embeddings[0].values,
            })

            print(f"  [{i}/{len(products)}] {product['name']}")
            time.sleep(0.3)

        except Exception as exc:
            print(f"  [{i}/{len(products)}] Failed for {product.get('name', 'unknown product')}: {exc}")

    with open(EMBEDDINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(embedded, f, ensure_ascii=False)

    print(f"\nDone. Saved {len(embedded)} embeddings to {EMBEDDINGS_FILE}")


if __name__ == "__main__":
    main()