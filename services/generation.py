import sys
from google import genai
from PIL import Image
from io import BytesIO

client = genai.Client(api_key="AIzaSyBwQez_tD0GYKRtK90GwE6TdTE3Wmq8ipM")

output_path = sys.argv[1]
DNA_SEQUENCE = sys.argv[2]

visual_prompt = (
    f"A professional forensic sketch of a person based on this DNA sequence: {DNA_SEQUENCE}. "
    "High detail charcoal police drawing on textured paper and a neutral background. The sketch should be realistic and suitable for use in a police investigation include facts about the dna such as gender, ancestry, and other traits that can be identified from the dna sequence."
)

response = client.models.generate_content(
    model="gemini-3.1-flash-image-preview", contents=visual_prompt
)

for part in response.candidates[0].content.parts:
    if part.inline_data:
        image = Image.open(BytesIO(part.inline_data.data))
        image.save(f"{output_path}/dna_sketch.png")
