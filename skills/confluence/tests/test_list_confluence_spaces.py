import importlib.util
from pathlib import Path
import sys
import types

import pytest


SELF_HOSTED_URL = "https://confluence.example.com"


def load_spaces_module(module_name="list_confluence_spaces_under_test"):
    script_path = Path(__file__).resolve().parents[1] / "scripts" / "list_confluence_spaces.py"
    assert script_path.exists(), f"Expected script at {script_path}"

    scripts_dir = str(script_path.parent)
    if scripts_dir not in sys.path:
        sys.path.insert(0, scripts_dir)

    spec = importlib.util.spec_from_file_location(module_name, script_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_script_imports_without_requests_dependency(monkeypatch):
    monkeypatch.setitem(sys.modules, "requests", None)

    module = load_spaces_module("list_confluence_spaces_stdlib")

    assert hasattr(module, "build_parser")


def test_load_config_requires_env_vars(monkeypatch):
    helper = types.ModuleType("confluence_auth")

    def fake_get_confluence_credentials(env_file=None):
        raise ValueError("No Confluence credentials found")

    helper.get_confluence_credentials = fake_get_confluence_credentials
    monkeypatch.setitem(sys.modules, "confluence_auth", helper)

    module = load_spaces_module("list_confluence_spaces_env")

    with pytest.raises(ValueError, match="No Confluence credentials found"):
        module.load_config_from_env()


def test_load_config_uses_shared_credential_discovery(monkeypatch):
    helper = types.ModuleType("confluence_auth")

    requested = {}

    def fake_get_confluence_credentials(env_file=None):
        requested["env_file"] = env_file
        return {
            "url": SELF_HOSTED_URL,
            "username": "user@example.com",
            "token": "secret",
        }

    helper.get_confluence_credentials = fake_get_confluence_credentials
    monkeypatch.setitem(sys.modules, "confluence_auth", helper)

    module = load_spaces_module("list_confluence_spaces_helper")

    config = module.load_config_from_env("/tmp/project.env")

    assert requested == {"env_file": "/tmp/project.env"}
    assert config == {
        "web_base": SELF_HOSTED_URL,
        "api_base": f"{SELF_HOSTED_URL}/rest/api",
        "username": "user@example.com",
        "token": "secret",
    }


def test_positive_int_rejects_zero():
    module = load_spaces_module("list_confluence_spaces_limit")

    with pytest.raises(Exception, match="positive integer"):
        module.positive_int("0")


def test_build_request_params_applies_optional_filters():
    module = load_spaces_module("list_confluence_spaces_params")

    params = module.build_request_params(limit=25, space_type="global", status="current")

    assert params == {
        "limit": 25,
        "type": "global",
        "status": "current",
    }


def test_parser_accepts_env_file():
    module = load_spaces_module("list_confluence_spaces_parser")

    args = module.build_parser().parse_args(["--env-file", "/tmp/project.env"])

    assert args.env_file == "/tmp/project.env"


def test_fetch_spaces_uses_expected_request_shape():
    module = load_spaces_module("list_confluence_spaces_fetch")

    config = {
        "api_base": "https://example.atlassian.net/wiki/rest/api",
        "username": "user",
        "token": "secret",
    }

    calls = {}

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"results": []}

    class FakeSession:
        def get(self, url, params, auth, timeout):
            calls["url"] = url
            calls["params"] = params
            calls["auth"] = auth
            calls["timeout"] = timeout
            return FakeResponse()

    payload = module.fetch_spaces(
        config,
        limit=25,
        space_type="global",
        status="current",
        session=FakeSession(),
    )

    assert payload == {"results": []}
    assert calls == {
        "url": "https://example.atlassian.net/wiki/rest/api/space",
        "params": {
            "limit": 25,
            "type": "global",
            "status": "current",
        },
        "auth": ("user", "secret"),
        "timeout": 20,
    }


def test_format_spaces_returns_terminal_lines():
    module = load_spaces_module("list_confluence_spaces_format")

    payload = {
        "results": [
            {
                "key": "DEV",
                "name": "Development",
                "type": "global",
                "status": "current",
                "homepage": {"id": 123},
            }
        ]
    }

    lines = module.format_spaces(payload)

    assert lines == ["DEV | Development | Type: global | Status: current | Homepage: 123"]


def test_reduce_spaces_returns_json_ready_shape():
    module = load_spaces_module("list_confluence_spaces_json")

    payload = {
        "results": [
            {
                "key": "DEV",
                "name": "Development",
                "type": "global",
                "status": "current",
                "homepage": {"id": 123},
            }
        ]
    }

    spaces = module.reduce_spaces(payload)

    assert spaces == [
        {
            "key": "DEV",
            "name": "Development",
            "type": "global",
            "status": "current",
            "homepage_id": "123",
        }
    ]
