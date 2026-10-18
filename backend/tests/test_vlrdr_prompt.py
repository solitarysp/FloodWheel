from app.services.vlrdr_prompt import VLRDRPromptBuilder


def test_system_instruction_contains_core_landmarks():
    instruction = VLRDRPromptBuilder.SYSTEM_INSTRUCTION
    assert "Honda Wave" in instruction
    assert "exhaust pipe" in instruction
    assert "1/3 wheel submerged" in instruction
    assert "Door sill" in instruction
    assert "curb" in instruction


def test_user_prompt_angles():
    prompt_elevated = VLRDRPromptBuilder.get_user_prompt("elevated")
    assert "elevated" in prompt_elevated

    prompt_street = VLRDRPromptBuilder.get_user_prompt("street_level", location_hint="Nguyen Huu Canh")
    assert "street_level" in prompt_street
    assert "Nguyen Huu Canh" in prompt_street
