#!/usr/bin/env python3
"""
Confluence Search Utility

Supports keyword search plus created/updated date filters for read-only
Confluence content discovery.
"""

import argparse
import sys
from datetime import datetime
from typing import TYPE_CHECKING, Dict, List, Optional, Sequence, Tuple
from urllib.parse import urlparse


if TYPE_CHECKING:
    import requests


DEFAULT_LIMIT = 10
SEARCH_EXPAND = "space,history,version"


def build_confluence_urls(confluence_url: str) -> Tuple[str, str]:
    """Build web and API base URLs for Cloud and self-hosted Confluence."""
    normalized = confluence_url.rstrip("/")
    parsed = urlparse(normalized)

    path = parsed.path.rstrip("/")
    if not path and parsed.netloc.endswith(".atlassian.net"):
        path = "/wiki"

    web_base = f"{parsed.scheme}://{parsed.netloc}{path}"
    api_base = f"{web_base}/rest/api"
    return web_base, api_base


def load_config_from_env(env_file: Optional[str] = None) -> Dict[str, str]:
    """Load Confluence configuration via the shared credential discovery helper."""
    try:
        from confluence_auth import get_confluence_credentials
    except ImportError as exc:
        raise RuntimeError(
            "The shared 'confluence_auth' helper is required to load Confluence credentials."
        ) from exc

    creds = get_confluence_credentials(env_file=env_file)
    web_base, api_base = build_confluence_urls(creds["url"])
    return {
        "web_base": web_base,
        "api_base": api_base,
        "username": creds["username"],
        "token": creds["token"],
    }


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


def escape_cql_value(value: str) -> str:
    """Escape CQL string values."""
    return value.replace("\\", "\\\\").replace('"', '\\"')


def build_cql_query(
    keyword: Optional[str] = None,
    space: Optional[str] = None,
    created_after: Optional[str] = None,
    created_before: Optional[str] = None,
    updated_after: Optional[str] = None,
    updated_before: Optional[str] = None,
) -> str:
    """Build a Confluence CQL query from CLI filters."""
    conditions = [
        keyword,
        space,
        created_after,
        created_before,
        updated_after,
        updated_before,
    ]
    if not any(conditions):
        raise ValueError("At least one search condition is required")

    clauses = ["type = page"]
    if keyword:
        clauses.append(f'text ~ "{escape_cql_value(keyword)}"')
    if space:
        clauses.append(f'space = "{escape_cql_value(space)}"')
    if created_after:
        clauses.append(f'created >= "{created_after}"')
    if created_before:
        clauses.append(f'created <= "{created_before}"')
    if updated_after:
        clauses.append(f'lastmodified >= "{updated_after}"')
    if updated_before:
        clauses.append(f'lastmodified <= "{updated_before}"')
    return " and ".join(clauses)


def get_requests_module():
    """Import requests lazily so --help works without optional dependencies installed."""
    try:
        import requests as requests_module
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "The 'requests' package is required to run Confluence searches. "
            "Install the script dependencies first."
        ) from exc
    return requests_module


def search_content(
    config: Dict[str, str],
    cql: str,
    limit: int,
    session: Optional[object] = None,
) -> Dict:
    """Search Confluence content using the REST API."""
    requests_module = get_requests_module()
    request_session = session or requests_module.Session()
    params = {
        "cql": cql,
        "limit": limit,
        "expand": SEARCH_EXPAND,
    }
    try:
        response = request_session.get(
            f"{config['api_base']}/content/search",
            params=params,
            auth=(config["username"], config["token"]),
            timeout=20,
        )
        response.raise_for_status()
    except requests_module.RequestException as exc:
        raise RuntimeError(f"Confluence search failed: {exc}") from exc
    return response.json()


def build_page_url(web_base: str, webui_path: str) -> str:
    """Build a page URL that preserves the Confluence context path."""
    if not webui_path:
        return web_base
    if webui_path.startswith("/"):
        return f"{web_base.rstrip('/')}{webui_path}"
    return f"{web_base.rstrip('/')}/{webui_path}"


def format_results(payload: Dict, web_base: str) -> List[str]:
    """Format search results for terminal output."""
    lines: List[str] = []
    for item in payload.get("results", []):
        title = item.get("title", "<untitled>")
        page_id = item.get("id", "<unknown>")
        space_key = item.get("space", {}).get("key", "<unknown>")
        created_at = item.get("history", {}).get("createdDate", "<unknown>")
        updated_at = item.get("version", {}).get("when", "<unknown>")
        webui_path = item.get("_links", {}).get("webui", "")
        page_url = build_page_url(web_base, webui_path)
        lines.append(
            f"{title} | ID: {page_id} | Space: {space_key} | Created: {created_at} | "
            f"Updated: {updated_at} | URL: {page_url}"
        )

    if not lines:
        return ["No results found."]
    return lines


def positive_int(value: str) -> int:
    """Validate positive integer CLI values."""
    parsed = int(value)
    if parsed <= 0:
        raise argparse.ArgumentTypeError("limit must be a positive integer")
    return parsed


def build_parser() -> argparse.ArgumentParser:
    """Build the CLI parser."""
    parser = argparse.ArgumentParser(
        description="Search Confluence pages by keyword, created date, and updated date."
    )
    parser.add_argument("--keyword", help="Keyword text to search for")
    parser.add_argument("--space", help="Optional Confluence space key filter")
    parser.add_argument("--created-after", type=validate_date, help="Created date lower bound")
    parser.add_argument("--created-before", type=validate_date, help="Created date upper bound")
    parser.add_argument("--updated-after", type=validate_date, help="Updated date lower bound")
    parser.add_argument("--updated-before", type=validate_date, help="Updated date upper bound")
    parser.add_argument("--env-file", default=None, help="Path to a specific .env file")
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
            "created-after",
            args.created_after,
            "created-before",
            args.created_before,
        )
        validate_date_range(
            "updated-after",
            args.updated_after,
            "updated-before",
            args.updated_before,
        )
        config = load_config_from_env(env_file=args.env_file)
        cql = build_cql_query(
            keyword=args.keyword,
            space=args.space,
            created_after=args.created_after,
            created_before=args.created_before,
            updated_after=args.updated_after,
            updated_before=args.updated_before,
        )
        payload = search_content(config, cql, args.limit)
    except (ValueError, RuntimeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    for line in format_results(payload, config["web_base"]):
        print(line)
    return 0


if __name__ == "__main__":
    sys.exit(main())
