import cv2
import os

"""
video_path: path for stored video in s3
output_dir: location of storing video frames
every_n_frames: when to extract a frame
"""

def extract_frames(video_path: str, output_dir: str, every_n_frames: int = 5):
    #Create storage dir if it doesnt exist alr
    os.makedirs(output_dir, exist_ok=True)
    #Open video for framing
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    #Count frames
    count = 0
    #What we actually save
    saved_count = 0

    frames_metadata = []

    while True:
        #Read next frame
        ret, frame = cap.read()
        #Frame doesnt exist and is end of vid
        if not ret:
            break
        
        if(count % every_n_frames == 0):
            timestamp = count / fps
            #Creates file path for image
            frame_path = os.path.join(
                output_dir, f"frame_{saved_count}.jpg"
            )
            #Save frame
            cv2.imwrite(frame_path,frame)

            frames_metadata.append({
                "frame_index":count,
                "timestamp": round(timestamp,2),
                "path": frame_path,
            })
            saved_count+=1
        count+=1
    cap.release()
    return saved_count