from app.services.gemini import action_type_label, action_types_public, _build_video_prompt


def test_digs_public_label_is_pass():
    labels = {row["value"]: row["label"] for row in action_types_public()}
    assert labels["digs"] in {"Pass", "Dig/Pass"}
    assert action_type_label("digs") in {"Pass", "Dig/Pass"}


def test_pass_prompt_includes_pass_metrics():
    prompt = _build_video_prompt("digs")
    assert "skill_metrics" in prompt
    assert "pass_form" in prompt
    assert "ball_height" in prompt
    assert "placement_to_target" in prompt
    assert "0–100" in prompt
    assert "volleyball **digs**" not in prompt


def test_block_prompt_includes_block_metrics():
    prompt = _build_video_prompt("blocks")
    assert "block_timing" in prompt
    assert "block_quality" in prompt
    assert "block_form" in prompt


def test_attack_prompt_includes_approach_timing():
    prompt = _build_video_prompt("pins")
    assert "approach_timing" in prompt
    assert "player_form" in prompt
