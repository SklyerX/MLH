"""
face_zones.py
-------------
Uses MediaPipe FaceMesh to detect a face in an image and crop it into
named skin zones. Only crops the zones that are passed in — skips the rest.

Usage:
    from face_zones import get_face_zones

    # Returns a dict of { zone_name: PIL.Image } for each requested zone
    cropped = get_face_zones("photo.jpg", ["forehead", "nose", "chin"])
"""

import cv2
import mediapipe as mp
import numpy as np
from PIL import Image


# ---------------------------------------------------------------------------
# MediaPipe setup
# ---------------------------------------------------------------------------
_mp_face_mesh = mp.solutions.face_mesh


# ---------------------------------------------------------------------------
# Zone definitions
# Each zone is defined as fractional offsets of the face bounding box:
#   (x_start, y_start, x_end, y_end)  — all values between 0.0 and 1.0
#
# Coordinate origin is the TOP-LEFT corner of the face bounding box.
# x goes RIGHT, y goes DOWN.
#
# These proportions were derived from standard MediaPipe landmark positions
# and give reliable crops across different face shapes and image sizes.
# ---------------------------------------------------------------------------
ZONE_PROPORTIONS = {
    "forehead": (0.15, 0.00, 0.85, 0.28),
    "nose":     (0.30, 0.30, 0.70, 0.65),
    "t_zone":   (0.30, 0.00, 0.70, 0.65),   # forehead centre + nose bridge
    "left_cheek":       (0.00, 0.35, 0.42, 0.72),
    "right_cheek":      (0.58, 0.35, 1.00, 0.72),
    "chin":             (0.25, 0.70, 0.75, 1.00),
    "under_eye_left":   (0.05, 0.28, 0.45, 0.48),
    "under_eye_right":  (0.55, 0.28, 0.95, 0.48),
    "lips":             (0.25, 0.62, 0.75, 0.85),
}

# "whole_face" is handled by the caller (backend/main.py) — it expands to
# all individual zone names before calling this function.
ALL_ZONE_NAMES = list(ZONE_PROPORTIONS.keys())


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_face_zones(image_path: str, selected_zones: list[str]) -> dict:
    """
    Detect the face in *image_path* and return cropped PIL Images for each
    zone listed in *selected_zones*.

    Parameters
    ----------
    image_path : str
        Path to the input image (JPEG, PNG, etc.).
    selected_zones : list[str]
        Subset of ALL_ZONE_NAMES to crop.  Unknown names are silently ignored.

    Returns
    -------
    dict[str, PIL.Image.Image]
        Mapping of zone_name → cropped PIL image.
        Only zones that could actually be cropped are included.

    Raises
    ------
    FileNotFoundError
        If *image_path* does not exist or cannot be read by OpenCV.
    ValueError
        If MediaPipe cannot detect a face in the image.
    """
    # --- Load image ---
    bgr_image = cv2.imread(image_path)
    if bgr_image is None:
        raise FileNotFoundError(
            f"Could not read image at '{image_path}'. "
            "Check the path and that the file is a valid image."
        )

    rgb_image = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2RGB)
    img_h, img_w = rgb_image.shape[:2]

    # --- Run MediaPipe FaceMesh ---
    with _mp_face_mesh.FaceMesh(
        static_image_mode=True,
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5,
    ) as face_mesh:
        results = face_mesh.process(rgb_image)

    if not results.multi_face_landmarks:
        raise ValueError(
            "No face detected in the image. "
            "Please upload a well-lit, front-facing photo."
        )

    # --- Compute face bounding box from landmarks ---
    landmarks = results.multi_face_landmarks[0].landmark

    # Convert normalised landmark coords to pixel coords
    xs = [lm.x * img_w for lm in landmarks]
    ys = [lm.y * img_h for lm in landmarks]

    face_x1 = int(min(xs))
    face_y1 = int(min(ys))
    face_x2 = int(max(xs))
    face_y2 = int(max(ys))

    face_w = face_x2 - face_x1
    face_h = face_y2 - face_y1

    if face_w <= 0 or face_h <= 0:
        raise ValueError("Face bounding box has zero size — image may be too small.")

    # --- Crop each requested zone ---
    pil_image = Image.fromarray(rgb_image)
    cropped_zones: dict[str, Image.Image] = {}

    for zone_name in selected_zones:
        proportions = ZONE_PROPORTIONS.get(zone_name)
        if proportions is None:
            # Unknown zone name — skip gracefully
            continue

        fx0, fy0, fx1, fy1 = proportions

        # Convert proportions to absolute pixel coordinates
        x1 = face_x1 + int(fx0 * face_w)
        y1 = face_y1 + int(fy0 * face_h)
        x2 = face_x1 + int(fx1 * face_w)
        y2 = face_y1 + int(fy1 * face_h)

        # Add a small padding (5 % of zone size) and clamp to image bounds
        pad_x = max(4, int((x2 - x1) * 0.05))
        pad_y = max(4, int((y2 - y1) * 0.05))

        x1 = max(0, x1 - pad_x)
        y1 = max(0, y1 - pad_y)
        x2 = min(img_w, x2 + pad_x)
        y2 = min(img_h, y2 + pad_y)

        # Skip if crop region is degenerate
        if x2 <= x1 or y2 <= y1:
            continue

        cropped_zones[zone_name] = pil_image.crop((x1, y1, x2, y2))

    return cropped_zones
