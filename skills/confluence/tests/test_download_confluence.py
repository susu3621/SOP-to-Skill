import importlib.util
from pathlib import Path
import sys


SELF_HOSTED_URL = "https://confluence.example.com"


def load_download_module(module_name="download_confluence_under_test"):
    script_path = Path(__file__).resolve().parents[1] / "scripts" / "download_confluence.py"
    scripts_dir = str(script_path.parent)
    if scripts_dir not in sys.path:
        sys.path.insert(0, scripts_dir)
    spec = importlib.util.spec_from_file_location(module_name, script_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_validator_uses_self_hosted_paths_without_wiki():
    module = load_download_module()

    validator = module.ConfluenceValidator(SELF_HOSTED_URL, "user", "secret")

    assert validator.api_base == f"{SELF_HOSTED_URL}/rest/api"
    assert validator.web_base == SELF_HOSTED_URL


def test_validator_defaults_cloud_to_wiki_context():
    module = load_download_module("download_confluence_cloud")

    validator = module.ConfluenceValidator("https://example.atlassian.net", "user", "secret")

    assert validator.api_base == "https://example.atlassian.net/wiki/rest/api"
    assert validator.web_base == "https://example.atlassian.net/wiki"


def test_parser_does_not_force_env_file():
    module = load_download_module("download_confluence_parser")

    args = module.build_parser().parse_args(["123"])

    assert args.env_file is None
