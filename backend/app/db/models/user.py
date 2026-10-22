from sqlalchemy import Boolean, Column, Integer, String

from app.db.base import Base, TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String(254), unique=True, nullable=False, index=True)
    display_name = Column(String(80), nullable=False)
    password_hash = Column(String(255))
    google_sub = Column(String(255), unique=True, index=True)
    is_active = Column(Boolean, nullable=False, default=True, server_default="true")
