"""
Qcuit Platform — Authentication Routes
Handles user registration, login, and JWT token management.
"""

import datetime
import hashlib
import os
from functools import wraps

from flask import Blueprint, request, jsonify, current_app

from api.models import db, User

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


# ─── JWT Helpers (lightweight, no external dependency) ─────────────
def _create_token(user_id, role):
    """Create a simple signed token. For production, use PyJWT."""
    import hmac, json, base64, time
    secret = current_app.config['JWT_SECRET_KEY']
    expires = current_app.config.get('JWT_ACCESS_TOKEN_EXPIRES', 86400)
    payload = {
        'user_id': user_id,
        'role': role,
        'exp': int(time.time()) + expires,
    }
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()
    signature = hmac.new(secret.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
    return f'{payload_b64}.{signature}'


def _decode_token(token):
    """Decode and verify a token. Returns payload dict or None."""
    import hmac, json, base64, time
    secret = current_app.config['JWT_SECRET_KEY']
    try:
        payload_b64, signature = token.rsplit('.', 1)
        expected_sig = hmac.new(secret.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        if payload.get('exp', 0) < time.time():
            return None
        return payload
    except Exception:
        return None


def jwt_required(f):
    """Decorator: require a valid JWT in Authorization header."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid token'}), 401
        token = auth_header[7:]
        payload = _decode_token(token)
        if payload is None:
            return jsonify({'error': 'Token expired or invalid'}), 401
        request.current_user_id = payload['user_id']
        request.current_user_role = payload['role']
        return f(*args, **kwargs)
    return decorated


def role_required(*roles):
    """Decorator: require the current user to have one of the specified roles."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if getattr(request, 'current_user_role', None) not in roles:
                return jsonify({'error': 'Insufficient permissions'}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator


# ─── Routes ────────────────────────────────────────────────────────
@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a web user for optional authenticated routes."""
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not username or not email or not password:
        return jsonify({'error': 'username, email, and password are required'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already taken'}), 409

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 409

    user = User(username=username, email=email, role='reader')
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    token = _create_token(user.id, user.role)
    return jsonify({
        'message': 'Registration successful',
        'token': token,
        'user': user.to_dict(),
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate and issue JWT."""
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'email and password are required'}), 400

    user = User.query.filter_by(email=email).first()
    if user is None or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password'}), 401

    token = _create_token(user.id, user.role)
    return jsonify({
        'token': token,
        'user': user.to_dict(),
    })


@auth_bp.route('/me', methods=['GET'])
@jwt_required
def get_current_user():
    """Get the current authenticated user's profile."""
    user = User.query.get(request.current_user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'user': user.to_dict()})
