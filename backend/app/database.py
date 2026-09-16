import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

try:
    from dotenv import load_dotenv
    # Load .env from the backend directory (one level up from app/)
    _env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    load_dotenv(_env_path)
except ImportError:
    pass

SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./asha_copilot.db")

# Render PostgreSQL URLs start with postgres://, SQLAlchemy 2.0 requires postgresql://
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}

# Supabase transaction pooler (port 6543) uses PgBouncer which doesn't support
# prepared statements — disable them to avoid "prepared statement does not exist" errors
engine_kwargs = {}
if ":6543/" in SQLALCHEMY_DATABASE_URL:
    engine_kwargs["execution_options"] = {"no_parameters": False}
    # Disable server-side cursors and prepared statements for pgbouncer
    connect_args.update({"options": "-c statement_timeout=30000"})

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,   # test connection health before use
    pool_recycle=300,     # recycle connections every 5 min (avoids stale conn errors)
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
