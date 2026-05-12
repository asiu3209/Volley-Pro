"""Minimal OpenCV helpers for video upload (preview frame extraction)."""

import cv2


def enable_video_orientation(cap: cv2.VideoCapture) -> None:
    """Use container metadata so phone-captured clips read upright in OpenCV."""
    if hasattr(cv2, "CAP_PROP_ORIENTATION_AUTO"):
        cap.set(cv2.CAP_PROP_ORIENTATION_AUTO, 1)
