"""
Qcuit Platform Configuration
Environment-based configuration for Development, Testing, and Production.
"""

import os

basedir = os.path.abspath(os.path.dirname(__file__))


class Config:
    """Base configuration."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'qcuit-dev-key-change-in-production')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'qcuit-jwt-dev-key')
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24 hours

    # Legacy content moderation; not part of the active library-first UI.
    REQUIRE_POST_APPROVAL = True


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        'sqlite:///' + os.path.join(basedir, '..', 'qcuit_dev.db')
    )


class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    REQUIRE_POST_APPROVAL = False


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', '')

    # Managed Postgres providers often emit a
    # ``postgres://`` scheme, but SQLAlchemy requires ``postgresql://``.
    if SQLALCHEMY_DATABASE_URI.startswith('postgres://'):
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace(
            'postgres://', 'postgresql://', 1
        )

    # Serverless (Vercel) runs many short-lived instances, so a per-instance
    # connection pool quickly exhausts the database's connection limit and
    # leaves stale sockets between cold starts. NullPool opens/closes a
    # connection per request; pair this with a provider-side pooler
    # (e.g. Neon/Vercel Postgres "pooled" connection string) for best results.
    from sqlalchemy.pool import NullPool
    SQLALCHEMY_ENGINE_OPTIONS = {
        'poolclass': NullPool,
        'pool_pre_ping': True,
    }


config_by_name = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
}
