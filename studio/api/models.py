"""
Qcuit Platform — Database Models
SQLAlchemy models for User (RBAC), Post (CMS), and Comment (threaded).
"""

import datetime
import hashlib
import os
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class User(db.Model):
    """User model with Role-Based Access Control."""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='reader')
    # Roles: 'admin', 'editor', 'author', 'reader'
    bio = db.Column(db.Text, default='')
    profile_image = db.Column(db.String(256), default='')
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    # Relationships
    posts = db.relationship('Post', backref='author', lazy='dynamic')
    comments = db.relationship('Comment', backref='commenter', lazy='dynamic')

    def set_password(self, password):
        """Hash password with salt using SHA-256."""
        salt = os.urandom(16).hex()
        hashed = hashlib.sha256((salt + password).encode()).hexdigest()
        self.password_hash = f'{salt}${hashed}'

    def check_password(self, password):
        """Verify password against stored hash."""
        if '$' not in self.password_hash:
            return False
        salt, stored_hash = self.password_hash.split('$', 1)
        return hashlib.sha256((salt + password).encode()).hexdigest() == stored_hash

    def is_admin(self):
        return self.role == 'admin'

    def can_publish(self):
        return self.role in ('admin', 'editor', 'author')

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'role': self.role,
            'bio': self.bio,
            'profile_image': self.profile_image,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Post(db.Model):
    """Blog/Community post model with moderation workflow."""
    __tablename__ = 'posts'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(256), nullable=False)
    slug = db.Column(db.String(256), unique=True, nullable=False, index=True)
    content = db.Column(db.Text, nullable=False)
    excerpt = db.Column(db.Text, default='')
    author_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(20), nullable=False, default='draft')
    # Status: 'draft', 'pending', 'published', 'archived'
    category = db.Column(db.String(64), default='general')
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow,
                           onupdate=datetime.datetime.utcnow)

    # Relationships
    comments = db.relationship('Comment', backref='post', lazy='dynamic',
                               cascade='all, delete-orphan')

    def to_dict(self, include_content=True):
        data = {
            'id': self.id,
            'title': self.title,
            'slug': self.slug,
            'excerpt': self.excerpt,
            'author': self.author.to_dict() if self.author else None,
            'status': self.status,
            'category': self.category,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'comment_count': self.comments.count(),
        }
        if include_content:
            data['content'] = self.content
        return data


class Comment(db.Model):
    """Threaded comment model linked to Post and User."""
    __tablename__ = 'comments'

    id = db.Column(db.Integer, primary_key=True)
    body = db.Column(db.Text, nullable=False)
    post_id = db.Column(db.Integer, db.ForeignKey('posts.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey('comments.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    # Self-referential relationship for threading
    replies = db.relationship('Comment', backref=db.backref('parent', remote_side=[id]),
                              lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'body': self.body,
            'user': self.commenter.to_dict() if self.commenter else None,
            'parent_id': self.parent_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'replies': [r.to_dict() for r in self.replies.all()],
        }


class BlogPost(db.Model):
    """Academic journal article for Q-Hub."""
    __tablename__ = 'blog_posts'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(256), nullable=False)
    slug = db.Column(db.String(256), unique=True, nullable=False, index=True)
    content = db.Column(db.Text, nullable=False)
    abstract = db.Column(db.Text, default='')
    featured_image = db.Column(db.String(512), default='')

    author_title = db.Column(db.String(32), default='')
    author_name = db.Column(db.String(128), nullable=False)
    author_affiliation = db.Column(db.String(256), default='')
    author_bio = db.Column(db.Text, default='')

    status = db.Column(db.String(20), nullable=False, default='draft')
    category = db.Column(db.String(64), default='quantum-computing')
    topics = db.Column(db.Text, default='')
    reading_time = db.Column(db.Integer, default=0)

    volume = db.Column(db.Integer, default=1)
    issue = db.Column(db.Integer, default=1)
    page_numbers = db.Column(db.String(32), default='')
    doi = db.Column(db.String(128), default='')

    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    published_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self, include_content=True):
        data = {
            'id': self.id,
            'title': self.title,
            'slug': self.slug,
            'abstract': self.abstract,
            'featured_image': self.featured_image,
            'author': {
                'title': self.author_title,
                'name': self.author_name,
                'affiliation': self.author_affiliation,
                'bio': self.author_bio,
            },
            'status': self.status,
            'category': self.category,
            'topics': [t.strip() for t in self.topics.split(',') if t.strip()],
            'reading_time': self.reading_time,
            'volume': self.volume,
            'issue': self.issue,
            'page_numbers': self.page_numbers,
            'doi': self.doi,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'published_at': self.published_at.isoformat() if self.published_at else None,
        }
        if include_content:
            data['content'] = self.content
        return data
