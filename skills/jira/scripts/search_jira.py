#!/usr/bin/env python3
"""
Jira Search Utility

Supports single-condition issue search for keyword, updated date range,
reporter, and assignee.
"""

import argparse
import sys
from datetime import datetime
from typing import Dict, List, Optional, Sequence

from jira_auth import load_config_from_env


DEFAULT_LIMIT = 10
SEARCH_FIELDS = "summary,status,reporter,assignee,updated"


def validate_date(value: str) -> str:
    """Validate an ISO date string."""
    try:
        datetime.strptime(value, "%Y-%m-%d")
    except ValueError as exc:
        raise ValueError(f"Invalid date '{value}'. Expected format: YYYY-MM-DD") from exc
    return value


def validate_date_range(
    after_name: str,
    after_value: Optional[str],
    before_name: str,
    before_value: Optional[str],
) -> None:
    """Ensure date ranges are not reversed."""
    if after_value and before_value and after_value > before_value:
        raise ValueError(f"{after_name} cannot be later than {before_name}")


def positive_int(value: str) -> int:
    """Validate positive integer CLI values."""
    parsed = int(value)
    if parsed <= 0:
        raise argparse.ArgumentTypeError("limit must be a positive integer")
    return parsed


def escape_jql_value(value: str) -> str:
    """Escape quotes and backslashes in JQL string values."""
    return value.replace("\\", "\\\\").replace('"', '\\"')


def build_jql(
    keyword: Optional[str] = None,
    updated_after: Optional[str] = None,
    updated_before: Optional[str] = None,
    reporter: Optional[str] = None,
    assignee: Optional[str] = None,
) -> str:
    """Build a Jira JQL query from CLI filters."""
    active_modes = [
        bool(keyword),
        bool(updated_after or updated_before),
        bool(reporter),
        bool(assignee),
    ]
    if sum(active_modes) != 1:
        raise ValueError("Exactly one search mode is required")

    if keyword:
        query = f'text ~ "{escape_jql_value(keyword)}"'
    elif updated_after or updated_before:
        clauses = []
        if updated_after:
            clauses.append(f'updated >= "{updated_after}"')
        if updated_before:
            clauses.append(f'updated <= "{updated_before}"')
        query = " AND ".join(clauses)
    elif reporter:
        query = f'reporter = "{escape_jql_value(reporter)}"'
    else:
        query = f'assignee = "{escape_jql_value(assignee)}"'

    return f"{query} ORDER BY updated DESC"


def get_requests_module():
    """Import requests lazily so tests can import the module without it."""
    try:
        import requests as requests_module
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "The 'requests' package is required to run Jira searches. Install the script "
            "dependencies first."
        ) from exc
    return requests_module


def search_issues(
    config: Dict[str, str],
    jql: str,
    limit: int,
    session: Optional[object] = None,
) -> Dict:
    """Search Jira issues using the REST API."""
    requests_module = None
    request_session = session
    if request_session is None:
        requests_module = get_requests_module()
        request_session = requests_module.Session()

    try:
        response = request_session.get(
            f"{config['api_base']}/search",
            params={
                "jql": jql,
                "maxResults": limit,
                "fields": SEARCH_FIELDS,
            },
            auth=(config["username"], config["password"]),
            timeout=20,
        )
        response.raise_for_status()
    except Exception as exc:  # pragma: no cover - narrowed by runtime dependency
        if requests_module is not None:
            request_exception = getattr(requests_module, "RequestException", None)
            if request_exception and isinstance(exc, request_exception):
                raise RuntimeError(f"Jira search failed: {exc}") from exc
        raise

    return response.json()


def display_name(user: Optional[Dict[str, str]], fallback: str) -> str:
    """Read a Jira user name from the supported fields."""
    if not user:
        return fallback
    for field_name in ("displayName", "name", "accountId"):
        value = user.get(field_name)
        if value:
            return value
    return fallback


def format_results(payload: Dict, base_url: str) -> List[str]:
    """Format search results for terminal output."""
    lines: List[str] = []
    for issue in payload.get("issues", []):
        fields = issue.get("fields", {})
        key = issue.get("key", "<unknown>")
        summary = fields.get("summary", "<no summary>")
        status = (fields.get("status") or {}).get("name", "Unknown")
        reporter = display_name(fields.get("reporter"), "Unknown")
        assignee = display_name(fields.get("assignee"), "Unassigned")
        updated = fields.get("updated", "<unknown>")
        lines.append(
            f"{key} | {summary} | {status} | {reporter} | {assignee} | "
            f"{updated} | {base_url.rstrip('/')}/browse/{key}"
        )

    if not lines:
        return ["No results found."]
    return lines


def build_parser() -> argparse.ArgumentParser:
    """Build the CLI parser."""
    parser = argparse.ArgumentParser(
        description="Search Jira issues by keyword, updated date, reporter, or assignee."
    )
    parser.add_argument("--keyword", help="Keyword text to search for")
    parser.add_argument("--updated-after", type=validate_date, help="Updated date lower bound")
    parser.add_argument("--updated-before", type=validate_date, help="Updated date upper bound")
    parser.add_argument("--reporter", help="Reporter filter")
    parser.add_argument("--assignee", help="Assignee filter")
    parser.add_argument(
        "--limit",
        type=positive_int,
        default=DEFAULT_LIMIT,
        help="Maximum number of results to return",
    )
    return parser


def main(argv: Optional[Sequence[str]] = None) -> int:
    """CLI entrypoint."""
    parser = build_parser()
    args = parser.parse_args(argv)

    try:
        validate_date_range(
            "updated-after",
            args.updated_after,
            "updated-before",
            args.updated_before,
        )
        config = load_config_from_env()
        jql = build_jql(
            keyword=args.keyword,
            updated_after=args.updated_after,
            updated_before=args.updated_before,
            reporter=args.reporter,
            assignee=args.assignee,
        )
        payload = search_issues(config, jql, args.limit)
    except (ValueError, RuntimeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    for line in format_results(payload, config["base_url"]):
        print(line)
    return 0


if __name__ == "__main__":
    sys.exit(main())
