#!/usr/bin/env python3
"""
Qcuit Journal — Article Publishing Tool

Publish Markdown articles to the Qcuit Journal database.

Usage:
    python publish_article.py --draft journal/drafts/my-article.md \
        --title "My Article" --category Tutorial --topics "quantum, circuits" \
        --author "Faizan" --affiliation "Qcuit"

    # Use frontmatter in the draft file to avoid CLI args:
    python publish_article.py --draft journal/drafts/my-article.md

    # Publish to production DB:
    python publish_article.py --draft journal/drafts/my-article.md \
        --db-uri "postgresql://user:pass@host/db"
"""
import argparse
import datetime
import os
import re
import sys

# Add studio/ to path so api.models resolves
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(REPO_ROOT, 'studio'))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from api.models import BlogPost


def slugify(title: str) -> str:
    """Convert a title to a URL-friendly slug."""
    slug = title.lower().strip()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    return slug.strip('-')


def parse_frontmatter(content: str) -> tuple:
    """Extract YAML-like frontmatter from Markdown content.

    Returns (metadata_dict, body_content).
    """
    metadata = {}
    body = content

    if content.startswith('---'):
        parts = content.split('---', 2)
        if len(parts) >= 3:
            for line in parts[1].strip().split('\n'):
                if ':' in line:
                    key, val = line.split(':', 1)
                    metadata[key.strip()] = val.strip()
            body = parts[2].strip()

    return metadata, body


def extract_abstract(body: str, max_chars: int = 200) -> str:
    """Extract first meaningful paragraph as abstract."""
    for line in body.split('\n'):
        line = line.strip()
        if line and not line.startswith('#') and not line.startswith('>') and not line.startswith('```'):
            return line[:max_chars]
    return 'No abstract provided.'


def publish(args):
    """Publish an article to the database."""
    # Read draft file
    if not os.path.exists(args.draft):
        print(f"Error: Draft file not found: {args.draft}")
        sys.exit(1)

    with open(args.draft, 'r') as f:
        raw_content = f.read()

    # Parse frontmatter (CLI args override frontmatter)
    fm, body = parse_frontmatter(raw_content)

    title = args.title or fm.get('title')
    if not title:
        print("Error: --title is required (or set 'title:' in frontmatter)")
        sys.exit(1)

    slug = args.slug or fm.get('slug') or slugify(title)
    category = args.category or fm.get('category', 'Tutorial')
    topics = args.topics or fm.get('topics', '')
    author = args.author or fm.get('author', 'Faizan')
    affiliation = args.affiliation or fm.get('affiliation', 'Qcuit')
    abstract = args.abstract or fm.get('abstract') or extract_abstract(body)
    featured_image = args.image or fm.get('featured_image', '')
    reading_time = max(1, round(len(body.split()) / 200))

    # Resolve DB URI
    default_db = 'sqlite:///' + os.path.join(REPO_ROOT, 'studio', 'qcuit_dev.db')
    db_uri = args.db_uri or os.environ.get('DATABASE_URL', default_db)

    # Fix Heroku postgres:// -> postgresql://
    if db_uri.startswith('postgres://'):
        db_uri = db_uri.replace('postgres://', 'postgresql://', 1)

    print(f"Publishing: {title}")
    print(f"  Slug:     {slug}")
    print(f"  Category: {category}")
    print(f"  Topics:   {topics}")
    print(f"  Author:   {author} ({affiliation})")
    print(f"  Words:    {len(body.split())} (~{reading_time} min read)")
    print(f"  DB:       {db_uri[:50]}...")
    print()

    engine = create_engine(db_uri)
    with Session(engine) as session:
        article = BlogPost(
            title=title,
            slug=slug,
            content=body,
            abstract=abstract,
            author_name=author,
            author_affiliation=affiliation,
            category=category,
            topics=topics,
            featured_image=featured_image,
            status='published',
            published_at=datetime.datetime.now(datetime.UTC),
            reading_time=reading_time,
        )

        existing = session.query(BlogPost).filter_by(slug=slug).first()
        if existing:
            if not args.force:
                print(f"Article with slug '{slug}' already exists. Use --force to overwrite.")
                sys.exit(1)
            session.delete(existing)
            print(f"  Replacing existing article: {existing.title}")

        session.add(article)
        session.commit()
        print(f"\n  Published: {title}")
        print(f"  View at:   /hub/{slug}")


def main():
    parser = argparse.ArgumentParser(
        description='Publish a Markdown article to the Qcuit Journal.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Publish with CLI args:
  python publish_article.py --draft drafts/my-article.md --title "My Title" --category Tutorial

  # Publish using frontmatter in the draft:
  python publish_article.py --draft drafts/my-article.md

  # Overwrite existing article:
  python publish_article.py --draft drafts/my-article.md --force

  # Publish to production:
  python publish_article.py --draft drafts/my-article.md --db-uri "$DATABASE_URL"
        """
    )
    parser.add_argument('--draft', required=True, help='Path to Markdown draft file')
    parser.add_argument('--title', help='Article title (overrides frontmatter)')
    parser.add_argument('--slug', help='URL slug (auto-generated from title if omitted)')
    parser.add_argument('--category', help='Category: Tutorial, Research, Pedagogy, etc.')
    parser.add_argument('--topics', help='Comma-separated topic tags')
    parser.add_argument('--author', help='Author name (default: Faizan)')
    parser.add_argument('--affiliation', help='Author affiliation (default: Qcuit)')
    parser.add_argument('--abstract', help='Article abstract (auto-extracted if omitted)')
    parser.add_argument('--image', help='Featured image URL')
    parser.add_argument('--db-uri', help='Database URI (default: local SQLite)')
    parser.add_argument('--force', action='store_true', help='Overwrite existing article with same slug')

    args = parser.parse_args()
    publish(args)


if __name__ == '__main__':
    main()

