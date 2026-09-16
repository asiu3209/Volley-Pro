from app.services.gemini import action_type_label, action_types_public, _build_video_prompt


def test_digs_public_label_is_pass():
    labels = {row["value"]: row["label"] for row in action_types_public()}
    assert labels["digs"] == "Pass"
    assert action_type_label("digs") == "Pass"


def test_pass_prompt_prefers_pass_wording():
    prompt = _build_video_prompt("digs")
    assert "Pass" in prompt
    assert "Prefer **pass** / **passing**" in prompt
    assert "Do **not** call every pass a dig" in prompt
    # Should not coach using the raw storage key as the skill name
    assert "volleyball **digs**" not in prompt
