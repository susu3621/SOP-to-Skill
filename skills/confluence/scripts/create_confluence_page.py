#!/usr/bin/env python3
"""
Create or Update Confluence Pages from Markdown Files

This script converts Markdown content to Confluence Wiki Markup and creates
or updates a Confluence page.

Usage:
    # Create a new page
    python create_confluence_page.py --file input.md --space "~username" --title "My Page"

    # Update an existing page by title
    python create_confluence_page.py --file input.md --space "~username" --title "My Page"

    # Update an existing page by ID (more reliable)
    python create_confluence_page.py --file input.md --page-id 123456789

    # Create as child of another page
    python create_confluence_page.py --file input.md --space "~username" --title "My Page" --parent-id 123456

    # Create with agent signature in version comment
    python create_confluence_page.py --file input.md --space "~username" --title "My Page" --auto-agent-comment

    # Use custom env file
    python create_confluence_page.py --file input.md --space "~username" --title "My Page" --env-file /path/to/.env
"""

import argparse
import sys
from pathlib import Path
from typing import Optional

# Add script directory to path for imports
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))

from confluence_auth import get_confluence_client
from convert_markdown_to_wiki import MarkdownToWikiConverter

AGENT_SIGNATURE = "Co-Authored-By-Agent"


def markdown_to_wiki(markdown_content: str) -> str:
    """Convert Markdown content to Confluence Wiki Markup."""
    converter = MarkdownToWikiConverter()
    return converter.convert(markdown_content)


def get_page_by_title(confluence, space_key: str, title: str) -> Optional[dict]:
    """
    Check if a page with the given title exists in the space.

    Returns full page data (including version) if exists, None otherwise.
    """
    try:
        # First get basic page info
        page = confluence.get_page_by_title(space=space_key, title=title)
        if not page:
            return None

        # Then get full page info with version
        page_id = page['id']
        full_page = confluence.get_page_by_id(page_id=page_id, expand='version')
        return full_page
    except Exception:
        return None


def get_page_by_id(confluence, page_id: str) -> Optional[dict]:
    """
    Get page by ID with full info including version.

    Returns page data if exists, None otherwise.
    """
    try:
        return confluence.get_page_by_id(page_id=page_id, expand='version,space')
    except Exception:
        return None


def create_page(
    confluence,
    space_key: str,
    title: str,
    wiki_content: str,
    parent_id: Optional[str] = None,
    version_comment: Optional[str] = None
) -> dict:
    """
    Create a new Confluence page.

    Args:
        confluence: Confluence client instance
        space_key: Space key (e.g., "~username" for personal space)
        title: Page title
        wiki_content: Content in Wiki Markup format
        parent_id: Optional parent page ID
        version_comment: Optional version comment

    Returns:
        Created page data
    """
    return confluence.create_page(
        space=space_key,
        title=title,
        body=wiki_content,
        parent_id=parent_id,
        representation='wiki',
        version_comment=version_comment
    )


def update_page(
    confluence,
    page_id: str,
    title: str,
    wiki_content: str,
    parent_id: Optional[str] = None,
    version_comment: Optional[str] = None
) -> dict:
    """
    Update an existing Confluence page.

    Args:
        confluence: Confluence client instance
        page_id: Page ID to update
        title: Page title
        wiki_content: Content in Wiki Markup format
        parent_id: Optional parent page ID
        version_comment: Optional version comment

    Returns:
        Updated page data
    """
    return confluence.update_page(
        page_id=page_id,
        title=title,
        body=wiki_content,
        parent_id=parent_id,
        representation='wiki',
        version_comment=version_comment
    )


