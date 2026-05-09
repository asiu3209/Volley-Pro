from app.services.gemini import analyze_frames_with_gemini

frames = [
    "frames/analysis_video_tmp1tejry1b.mp4/frame_0.jpg",
    "frames/analysis_video_tmp1tejry1b.mp4/frame_1.jpg",
    "frames/analysis_video_tmp1tejry1b.mp4/frame_2.jpg",
]

result = analyze_frames_with_gemini(
    frame_paths=frames,
    action_type="digs"
)

print("\nGEMINI RESULT:\n")
print(result)
