#!/usr/bin/env python3
"""Utility script to create or update BlogPost entries without admin UI."""

import argparse
import datetime
import os
import sys

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

sys.path.append(os.path.dirname(os.path.dirname(__file__)))  # add repo root

from api.models import BlogPost  # type: ignore  # noqa: E402


def infer_slug(title: str) -> str:
  slug = title.lower()
  allowed = [c if c.isalnum() or c in (' ', '-', '_') else ' ' for c in slug]
  slug = ''.join(allowed)
  slug = '-'.join(filter(None, slug.split()))
  return slug[:256]


def calc_reading_time(content: str) -> int:
  words = len(content.split())
  return max(1, round(words / 200))


def upsert_post(session: Session, args: argparse.Namespace) -> BlogPost:
  slug = args.slug or infer_slug(args.title)
  post = session.query(BlogPost).filter_by(slug=slug).one_or_none()
  is_new = post is None
  if is_new:
    post = BlogPost(slug=slug, title=args.title)

  post.title = args.title
  post.content = args.content
  post.abstract = args.abstract or args.content.split('\n\n', 1)[0]
  post.author_title = args.author_title or ''
  post.author_name = args.author_name
  post.author_affiliation = args.author_affiliation or ''
  post.author_bio = args.author_bio or ''
  post.category = args.category or 'quantum-computing'
  post.topics = ', '.join(t.strip() for t in (args.topics or '').split(',') if t.strip())
  post.volume = args.volume or 1
  post.issue = args.issue or 1
  post.page_numbers = args.page_numbers or ''
  post.doi = args.doi or ''
  post.reading_time = calc_reading_time(args.content)

  if args.publish:
    post.status = 'published'
    post.published_at = datetime.datetime.utcnow()
  else:
    post.status = 'draft'

  session.add(post)
  session.commit()
  state = 'created' if is_new else 'updated'
  print(f"[qcuit] {state} article '{post.title}' (slug={post.slug}, status={post.status})")
  if post.status == 'published':
    print(f"Published at {post.published_at} UTC with estimated {post.reading_time} min read.")
  return post


def parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser(description='Publish or update Q-Hub journal articles.')
  parser.add_argument('--db', default=os.environ.get('SQLALCHEMY_DATABASE_URI'))
  parser.add_argument('--title', required=True)
  parser.add_argument('--slug')
  parser.add_argument('--abstract')
  parser.add_argument('--content-file', help='Path to markdown file (default: stdin)')
  parser.add_argument('--author-name', required=True)
  parser.add_argument('--author-title')
  parser.add_argument('--author-affiliation')
  parser.add_argument('--author-bio')
  parser.add_argument('--category')
  parser.add_argument('--topics', help='Comma-separated list')
  parser.add_argument('--volume', type=int)
  parser.add_argument('--issue', type=int)
  parser.add_argument('--page-numbers')
  parser.add_argument('--doi')
  parser.add_argument('--publish', action='store_true', help='Set status=published and timestamp')
  parser.add_argument('--stdin', action='store_true', help='Read markdown content from stdin (overrides content-file)')
  return parser.parse_args()


def main():
  args = parse_args()
  if not args.db:
    print('Error: provide SQLALCHEMY_DATABASE_URI via --db or env var.', file=sys.stderr)
    sys.exit(1)

  if args.stdin:
    print('[qcuit] Reading markdown content from stdin...', file=sys.stderr)
    args.content = sys.stdin.read()
  elif args.content_file:
    with open(args.content_file, 'r', encoding='utf-8') as fp:
      args.content = fp.read()
  else:
    print('Error: provide --content-file or --stdin for markdown content.', file=sys.stderr)
    sys.exit(1)

  engine = create_engine(args.db)
  with Session(engine) as session:
    upsert_post(session, args)


if __name__ == '__main__':
  main()
