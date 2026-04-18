import os
import numpy as np
import cv2
import shutil

def extract_frames(video_path: str, output_dir: str, every_n_frames: int = 5):

    """
    video_path: path for stored video in s3
    output_dir: location of storing video frames
    every_n_frames: when to extract a frame
    """

    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)
    # Create output directory if it doesn't already exist
    os.makedirs(output_dir, exist_ok=True)

    # Open video file using OpenCV
    cap = cv2.VideoCapture(video_path)

    # Get frames per second (used for timestamp calculation)
    fps = cap.get(cv2.CAP_PROP_FPS)

    count = 0
    saved_count = 0

    # Stores metadata for each extracted frame (path, timestamp, etc.)
    frames_metadata = []

    # Get total number of frames in the video
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    # Define how many frames we want to extract in total
    target_frames = 5

    # Pick evenly spaced frame indices across the video
    frame_indices = np.linspace(0, total_frames - 1, target_frames, dtype=int)

    index_set = set(frame_indices)

    # Loop through every frame in the video
    while True:
        ret, frame = cap.read()

        # Stop if no more frames are available
        if not ret:
            break

        if count in index_set:

            timestamp = count / fps if fps else 0

            frame_path = os.path.join(
                output_dir, f"frame_{saved_count}.jpg"
            )

            cv2.imwrite(frame_path, frame)

            frames_metadata.append({
                "frame_index": count,
                "timestamp": round(timestamp, 2),
                "path": frame_path,
            })

            saved_count += 1

        count += 1

    cap.release()

    return frames_metadata