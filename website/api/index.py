"""
Qcuit Platform — Entry Point
Uses the Application Factory from api/__init__.py.
All routes are now registered via create_app().
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from api import create_app

app = create_app()


if __name__ == "__main__":
    debug = os.getenv("FLASK_DEBUG", "1").lower() not in {"0", "false", "no"}
    use_reloader = os.getenv("FLASK_RELOAD", "0").lower() in {"1", "true", "yes"}
    app.run(host="0.0.0.0", port=5001, debug=debug, use_reloader=use_reloader)
