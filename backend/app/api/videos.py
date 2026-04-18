from fastapi import APIRouter, UploadFile, File
import tempfile
import shutil

from app.services.video_processing import extract_frames

# Create router
router = APIRouter()

# Route for uploaded video (called by Next.js)
@router.post("/upload")
def upload_video(file: UploadFile = File(...)):

    # Create a temporary file instead of saving to /uploads
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_video:
        shutil.copyfileobj(file.file, temp_video)
        temp_video_path = temp_video.name

    # Process video
    frames = extract_frames(
        video_path=temp_video_path,
        output_dir="frames",
        every_n_frames=5
    )

    print("Video upload complete inside Python API")
    print(frames)
    return {
        "video": file.filename,
        "total_frames_extracted": len(frames),
        "frames": frames[:5]  # first 5 frames
    }