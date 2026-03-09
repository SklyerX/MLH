"""
face_zones.py
-------------
Uses MediaPipe FaceLandmarker (tasks API) to detect a face in an image and crop it into
named skin zones. Only crops the zones that are passed in — skips the rest.

Usage:
    from face_zones import get_face_zones

    # Returns a dict of { zone_name: PIL.Image } for each requested zone
    cropped = get_face_zones("photo.jpg", ["forehead", "nose", "chin"])
"""

import os
import urllib.request

import cv2
import numpy as np
from PIL import Image

import mediapipe as mp
from mediapipe.tasks.python import vision
from mediapipe.tasks.python.vision import (
    FaceLandmarker,
    FaceLandmarkerOptions,
)

# ---------------------------------------------------------------------------
# MediaPipe FaceLandmarker setup (tasks API — works with MediaPipe 0.10+)
# ---------------------------------------------------------------------------

_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/"
    "face_landmarker/float16/1/face_landmarker.task"
)


def _get_model_path() -> str:
    """Return path to face_landmarker.task, downloading if needed."""
    cache_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_mp_cache")
    os.makedirs(cache_dir, exist_ok=True)
    model_path = os.path.join(cache_dir, "face_landmarker.task")
    if not os.path.isfile(model_path):
        urllib.request.urlretrieve(_MODEL_URL, model_path)
    return model_path

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
    "cheeks":   (0.00, 0.35, 1.00, 0.72),   # full width, both cheeks
    "chin":             (0.25, 0.70, 0.75, 1.00),
    "undereyes": (0.05, 0.28, 0.95, 0.48),   # full width, both under-eye areas
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

    # --- Run MediaPipe FaceLandmarker (tasks API) ---
    model_path = _get_model_path()
    options = FaceLandmarkerOptions(
        base_options=mp.tasks.BaseOptions(model_asset_path=model_path),
        num_faces=1,
        running_mode=vision.RunningMode.IMAGE,
    )
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)

    with FaceLandmarker.create_from_options(options) as landmarker:
        results = landmarker.detect(mp_image)

    if not results.face_landmarks:
        raise ValueError(
            "No face detected in the image. "
            "Please upload a well-lit, front-facing photo."
        )

    # --- Compute face bounding box from landmarks ---
    landmarks = results.face_landmarks[0]

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
