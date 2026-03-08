from google import genai
from google.genai import types
import os
from pydantic import BaseModel
from typing import Literal
import sys

client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

output_path = sys.argv[1]
DNA_SEQUENCE = sys.argv[2]


class PhysicalTraits(BaseModel):
    eye_color: Literal["Brown", "Blue", "Green", "Hazel"]
    hair_color: Literal["Black", "Blonde", "Brown", "Red"]
    hair_texture: Literal["Straight", "Wavy", "Curly"]
    skin_tone: Literal["Fair", "Medium", "Olive", "Dark"]
    facial_structure: str  # e.g., "Sharp jawline", "Round face"
    ancestry_clues: str  # e.g., "Northern European", "East Asian"


def gen_dna_sketch():
    analysis_prompt = f"Analyze this DNA sequence for phenotypic markers: {DNA_SEQUENCE}"

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=analysis_prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": PhysicalTraits,
        }
    )
    traits = response.content
    visual_prompt = (
        f"A professional forensic sketch of a person with the following traits: "
        f"{traits.eye_color} eyes, {traits.hair_color} {traits.hair_texture} hair, "
        f"{traits.skin_tone} skin, and {traits.facial_structure}. "
        f"The style should be a high-detail charcoal police drawing on textured paper."
    )

    image_response = client.models.generate_images(
        model="imagen-3.0-generate-002",
        prompt=visual_prompt,
        config=types.GenerateImagesConfig(
            number_of_images=1,
            aspect_ratio="1:1",
            person_generation="ALLOW_ADULT"
        )
    )

    image_response.generated_images[0].image.save(
        f"{output_path}/dna_sketch.png")

    return "dna_sketch.png"
