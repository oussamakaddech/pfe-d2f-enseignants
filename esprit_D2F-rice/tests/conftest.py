"""
conftest.py — Shared pytest fixtures for the RICE test suite.

Disables JWT authentication for all integration tests so that TestClient
requests don't get 401 Unauthorized from JWTAuthMiddleware.

Also disables the sentence-transformers semantic model so that tests run
fast without loading the ~80 MB model and building embeddings, which was
causing the SonarQube pytest stage to hang.
"""
import os

# Force JWT auth OFF before any rice module is imported
os.environ["APP_ENV"] = "development"
os.environ["JWT_AUTH_ENABLED"] = "false"
os.environ["JWT_SECRET"] = "a" * 64
os.environ["RICE_AUTH_ENABLED"] = "false"

# Disable semantic model so tests don't load sentence-transformers
os.environ["RICE_DISABLE_SEMANTIC"] = "true"

# Stub psycopg2 connect and ThreadedConnectionPool before any module imports them!
try:
    class _DummyCursor:
        def execute(self, *a, **kw): pass
        def fetchone(self): return (False,)  # EXISTS check returns False
        def fetchall(self): return []
        def close(self): pass

    class _DummyConn:
        def cursor(self): return _DummyCursor()
        def commit(self): pass
        def close(self): pass

    class _DummyPool:
        def __init__(self, *args, **kwargs): pass
        def getconn(self): return _DummyConn()
        def putconn(self, conn): pass

    # Patch psycopg2.connect
    try:
        import psycopg2
        psycopg2.connect = lambda *a, **kw: _DummyConn()
    except ImportError:
        pass

    # Patch psycopg2.pool.ThreadedConnectionPool
    try:
        import psycopg2.pool
        psycopg2.pool.ThreadedConnectionPool = _DummyPool
    except ImportError:
        pass
except Exception:
    pass


def pytest_configure(config):
    """Patch JWT, route auth flags, and semantic model after modules are imported."""
    try:
        import rice.jwt_middleware as _jwt_mod
        _jwt_mod.JWT_AUTH_ENABLED = False
    except ImportError:
        pass
    try:
        import rice.routes as _routes_mod
        _routes_mod._AUTH_ENABLED = False
    except ImportError:
        pass
    # Disable the sentence-transformers model to keep tests fast
    try:
        import rice.referential as _ref_mod
        _ref_mod._SEMANTIC_OK = False
        _ref_mod._SEMANTIC_CORPUS_BUILT = False
        _ref_mod._SEMANTIC_CORPUS = []
    except ImportError:
        pass

    # Stub the database to prevent TCP connection timeouts in tests
    try:
        class _DummyCursor:
            def execute(self, *a, **kw): pass
            def fetchone(self): return (False,)  # EXISTS check returns False
            def fetchall(self): return []
            def close(self): pass

        class _DummyConn:
            def cursor(self): return _DummyCursor()
            def commit(self): pass
            def close(self): pass

        dummy_func = lambda: _DummyConn()

        # Patch all places that hold a reference to _get_db_connection
        try:
            import rice.db as _db_mod
            _db_mod._get_db_connection = dummy_func
        except ImportError:
            pass
        try:
            import rice.referential as _ref_mod
            _ref_mod._get_db_connection = dummy_func
        except ImportError:
            pass
        try:
            import rice.routes as _routes_mod
            _routes_mod._get_db_connection = dummy_func
        except ImportError:
            pass
        try:
            import rice as _rice_pkg
            _rice_pkg._get_db_connection = dummy_func
        except ImportError:
            pass
    except Exception:
        pass
