from pathlib import Path


def test_mail_skill_scaffold_exists():
    root = Path(__file__).resolve().parents[1]

    assert (root / "SKILL.md").exists()
    assert (root / "README.md").exists()
    assert (root / "INSTALLATION.md").exists()
    assert (root / "QUICK_REFERENCE.md").exists()
    assert (root / "examples" / "sample-email.md").exists()
    assert (root / "scripts" / "requirements.txt").exists()


def test_mail_skill_uses_directory_package_placeholders():
    root = Path(__file__).resolve().parents[1]
    skill_doc = (root / "SKILL.md").read_text(encoding="utf-8")
    readme_doc = (root / "README.md").read_text(encoding="utf-8")
    install_doc = (root / "INSTALLATION.md").read_text(encoding="utf-8")
    quick_ref_doc = (root / "QUICK_REFERENCE.md").read_text(encoding="utf-8")

    assert "{{script_dir}}" in skill_doc
    for document in (skill_doc, readme_doc, install_doc, quick_ref_doc):
        assert "$REPO_ROOT" not in document
        assert ".agents/skills/mail" not in document
