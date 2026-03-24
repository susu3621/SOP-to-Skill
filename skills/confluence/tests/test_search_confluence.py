import importlib.util
from pathlib import Path
import sys
import types

import pytest


SELF_HOSTED_URL = "https://confluence.example.com"


def load_search_module(module_name="search_confluence_under_test"):
    script_path = Path(__file__).resolve().parents[1] / "scripts" / "search_confluence.py"
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

    module = load_search_module("search_confluence_stdlib")

    assert hasattr(module, "build_parser")


def test_builds_keyword_search_query():
    module = load_search_module()

    query = module.build_cql_query(keyword="authentication")

    assert query == 'type = page and text ~ "authentication"'


def test_builds_created_date_query():
    module = load_search_module("search_confluence_created")

    query = module.build_cql_query(
        created_after="2026-03-01",
        created_before="2026-03-10",
    )

    assert query == 'type = page and created >= "2026-03-01" and created <= "2026-03-10"'


def test_builds_updated_date_query():
    module = load_search_module("search_confluence_updated")

    query = module.build_cql_query(
        updated_after="2026-03-01",
        updated_before="2026-03-10",
    )

    assert query == (
        'type = page and lastmodified >= "2026-03-01" and lastmodified <= "2026-03-10"'
    )


def test_builds_combined_query():
    module = load_search_module("search_confluence_combined")

    query = module.build_cql_query(
        keyword="auth",
        space="DEV",
        created_after="2026-03-01",
        updated_before="2026-03-10",
    )

    assert query == (
        'type = page and text ~ "auth" and space = "DEV" and created >= "2026-03-01" '
        'and lastmodified <= "2026-03-10"'
    )


def test_requires_at_least_one_search_condition():
    module = load_search_module("search_confluence_required")

    with pytest.raises(ValueError, match="At least one search condition"):
        module.build_cql_query()


def test_validate_date_rejects_invalid_format():
    module = load_search_module("search_confluence_invalid_date")

    with pytest.raises(ValueError, match="YYYY-MM-DD"):
        module.validate_date("03/12/2026")


def test_validate_date_range_rejects_reversed_created_range():
    module = load_search_module("search_confluence_created_range")

    with pytest.raises(ValueError, match="created-after"):
        module.validate_date_range(
            "created-after",
            "2026-03-12",
            "created-before",
            "2026-03-01",
        )


def test_validate_date_range_rejects_reversed_updated_range():
    module = load_search_module("search_confluence_updated_range")

    with pytest.raises(ValueError, match="updated-after"):
        module.validate_date_range(
            "updated-after",
            "2026-03-12",
            "updated-before",
            "2026-03-01",
        )


def test_load_config_requires_env_vars(monkeypatch):
    helper = types.ModuleType("confluence_auth")

    def fake_get_confluence_credentials(env_file=None):
        raise ValueError("No Confluence credentials found")

    helper.get_confluence_credentials = fake_get_confluence_credentials
    monkeypatch.setitem(sys.modules, "confluence_auth", helper)

    module = load_search_module("search_confluence_env")

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

    module = load_search_module("search_confluence_helper")

    config = module.load_config_from_env("/tmp/project.env")

    assert requested == {"env_file": "/tmp/project.env"}
    assert config == {
        "web_base": SELF_HOSTED_URL,
        "api_base": f"{SELF_HOSTED_URL}/rest/api",
        "username": "user@example.com",
        "token": "secret",
    }


def test_parser_accepts_env_file():
    module = load_search_module("search_confluence_parser")

    args = module.build_parser().parse_args(["--env-file", "/tmp/project.env", "--keyword", "a"])

    assert args.env_file == "/tmp/project.env"


def test_format_results_returns_terminal_lines():
    module = load_search_module("search_confluence_format")

    payload = {
        "results": [
            {
                "id": "123",
                "title": "Auth Guide",
                "space": {"key": "DEV"},
                "history": {"createdDate": "2026-03-01T08:00:00.000Z"},
                "version": {"when": "2026-03-05T09:30:00.000Z"},
                "_links": {"webui": "/spaces/DEV/pages/123/Auth+Guide"},
            }
        ]
    }

    lines = module.format_results(payload, "https://example.atlassian.net/wiki")

    assert lines == [
        "Auth Guide | ID: 123 | Space: DEV | Created: 2026-03-01T08:00:00.000Z | "
        "Updated: 2026-03-05T09:30:00.000Z | "
        "URL: https://example.atlassian.net/wiki/spaces/DEV/pages/123/Auth+Guide"
    ]
