import importlib.util
from pathlib import Path
import sys

import pytest


def load_search_module(module_name="search_jira_under_test"):
    script_path = Path(__file__).resolve().parents[1] / "scripts" / "search_jira.py"
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

    module = load_search_module("search_jira_stdlib")

    assert hasattr(module, "build_parser")


def test_builds_keyword_query():
    module = load_search_module("search_jira_keyword")

    query = module.build_jql(keyword="authentication")

    assert query == 'text ~ "authentication" ORDER BY updated DESC'


def test_builds_updated_date_query():
    module = load_search_module("search_jira_updated")

    query = module.build_jql(
        updated_after="2026-03-01",
        updated_before="2026-03-10",
    )

    assert query == 'updated >= "2026-03-01" AND updated <= "2026-03-10" ORDER BY updated DESC'


def test_builds_reporter_query():
    module = load_search_module("search_jira_reporter")

    query = module.build_jql(reporter="alice")

    assert query == 'reporter = "alice" ORDER BY updated DESC'


def test_builds_assignee_query():
    module = load_search_module("search_jira_assignee")

    query = module.build_jql(assignee="bob")

    assert query == 'assignee = "bob" ORDER BY updated DESC'


def test_requires_exactly_one_search_condition_when_none():
    module = load_search_module("search_jira_required_none")

    with pytest.raises(ValueError, match="Exactly one search mode"):
        module.build_jql()


def test_requires_exactly_one_search_condition_when_multiple():
    module = load_search_module("search_jira_required_multiple")

    with pytest.raises(ValueError, match="Exactly one search mode"):
        module.build_jql(keyword="auth", reporter="alice")


def test_validate_date_rejects_invalid_format():
    module = load_search_module("search_jira_invalid_date")

    with pytest.raises(ValueError, match="YYYY-MM-DD"):
        module.validate_date("03/12/2026")


def test_validate_date_range_rejects_reversed_updated_range():
    module = load_search_module("search_jira_updated_range")

    with pytest.raises(ValueError, match="updated-after"):
        module.validate_date_range(
            "updated-after",
            "2026-03-12",
            "updated-before",
            "2026-03-01",
        )


def test_load_config_requires_env_vars(monkeypatch):
    for env_name in ("JIRA_URL", "JIRA_USERNAME", "JIRA_PASSWORD"):
        monkeypatch.delenv(env_name, raising=False)

    module = load_search_module("search_jira_env")

    with pytest.raises(ValueError, match="JIRA_URL"):
        module.load_config_from_env()


def test_format_results_returns_terminal_lines():
    module = load_search_module("search_jira_format")

    payload = {
        "issues": [
            {
                "key": "PROJ-123",
                "fields": {
                    "summary": "Login fails on VPN",
                    "status": {"name": "In Progress"},
                    "reporter": {"displayName": "Alice"},
                    "assignee": {"displayName": "Bob"},
                    "updated": "2026-03-05T09:30:00.000+0000",
                },
            }
        ]
    }

    lines = module.format_results(payload, "https://jira.example.com")

    assert lines == [
        "PROJ-123 | Login fails on VPN | In Progress | Alice | Bob | "
        "2026-03-05T09:30:00.000+0000 | https://jira.example.com/browse/PROJ-123"
    ]


def test_search_issues_calls_search_api():
    module = load_search_module("search_jira_request")
    requested = {}

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"issues": []}

    class FakeSession:
        def get(self, url, params, auth, timeout):
            requested["url"] = url
            requested["params"] = params
            requested["auth"] = auth
            requested["timeout"] = timeout
            return FakeResponse()

    config = {
        "api_base": "https://jira.example.com/rest/api/2",
        "username": "user@example.com",
        "password": "secret",
    }

    module.search_issues(
        config,
        'text ~ "vpn" ORDER BY updated DESC',
        10,
        session=FakeSession(),
    )

    assert requested == {
        "url": "https://jira.example.com/rest/api/2/search",
        "params": {
            "jql": 'text ~ "vpn" ORDER BY updated DESC',
            "maxResults": 10,
            "fields": "summary,status,reporter,assignee,updated",
        },
        "auth": ("user@example.com", "secret"),
        "timeout": 20,
    }


def test_main_returns_zero_for_success(monkeypatch, capsys):
    module = load_search_module("search_jira_main")

    monkeypatch.setattr(
        module,
        "load_config_from_env",
        lambda: {
            "base_url": "https://jira.example.com",
            "api_base": "https://jira.example.com/rest/api/2",
            "username": "user@example.com",
            "password": "secret",
        },
    )
    monkeypatch.setattr(module, "search_issues", lambda *args, **kwargs: {"issues": []})

    exit_code = module.main(["--keyword", "vpn"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "No results found." in captured.out
