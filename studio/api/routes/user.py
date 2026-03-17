"""
Qcuit Platform — User Profile Routes
Endpoints for managing user profiles and avatars.
"""

from flask import Blueprint, request, jsonify

from api.models import db, User
from api.routes.auth import jwt_required

user_bp = Blueprint('user', __name__, url_prefix='/api/user')


@user_bp.route('/profile', methods=['GET'])
@jwt_required
def get_profile():
    """Get current user's full profile."""
    user = User.query.get(request.current_user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'user': user.to_dict()})


@user_bp.route('/profile', methods=['PUT'])
@jwt_required
def update_profile():
    """Update current user's bio and avatar."""
    user = User.query.get(request.current_user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json() or {}
    if 'bio' in data:
        user.bio = data['bio'].strip()
    if 'profile_image' in data:
        user.profile_image = data['profile_image'].strip()
    if 'username' in data:
        new_username = data['username'].strip()
        if new_username != user.username:
            existing = User.query.filter_by(username=new_username).first()
            if existing:
                return jsonify({'error': 'Username already taken'}), 409
            user.username = new_username

    db.session.commit()
    return jsonify({'user': user.to_dict()})
