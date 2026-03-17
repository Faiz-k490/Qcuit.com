"""
Qcuit Platform — Blog / Natural Philosophy Routes
Read-only public endpoints for curated Q-Hub journal posts.
"""

from flask import Blueprint, request, jsonify

from api.models import BlogPost

blog_bp = Blueprint('blog', __name__, url_prefix='/api/posts')

@blog_bp.route('', methods=['GET'])
def list_posts():
    """Fetch published articles ordered by publication date."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    category = request.args.get('category', None)

    query = BlogPost.query.filter_by(status='published')
    if category:
        query = query.filter_by(category=category)

    pagination = query.order_by(BlogPost.published_at.desc(), BlogPost.created_at.desc()).paginate(
        page=page, per_page=min(per_page, 50), error_out=False
    )

    return jsonify({
        'posts': [p.to_dict(include_content=False) for p in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    })


@blog_bp.route('/<slug>', methods=['GET'])
def get_post(slug):
    """Fetch a single article by its slug."""
    post = BlogPost.query.filter_by(slug=slug, status='published').first()
    if not post:
        return jsonify({'error': 'Post not found'}), 404
    return jsonify({'post': post.to_dict()})
