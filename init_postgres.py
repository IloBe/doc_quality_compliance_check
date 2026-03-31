#!/usr/bin/env python3
"""
PostgreSQL Database Initialization Script for Doc Quality Compliance Check

This script:
1. Tests PostgreSQL connection
2. Creates the database if missing
3. Runs all Alembic migrations (001-008)
4. Verifies schema integrity
5. Reports initialization status

Usage:
    python init_postgres.py
    
Environment:
    DATABASE_URL: Connection string (default: postgresql://postgres:postgres@localhost:5432)
    DATABASE_ECHO: SQL logging (default: false)
"""

import os
import sys
import subprocess
import time
from pathlib import Path

try:
    from sqlalchemy import create_engine, inspect, text
    from sqlalchemy.exc import OperationalError
except ImportError:
    print("ERROR: sqlalchemy not installed. Run: pip install sqlalchemy psycopg2-binary alembic")
    sys.exit(1)


def colored(text: str, color: str) -> str:
    """Terminal color codes for Windows + Unix compatibility."""
    colors = {
        "green": "\033[92m",
        "red": "\033[91m",
        "yellow": "\033[93m",
        "blue": "\033[94m",
        "reset": "\033[0m",
    }
    return f"{colors.get(color, '')}{text}{colors['reset']}"


def log_info(msg: str):
    print(f"{colored('[INFO]', 'blue')} {msg}")


def log_ok(msg: str):
    print(f"{colored('[✓]', 'green')} {msg}")


def log_warn(msg: str):
    print(f"{colored('[WARN]', 'yellow')} {msg}")


def log_err(msg: str):
    print(f"{colored('[ERROR]', 'red')} {msg}")


