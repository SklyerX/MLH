from dp import seq_align
from Bio import SeqIO
import json

# ── Load crime scene DNA (Homo sapiens only) ──────────────────────────────────
crime_scene_sequences = {}
for record in SeqIO.parse("crime_scene_dna.fasta", "fasta"):
    organism = "Not Found"
    for part in record.description.split("|")[1:]:
        p = part.strip()
        if not p or "=" not in p:
            continue
        key, value = p.split("=", 1)
        if key.strip() == "organism":
            organism = value.strip()

    if organism == "Homo sapiens":
        crime_scene_sequences[record.id] = str(record.seq)

print(f"Crime scene human samples: {list(crime_scene_sequences.keys())}")

suspect_sequences = {}
for record in SeqIO.parse("suspect_dna.fasta", "fasta"):
    organism = "Not Found"
    for part in record.description.split("|")[1:]:
        p = part.strip()
        if not p or "=" not in p:
            continue
        key, value = p.split("=", 1)
        if key.strip() == "organism":
            organism = value.strip()

    if organism == "Homo sapiens":
        suspect_sequences[record.id] = str(record.seq)

print(f"Human suspects loaded: {list(suspect_sequences.keys())}")


name_score_pairs = []
for suspect_id, suspect_seq in suspect_sequences.items():
    best_score = 0
    scene_scores = {}
    for scene_id, scene_seq in crime_scene_sequences.items():
        score = seq_align(suspect_seq, scene_seq)
        scene_scores[scene_id] = score
        if score > best_score:
            best_score = score
    name_score_pairs.append((suspect_id, best_score, scene_scores))

# ── Normalize to 0→1 ──────────────────────────────────────────────────────────
raw_scores = [s for _, s, _ in name_score_pairs]
min_score = min(raw_scores) if raw_scores else 0
max_score = max(raw_scores) if raw_scores else 1
score_range = max_score - min_score if max_score != min_score else 1

# ── Build & export JSON ───────────────────────────────────────────────────────
results_list = []
for suspect_id, best_score, scene_scores in name_score_pairs:
    confidence = (best_score - min_score) / score_range
    results_list.append({
        "suspect_id": suspect_id,
        "best_alignment_score": best_score,
        "confidence": round(confidence, 4),
        "scene_breakdown": scene_scores
    })

results_list.sort(key=lambda x: x["confidence"], reverse=True)

json_output = json.dumps(results_list, indent=4)
print(json_output)
with open("dna_results.json", "w") as f:
    f.write(json_output)
