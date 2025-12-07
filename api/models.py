from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, Numeric, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum as PyEnum

Base = declarative_base()

# SQLAlchemy Models
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    hashed_password = Column(String(255))
    role = Column(String(20), default="customer")  # "admin" or "customer"
    full_name = Column(String(100))
    email = Column(String(100))
    phone = Column(String(20))

class ParkingSpot(Base):
    __tablename__ = "parking_spots"
    id = Column(Integer, primary_key=True, index=True)
    row = Column(Integer)
    col = Column(Integer)
    is_booked = Column(Boolean, default=False)
    booked_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    booked_by = relationship("User")

class BookingStatus(PyEnum):
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"

class RefundStatus(PyEnum):
    NONE = "none"
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"

class Vehicle(Base):
    __tablename__ = "vehicles"
    id = Column(Integer, primary_key=True, index=True)
    license_plate = Column(String(20), unique=True, index=True, nullable=False)
    owner_name = Column(String(100), nullable=False)
    make = Column(String(50))
    model = Column(String(50))
    color = Column(String(30))
    year = Column(Integer)
    phone = Column(String(20))
    email = Column(String(100))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", backref="vehicles")

class PromoCode(Base):
    __tablename__ = "promo_codes"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    discount_type = Column(String(20), nullable=False) # "percentage" or "fixed"
    discount_value = Column(Numeric(10, 2), nullable=False)
    expiry_date = Column(DateTime, nullable=False)
    usage_limit = Column(Integer, default=1)
    current_uses = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    
class Booking(Base):
    __tablename__ = "bookings"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    spot_id = Column(Integer, ForeignKey("parking_spots.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    booking_uuid = Column(String(36), unique=True, index=True) # UUID for QR code
    name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    payment_method = Column(String(50), nullable=False)
    payment_amount = Column(Numeric(10, 2), nullable=False)
    discount_amount = Column(Numeric(10, 2), default=0)
    promo_code_id = Column(Integer, ForeignKey("promo_codes.id"), nullable=True)
    status = Column(String(20), default="active")
    refund_status = Column(String(20), default="none")
    refund_amount = Column(Numeric(10, 2), default=0)
    
    promo_code = relationship("PromoCode")
    cancellation_reason = Column(Text)
    cancellation_time = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User")
    spot = relationship("ParkingSpot")
    vehicle = relationship("Vehicle")

class BookingAuditLog(Base):
    __tablename__ = "booking_audit_log"
    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(50), nullable=False)  # "created", "cancelled", "completed", "refunded"
    old_status = Column(String(20))
    new_status = Column(String(20))
    details = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    booking = relationship("Booking")
    user = relationship("User")

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
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    full_name: Optional[str]
    email: Optional[str]
    phone: Optional[str]

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str
    user: Optional[UserResponse] = None

class SpotSchema(BaseModel):
    id: Optional[int] = None
    row: int
    col: int
    is_booked: bool
    booked_by_username: Optional[str] = None

class ParkingState(BaseModel):
    rows: int
    cols: int
    spots: List[SpotSchema]

class LayoutConfig(BaseModel):
    rows: int
    cols: int

class PromoCodeResponse(BaseModel):
    code: str
    discount_type: str
    discount_value: float
    description: Optional[str] = None

class VehicleCreate(BaseModel):
    license_plate: str = Field(..., min_length=1, max_length=20)
    owner_name: Optional[str] = Field(None, max_length=100)
    make: Optional[str] = Field(None, max_length=50)
    model: Optional[str] = Field(None, max_length=50)
    color: Optional[str] = Field(None, max_length=30)
    year: Optional[int] = Field(None, ge=1900, le=2030)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=100)

class VehicleResponse(BaseModel):
    id: int
    license_plate: str
    owner_name: str
    make: Optional[str]
    model: Optional[str]
    color: Optional[str]
    year: Optional[int]
    phone: Optional[str]
    email: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class BookingCreate(BaseModel):
    row: int
    col: int
    license_plate: str
    vehicle_data: Optional[VehicleCreate] = None
    name: str
    email: str
    phone: str
    start_time: datetime
    end_time: datetime
    payment_method: str
    payment_amount: float = Field(..., ge=0)
    promo_code: Optional[str] = None

class BookingResponse(BaseModel):
    id: int
    booking_uuid: Optional[str] = None # UUID for QR code
    spot_info: str
    name: str
    email: str
    phone: str
    vehicle: VehicleResponse
    start_time: datetime
    end_time: datetime
    payment_method: str
    payment_amount: float
    discount_amount: float = 0.0
    promo_code: Optional[str] = None
    status: str
    refund_status: str
    refund_amount: float
    created_at: datetime
    can_cancel: bool

    class Config:
        from_attributes = True

class CancelBookingRequest(BaseModel):
    cancellation_reason: Optional[str] = None

class BookingRequest(BaseModel):
    row: int
    col: int
    is_booked: bool
