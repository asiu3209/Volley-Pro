import cv2


def enable_video_orientation(cap: cv2.VideoCapture) -> None:
    """Use OpenCV auto-orient metadata when available (e.g. phone-rotated clips)."""
    if hasattr(cv2, "CAP_PROP_ORIENTATION_AUTO"):
        cap.set(cv2.CAP_PROP_ORIENTATION_AUTO, 1)
