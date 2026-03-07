import os
import cv2
import numpy as np
import google.generativeai as genai
from PIL import Image

# --- GEMINI SETUP ---
# Replace with your actual API Key
genai.configure(api_key="xxxxxxxxx")
model = genai.GenerativeModel('gemini-2.5-flash')


def match_fingerprint(folder, sus_path):
    suspect_file = cv2.imread(sus_path)
    if suspect_file is None:
        print(
            f"Error: Could not read the suspect fingerprint image at {sus_path}")
        return None

    orb = cv2.ORB_create(nfeatures=1000)
    e_kp, e_des = orb.detectAndCompute(suspect_file, None)
    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)

    best_path, best_score, best_img, best_kp, best_matches = None, -1, None, None, None

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
                best_score, best_path, best_img, best_kp, best_matches = score, path, img, kp, good

    return best_path, best_score, best_img, best_kp, best_matches, e_kp


folder_input = "Suspect_Fingerprints"
evidence_input = "CrimeScene_Fingerprint.bmp"

result = match_fingerprint(folder_input, evidence_input)
# (Your existing RANSAC logic remains the same here...)
final_score = 0
if result and len(result[4]) >= 4:
    best_path, best_score, best_img, best_kp, best_matches, e_kp = result
    src_pts = np.float32(
        [e_kp[m.queryIdx].pt for m in result[4]]).reshape(-1, 1, 2)
    dst_pts = np.float32(
        [result[3][m.trainIdx].pt for m in result[4]]).reshape(-1, 1, 2)
    H, mask = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, 5.0)
    if H is not None:
        result[4] = [m for m, inlier in zip(result[4], mask) if inlier]
        final_score = len(result[4])

# --- GEMINI ANALYSIS SECTION ---
if result[0]:
    print(f"\n--- Sending Match to Gemini for Expert Analysis ---")

    # Save the matched pair as a temporary image to send to Gemini
    # Or just send the original crime scene print for analysis
    cv2.imwrite("match_evidence.png", result[0])
    img_for_gemini = Image.open("match_evidence.png")

    prompt = f"""
    You are a professional Forensic Latent Print Examiner. 
    Our automated system identified a match: {os.path.basename(result[0])}.
    The RANSAC algorithm confirmed {final_score} geometric inlier points.

    Please analyze the attached crime scene fingerprint image:
    1. Identify the general pattern (e.g., Ulnar Loop, Plain Arch, Accidental Whorl).
    2. Comment on the quality (mention any blood smears, noise, or filters present).
    3. Provide a 'Forensic Conclusion' on whether the match is reliable.
    Keep the tone professional and scientific for a hackathon presentation.
    """

    try:
        response = model.generate_content([prompt, img_for_gemini])
        print("\nFORENSIC EXPERT REPORT:")
        print("-" * 30)
        print(response.text)
        print("-" * 30)
    except Exception as e:
        print(f"Gemini Error: {e}")

# Visualizing results
if result[4]:
    vis = cv2.drawMatches(result[0], e_kp, result[2],
                          result[3], result[4][:50], None, flags=2)
    cv2.imshow("ORB + RANSAC + Gemini Analysis", vis)
    cv2.waitKey(0)
    cv2.destroyAllWindows()
    cv2.imwrite("final_match_visualization.png", vis)
