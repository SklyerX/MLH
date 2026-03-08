import os
import cv2
import numpy as np
import json
import sys

output = sys.argv[1]
folder = sys.argv[2]
sus_path = sys.argv[3]

if not output or not folder or not sus_path:
    print("One of the three required options is missing")
    sys.exit()

suspect_file = cv2.imread(sus_path)

orb = cv2.ORB_create(nfeatures=1000)
e_kp, e_des = orb.detectAndCompute(suspect_file, None)
bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)

best_path, best_score, best_img, best_kp, best_matches = None, -1, None, None, None
name_score_pairs = []
for name in os.listdir(folder):
    path = os.path.join(folder, name)
    img = cv2.imread(path)
    if img is None:
        continue
    kp, des = orb.detectAndCompute(img, None)
    if des is not None:
        matches = bf.match(e_des, des)
        matches = sorted(matches, key=lambda m: m.distance)
        good = [m for m in matches if m.distance < 60]
        score = len(good)

        if score > best_score:
            best_score, best_path, best_img, best_kp, best_matches = (
                score,
                path,
                img,
                kp,
                good,
            )
    name_score_pairs.append((name, score))

final_score = 0
if best_matches and len(best_matches) >= 4:
    src_pts = np.float32(
        [e_kp[m.queryIdx].pt for m in best_matches]).reshape(-1, 1, 2)
    dst_pts = np.float32([best_kp[m.trainIdx].pt for m in best_matches]).reshape(
        -1, 1, 2
    )
    H, mask = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, 5.0)
    if H is not None:
        best_matches = [m for m, inlier in zip(best_matches, mask) if inlier]
        final_score = len(best_matches)
# Replace this block:
total_feautures = len(e_kp)
results_list = []
for name, score in name_score_pairs:
    confidence = score / total_feautures if total_feautures > 0 else 0
    results_list.append(
        {"name": name, "score": score, "confidence": confidence})

# With this:

total_feautures = len(e_kp)
results_list = []
for name, score in name_score_pairs:
    confidence = (score / total_feautures) if total_feautures > 0 else 0
    results_list.append(
        {"name": name, "score": score, "confidence": round(confidence, 4)}
    )
json_output = json.dumps(results_list, indent=4)
print(json_output)
with open(f"{output}/fingerprint_results.json", "w") as f:
    f.write(json_output)
# Visualizing results
if best_matches:
    vis = cv2.drawMatches(
        suspect_file, e_kp, best_img, best_kp, best_matches[:50], None, flags=2
    )
    cv2.imshow("ORB + RANSAC + Gemini Analysis", vis)
    cv2.destroyAllWindows()
    sys.exit()