def main():
    """Main entry point for CLI usage."""
    parser = argparse.ArgumentParser(
        description='Create or update Confluence pages from Markdown files',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )

    parser.add_argument(
        '--file', '-f',
        required=True,
        help='Path to the Markdown file'
    )
    parser.add_argument(
        '--space', '-s',
        help='Confluence space key (e.g., "~username" for personal space). Required for new pages.'
    )
    parser.add_argument(
        '--title', '-t',
        help='Page title (defaults to filename without extension). Used with --space.'
    )
    parser.add_argument(
        '--page-id', '-i',
        help='Page ID to update (alternative to --space + --title)'
    )
    parser.add_argument(
        '--parent-id', '-p',
        help='Parent page ID (optional, for creating child pages)'
    )
    parser.add_argument(
        '--env-file', '-e',
        help='Path to .env file with Confluence credentials'
    )
    parser.add_argument(
        '--auto-agent-comment',
        action='store_true',
        help='Add "Co-Authored-By-Agent" to version comment'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show converted Wiki Markup without creating page'
    )

    args = parser.parse_args()

    # Read Markdown file
    md_path = Path(args.file)
    if not md_path.exists():
        print(f"Error: File '{args.file}' not found", file=sys.stderr)
        sys.exit(1)

    markdown_content = md_path.read_text(encoding='utf-8')

    # Determine title
    title = args.title or md_path.stem

    # Convert to Wiki Markup
    wiki_content = markdown_to_wiki(markdown_content)

    # Dry run mode
    if args.dry_run:
        print(f"Title: {title}")
        print(f"Space: {args.space or 'N/A'}")
        print(f"Page ID: {args.page_id or 'N/A'}")
        print(f"Parent ID: {args.parent_id or 'None'}")
        if args.auto_agent_comment:
            print(f"Version Comment: {AGENT_SIGNATURE}")
        print("\n--- Wiki Markup ---\n")
        print(wiki_content)
        return

    # Prepare version comment
    version_comment = AGENT_SIGNATURE if args.auto_agent_comment else None

    # Get Confluence client
    try:
        confluence = get_confluence_client(env_file=args.env_file)
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except ImportError as e:
        print(f"Error: {e}", file=sys.stderr)
        print("Install with: pip install atlassian-python-api", file=sys.stderr)
        sys.exit(1)

    try:
        # Mode 1: Update by page ID
        if args.page_id:
            existing_page = get_page_by_id(confluence, args.page_id)
            if not existing_page:
                print(f"Error: Page with ID '{args.page_id}' not found", file=sys.stderr)
                sys.exit(1)

            page_id = existing_page['id']
            space_key = existing_page.get('space', {}).get('key', 'unknown')
            # Keep existing title if not specified
            page_title = args.title or existing_page.get('title', title)

            print(f"Updating page '{page_title}' (ID: {page_id})...")

            result = update_page(
                confluence=confluence,
                page_id=page_id,
                title=page_title,
                wiki_content=wiki_content,
                parent_id=args.parent_id,
                version_comment=version_comment
            )

            print(f"✅ Page updated successfully!")
            print(f"   ID: {result.get('id')}")
            print(f"   URL: {confluence.url}/pages/viewpage.action?pageId={result.get('id')}")

        # Mode 2: Create or update by space + title
        elif args.space:
            existing_page = get_page_by_title(confluence, args.space, title)

            if existing_page:
                page_id = existing_page['id']

                print(f"Updating page '{title}' (ID: {page_id})...")

                result = update_page(
                    confluence=confluence,
                    page_id=page_id,
                    title=title,
                    wiki_content=wiki_content,
                    parent_id=args.parent_id,
                    version_comment=version_comment
                )

                print(f"✅ Page updated successfully!")
                print(f"   ID: {result.get('id')}")
                print(f"   URL: {confluence.url}/pages/viewpage.action?pageId={result.get('id')}")

            else:
                # Create new page
                print(f"Creating page '{title}' in space '{args.space}'...")

                result = create_page(
                    confluence=confluence,
                    space_key=args.space,
                    title=title,
                    wiki_content=wiki_content,
                    parent_id=args.parent_id,
                    version_comment=version_comment
                )

                print(f"✅ Page created successfully!")
                print(f"   ID: {result.get('id')}")
                print(f"   URL: {confluence.url}/pages/viewpage.action?pageId={result.get('id')}")

        else:
            print("Error: Either --page-id or --space is required", file=sys.stderr)
            print("  --page-id  : Update an existing page by ID", file=sys.stderr)
            print("  --space    : Create or update a page by title in the specified space", file=sys.stderr)
            sys.exit(1)

    except Exception as e:
        print(f"Error: Failed to create/update page: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
