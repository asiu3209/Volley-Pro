"""Volleyball vision ML: pose features, synthetic training, skill/quality models."""

SKILL_LABELS = ("blocks", "digs", "pins", "setters", "serves")

# MediaPipe Pose landmark indices used for kinematics.
LM = {
    "l_shoulder": 11,
    "r_shoulder": 12,
    "l_elbow": 13,
    "r_elbow": 14,
    "l_wrist": 15,
    "r_wrist": 16,
    "l_hip": 23,
    "r_hip": 24,
    "l_knee": 25,
    "r_knee": 26,
    "l_ankle": 27,
    "r_ankle": 28,
}
