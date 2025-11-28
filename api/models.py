from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from pydantic import BaseModel
from typing import List, Optional

Base = declarative_base()

# SQLAlchemy Models
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    hashed_password = Column(String(255))
    role = Column(String(20), default="customer")  # "admin" or "customer"

class ParkingSpot(Base):
    __tablename__ = "parking_spots"
    id = Column(Integer, primary_key=True, index=True)
    row = Column(Integer)
    col = Column(Integer)
    is_booked = Column(Boolean, default=False)
    booked_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    booked_by = relationship("User")

class LayoutConfigDB(Base):
    __tablename__ = "layout_config"
    id = Column(Integer, primary_key=True, index=True)
    rows = Column(Integer)
    cols = Column(Integer)

# Pydantic Schemas
class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "customer"

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str

class SpotSchema(BaseModel):
    row: int
    col: int
    is_booked: bool

class ParkingState(BaseModel):
    rows: int
    cols: int
    spots: List[SpotSchema]

class LayoutConfig(BaseModel):
    rows: int
    cols: int

class BookingRequest(BaseModel):
    row: int
    col: int
    is_booked: bool
