"""SQLAlchemy Declarative Base foundation."""
from sqlalchemy.orm import declarative_base

# Base class for all future database models to inherit from
Base = declarative_base()