class PostgreSQLInitializer:
    """Initialize PostgreSQL for Doc Quality System."""

    def __init__(self):
        # Get database URL from environment or use default
        self.database_url = os.getenv(
            "DATABASE_URL",
            "postgresql+psycopg2://postgres:postgres@localhost:5432/doc_quality"
        )
        self.database_echo = os.getenv("DATABASE_ECHO", "false").lower() == "true"
        
        # Extract connection params
        self.parsed_url = self._parse_database_url()
        self.repo_root = Path(__file__).parent
        self.migrations_dir = self.repo_root / "migrations"

    def _parse_database_url(self) -> dict:
        """Parse PostgreSQL connection URL."""
        try:
            from sqlalchemy.engine.url import make_url
            url = make_url(self.database_url)
            return {
                "user": url.username or "postgres",
                "password": url.password or "postgres",
                "host": url.host or "localhost",
                "port": url.port or 5432,
                "database": url.database or "doc_quality",
            }
        except Exception as e:
            log_err(f"Failed to parse DATABASE_URL: {e}")
            sys.exit(1)

    def test_connection(self) -> bool:
        """Test PostgreSQL connectivity."""
        log_info(f"Testing PostgreSQL connection to {self.parsed_url['host']}:{self.parsed_url['port']}...")
        try:
            # Try to connect to the default 'postgres' database first
            default_url = f"postgresql+psycopg2://{self.parsed_url['user']}:{self.parsed_url['password']}@{self.parsed_url['host']}:{self.parsed_url['port']}/postgres"
            engine = create_engine(default_url, echo=False, connect_args={"connect_timeout": 5})
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            log_ok("PostgreSQL server is reachable")
            return True
        except OperationalError as e:
            log_err(f"Cannot reach PostgreSQL: {e}")
            log_info("Make sure PostgreSQL is running:")
            log_info("  Option 1 (Local): Start PostgreSQL service (Windows Service / brew / systemctl)")
            log_info("  Option 2 (Docker): docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16")
            return False

    def create_database(self) -> bool:
        """Create database if it doesn't exist."""
        log_info(f"Checking/creating database '{self.parsed_url['database']}'...")
        try:
            # Connect to default 'postgres' database to create doc_quality
            default_url = f"postgresql+psycopg2://{self.parsed_url['user']}:{self.parsed_url['password']}@{self.parsed_url['host']}:{self.parsed_url['port']}/postgres"
            engine = create_engine(default_url, echo=False)
            with engine.connect() as conn:
                # Check if database exists
                result = conn.execute(
                    text(f"SELECT 1 FROM pg_database WHERE datname='{self.parsed_url['database']}'")
                )
                if result.fetchone():
                    log_ok(f"Database '{self.parsed_url['database']}' already exists")
                else:
                    # Create database
                    conn.execution_options(isolation_level="AUTOCOMMIT").execute(
                        text(f"CREATE DATABASE {self.parsed_url['database']}")
                    )
                    log_ok(f"Created database '{self.parsed_url['database']}'")
            return True
        except Exception as e:
            log_err(f"Failed to create database: {e}")
            return False

    def run_migrations(self) -> bool:
        """Run Alembic migrations."""
        log_info("Running Alembic migrations...")
        if not self.migrations_dir.exists():
            log_err(f"Migrations directory not found: {self.migrations_dir}")
            return False

        try:
            env = os.environ.copy()
            env["DATABASE_URL"] = self.database_url
            env["DATABASE_ECHO"] = "true" if self.database_echo else "false"

            result = subprocess.run(
                [
                    sys.executable,
                    "-m",
                    "alembic",
                    "-c",
                    str(self.migrations_dir / "alembic.ini"),
                    "upgrade",
                    "head",
                ],
                cwd=str(self.repo_root),
                env=env,
                capture_output=True,
                text=True,
                timeout=30,
            )

            if result.returncode == 0:
                log_ok("Migrations completed successfully")
                return True
            else:
                log_err(f"Migration failed:\n{result.stderr}")
                return False
        except subprocess.TimeoutExpired:
            log_err("Migration timeout (>30s)")
            return False
        except Exception as e:
            log_err(f"Failed to run migrations: {e}")
            return False

    def verify_schema(self) -> bool:
        """Verify that all required tables exist."""
        log_info("Verifying schema integrity...")
        required_tables = {
            "hitl_reviews": ["review_id", "document_id", "status"],
            "skill_documents": ["document_id", "filename"],
            "skill_findings": ["finding_id", "document_id"],
            "audit_events": ["event_id", "event_type"],
            "user_sessions": ["session_id", "session_token_hash", "user_email"],
            "quality_observations": ["observation_id", "aspect", "outcome", "source_component"],
            "stakeholder_profiles": ["profile_id", "title", "permissions", "is_active"],
            "stakeholder_employee_assignments": ["assignment_id", "profile_id", "employee_name"],
        }

        try:
            engine = create_engine(self.database_url, echo=False)
            inspector = inspect(engine)
            existing_tables = inspector.get_table_names()

            all_ok = True
            for table_name, required_columns in required_tables.items():
                if table_name not in existing_tables:
                    log_warn(f"Table '{table_name}' not found")
                    all_ok = False
                else:
                    existing_columns = {col["name"] for col in inspector.get_columns(table_name)}
                    missing_columns = set(required_columns) - existing_columns
                    if missing_columns:
                        log_warn(f"Table '{table_name}' missing columns: {missing_columns}")
                        all_ok = False
                    else:
                        log_ok(f"Table '{table_name}' OK ({len(existing_columns)} columns)")

            return all_ok
        except Exception as e:
            log_err(f"Schema verification failed: {e}")
            return False

    def run(self):
        """Execute full initialization sequence."""
        print(colored("=" * 70, "blue"))
        print(colored("PostgreSQL Database Initialization", "blue"))
        print(colored("Doc Quality Compliance Check System", "blue"))
        print(colored("=" * 70, "blue"))
        print()

        print(f"Database URL: {self.database_url.split('@')[0]}@{self.database_url.split('@')[1] if '@' in self.database_url else 'unknown'}")
        print()

        steps = [
            ("Test Connection", self.test_connection),
            ("Create Database", self.create_database),
            ("Run Migrations", self.run_migrations),
            ("Verify Schema", self.verify_schema),
        ]

        results = {}
        for step_name, step_fn in steps:
            print(f"\n{colored('Step:', 'blue')} {step_name}")
            print("-" * 70)
            results[step_name] = step_fn()

        print(f"\n{colored('=' * 70, 'blue')}")
        print(colored("Initialization Summary", "blue"))
        print(colored("=" * 70, "blue"))
        for step, ok in results.items():
            status = colored("✓ OK", "green") if ok else colored("✗ FAILED", "red")
            print(f"  {step}: {status}")

        all_passed = all(results.values())
        print()
        if all_passed:
            log_ok("Database initialization complete!")
            print()
            print(colored("Next steps:", "green"))
            print("  1. Set DATABASE_URL in .env:")
            print(f"     DATABASE_URL={self.database_url}")
            print("  2. Start backend:")
            print(r"     .\.venv\Scripts\python.exe -m uvicorn src.doc_quality.api.main:app --host 127.0.0.1 --port 8000 --reload")
            print("  3. Test login:")
            print("     curl -X POST http://localhost:8000/api/v1/auth/login \\")
            print("       -H 'Content-Type: application/json' \\")
            print(r'       -d \'{"email":"demo@quality-station.ai","password":"change-me"}\'')
        else:
            log_err("Database initialization incomplete. Fix errors above and retry.")
            sys.exit(1)


if __name__ == "__main__":
    initializer = PostgreSQLInitializer()
    initializer.run()
