"""
Tipos SQLAlchemy compatíveis com PostgreSQL e SQLite.
"""
from sqlalchemy import String, JSON
from sqlalchemy.types import TypeDecorator
import json as _json


class UUIDStr(TypeDecorator):
    """UUID armazenado como VARCHAR(36) — funciona em PostgreSQL e SQLite."""
    impl = String(36)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        return str(value) if value is not None else None

    def process_result_value(self, value, dialect):
        return str(value) if value is not None else None


class JSONColumn(TypeDecorator):
    """JSON compatível com SQLite (serializa para texto) e PostgreSQL (nativo)."""
    impl = String
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            from sqlalchemy.dialects.postgresql import JSON as PGJSON
            return dialect.type_descriptor(PGJSON())
        return dialect.type_descriptor(String())

    def process_bind_param(self, value, dialect):
        if dialect.name == "postgresql":
            return value
        return _json.dumps(value, ensure_ascii=False) if value is not None else None

    def process_result_value(self, value, dialect):
        if dialect.name == "postgresql":
            return value
        if isinstance(value, str):
            try:
                return _json.loads(value)
            except (_json.JSONDecodeError, TypeError):
                return value
        return value
