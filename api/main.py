import os
from datetime import datetime, timedelta
from typing import List
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from passlib.context import CryptContext
from jose import JWTError, jwt
from dotenv import load_dotenv

from models import (
    Base, User, ParkingSpot, LayoutConfigDB, Booking, Vehicle, BookingAuditLog,
    UserCreate, Token, ParkingState, LayoutConfig, BookingRequest, SpotSchema,
    BookingCreate, BookingResponse, VehicleCreate, VehicleResponse, CancelBookingRequest,
    BookingCreate, BookingResponse, VehicleCreate, VehicleResponse, CancelBookingRequest,
    UserResponse, PromoCode, PromoCodeResponse
)

# Load env vars
load_dotenv()

DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")
SECRET_KEY = os.getenv("SECRET_KEY", "secret")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

# Database Setup
SQLALCHEMY_DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Auth Setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    Base.metadata.create_all(bind=engine)
    # Initialize default layout if not exists
    db = SessionLocal()
    if not db.query(LayoutConfigDB).first():
        db.add(LayoutConfigDB(rows=5, cols=5))
        db.commit()
    db.close()
    yield
    # Shutdown (if needed)

# Create FastAPI app with lifespan
app = FastAPI(lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Auth Helpers
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

    if len(password.encode('utf-8')) > 72:
        password = password.encode('utf-8')[:72].decode('utf-8', errors='ignore')
    return pwd_context.hash(password)

def format_spot_id(row: int, col: int) -> str:
    # A=0, B=1, ... and 1=0, 2=1 ...
    # So Row 0, Col 0 -> A1. Row 1, Col 5 -> B6
    row_char = chr(65 + row)
    col_num = col + 1
    return f"{row_char}{col_num}"

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = data.get("exp") or (timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES) + timedelta(minutes=0)) # simplified
        # Actually let's do it properly
        import datetime
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        import datetime
        expire = datetime.datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

# Endpoints

@app.post("/signup", response_model=Token)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = get_password_hash(user.password)
    new_user = User(
        username=user.username, 
        hashed_password=hashed_password, 
        role=user.role,
        full_name=user.full_name,
        email=user.email,
        phone=user.phone
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    access_token = create_access_token(data={"sub": new_user.username, "role": new_user.role})
    
    user_response = UserResponse(
        id=new_user.id,
        username=new_user.username,
        role=new_user.role,
        full_name=new_user.full_name,
        email=new_user.email,
        phone=new_user.phone
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "role": new_user.role, 
        "username": new_user.username,
        "user": user_response
    }

@app.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.username, "role": user.role})
    
    user_response = UserResponse(
        id=user.id,
        username=user.username,
        role=user.role,
        full_name=user.full_name,
        email=user.email,
        phone=user.phone
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "role": user.role, 
        "username": user.username,
        "user": user_response
    }

@app.get("/users/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        role=current_user.role,
        full_name=current_user.full_name,
        email=current_user.email,
        phone=current_user.phone
    )

@app.get("/layout", response_model=ParkingState)
def get_layout(db: Session = Depends(get_db)):
    layout = db.query(LayoutConfigDB).first()
    if not layout:
        layout = LayoutConfigDB(rows=5, cols=5) # Fallback
    
    spots_db = db.query(ParkingSpot).all()
    spots_out = []
    for r in range(layout.rows):
        for c in range(layout.cols):
            spot = next((s for s in spots_db if s.row == r and s.col == c), None)
            is_booked = spot.is_booked if spot else False
            booked_by_username = None
            if spot and spot.booked_by:
                booked_by_username = spot.booked_by.username
            spots_out.append(SpotSchema(
                id=spot.id if spot else None,
                row=r, 
                col=c, 
                is_booked=is_booked,
                booked_by_username=booked_by_username
            ))
            
    return ParkingState(rows=layout.rows, cols=layout.cols, spots=spots_out)

@app.post("/admin/layout")
def update_layout(config: LayoutConfig, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    layout = db.query(LayoutConfigDB).first()
    if not layout:
        layout = LayoutConfigDB(rows=config.rows, cols=config.cols)
        db.add(layout)
    else:
        layout.rows = config.rows
        layout.cols = config.cols
    
    db.query(ParkingSpot).filter((ParkingSpot.row >= config.rows) | (ParkingSpot.col >= config.cols)).delete()
    db.commit()
    return get_layout(db)

@app.post("/promos/check", response_model=PromoCodeResponse)
def check_promo_code(code: str, db: Session = Depends(get_db)):
    promo = db.query(PromoCode).filter(PromoCode.code == code.upper(), PromoCode.is_active == True).first()
    
    if not promo:
        raise HTTPException(status_code=404, detail="Invalid promo code")
        
    if promo.expiry_date < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Promo code expired")
        
    if promo.current_uses >= promo.usage_limit:
        raise HTTPException(status_code=400, detail="Promo code usage limit reached")
        
    return PromoCodeResponse(
        code=promo.code,
        discount_type=promo.discount_type,
        discount_value=float(promo.discount_value),
        description=f"{promo.discount_value}% OFF" if promo.discount_type == "percentage" else f"FLAT {promo.discount_value} OFF"
    )

@app.post("/book")
def book_spot(request: BookingRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    layout = db.query(LayoutConfigDB).first()
    if request.row >= layout.rows or request.col >= layout.cols:
        raise HTTPException(status_code=400, detail="Invalid coordinates")

    spot = db.query(ParkingSpot).filter(ParkingSpot.row == request.row, ParkingSpot.col == request.col).first()
    
    if request.is_booked:
        if spot and spot.is_booked:
             raise HTTPException(status_code=400, detail="Spot already booked")
        if not spot:
            spot = ParkingSpot(row=request.row, col=request.col, is_booked=True, booked_by_id=current_user.id)
            db.add(spot)
        else:
            spot.is_booked = True
            spot.booked_by_id = current_user.id
    else:
        # Unbook
        if spot:
            # Check if user owns the booking or is admin
            if spot.booked_by_id != current_user.id and current_user.role != "admin":
                 raise HTTPException(status_code=403, detail="Not authorized to unbook this spot")
            spot.is_booked = False
            spot.booked_by_id = None
            
    db.commit()
    return get_layout(db)

@app.get("/vehicles/{license_plate}", response_model=VehicleResponse)
def get_vehicle_by_license(license_plate: str, db: Session = Depends(get_db)):
    vehicle = db.query(Vehicle).filter(Vehicle.license_plate == license_plate.upper()).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle

@app.get("/my-vehicles", response_model=List[VehicleResponse])
def get_my_vehicles(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Vehicle).filter(Vehicle.user_id == current_user.id).all()

@app.post("/vehicles", response_model=VehicleResponse)
def create_or_update_vehicle(vehicle_data: VehicleCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check if vehicle already exists
    existing_vehicle = db.query(Vehicle).filter(
        Vehicle.license_plate == vehicle_data.license_plate.upper()
    ).first()
    
    if existing_vehicle:
        # Check ownership if vehicle exists
        if existing_vehicle.user_id and existing_vehicle.user_id != current_user.id:
             raise HTTPException(status_code=400, detail="Vehicle already registered to another user")

        # Update existing vehicle
        for field, value in vehicle_data.dict(exclude_unset=True).items():
            if field == "license_plate":
                value = value.upper()
            setattr(existing_vehicle, field, value)
        
        # Associate with user if not already
        if not existing_vehicle.user_id:
            existing_vehicle.user_id = current_user.id
            
        existing_vehicle.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing_vehicle)
        return existing_vehicle
    else:
        # Create new vehicle
        vehicle_dict = vehicle_data.dict()
        vehicle_dict["license_plate"] = vehicle_dict["license_plate"].upper()
        if not vehicle_dict.get("owner_name"):
            vehicle_dict["owner_name"] = current_user.username
        vehicle_dict["user_id"] = current_user.id
        new_vehicle = Vehicle(**vehicle_dict)
        db.add(new_vehicle)
        db.commit()
        db.refresh(new_vehicle)
        return new_vehicle

def log_booking_audit(db: Session, booking_id: int, user_id: int, action: str, old_status: str = None, new_status: str = None, details: str = None):
    audit_log = BookingAuditLog(
        booking_id=booking_id,
        user_id=user_id,
        action=action,
        old_status=old_status,
        new_status=new_status,
        details=details
    )
    db.add(audit_log)

def calculate_refund_amount(booking: Booking, cancellation_time: datetime) -> tuple[float, str]:
    hours_before_start = (booking.start_time - cancellation_time).total_seconds() / 3600
    
    if hours_before_start >= 24:
        return float(booking.payment_amount), "100% refund - cancelled more than 24 hours in advance"
    elif hours_before_start >= 2:
        refund = float(booking.payment_amount) * 0.5
        return refund, "50% refund - cancelled within 24 hours"
    else:
        return 0, "No refund - cancelled within 2 hours of start time"

@app.post("/bookings", response_model=BookingResponse)
def create_booking(booking_data: BookingCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from datetime import datetime
    
    # Check if spot exists and is available
    spot = db.query(ParkingSpot).filter(
        ParkingSpot.row == booking_data.row,
        ParkingSpot.col == booking_data.col
    ).first()
    
    if spot and spot.is_booked:
        raise HTTPException(status_code=400, detail="Spot is already booked")
    
    # Create spot if it doesn't exist
    if not spot:
        spot = ParkingSpot(row=booking_data.row, col=booking_data.col)
        db.add(spot)
        db.flush()  # To get the ID
    
    # Handle vehicle
    vehicle = db.query(Vehicle).filter(
        Vehicle.license_plate == booking_data.license_plate.upper()
    ).first()
    
    if not vehicle:
        if not booking_data.vehicle_data:
            # Create basic vehicle record with license plate
            vehicle = Vehicle(
                license_plate=booking_data.license_plate.upper(),
                owner_name=booking_data.name,
                phone=booking_data.phone,
                email=booking_data.email
            )
        else:
            # Create vehicle with detailed data
            vehicle_dict = booking_data.vehicle_data.dict()
            vehicle_dict["license_plate"] = booking_data.license_plate.upper()
            vehicle = Vehicle(**vehicle_dict)
        
        db.add(vehicle)
        db.flush()  # To get the ID
    
    # Mark spot as booked
    spot.is_booked = True
    spot.booked_by_id = current_user.id
    
    
    # Calculate Payment
    original_amount = float(booking_data.payment_amount)
    final_amount = original_amount
    discount_amount = 0.0
    promo_code_id = None
    
    if booking_data.promo_code:
        promo = db.query(PromoCode).filter(PromoCode.code == booking_data.promo_code.upper(), PromoCode.is_active == True).first()
        if promo:
            # Validate again just in case
            if promo.expiry_date > datetime.utcnow() and promo.current_uses < promo.usage_limit:
                if promo.discount_type == "percentage":
                    discount_amount = (original_amount * float(promo.discount_value)) / 100
                else:
                    discount_amount = float(promo.discount_value)
                
                # Cap discount at original amount (no negative price)
                discount_amount = min(discount_amount, original_amount)
                final_amount = original_amount - discount_amount
                
                promo_code_id = promo.id
                
                # Update usage
                promo.current_uses += 1
                
    # Create detailed booking record
    booking = Booking(
        user_id=current_user.id,
        spot_id=spot.id,
        vehicle_id=vehicle.id,
        name=booking_data.name,
        email=booking_data.email,
        phone=booking_data.phone,
        start_time=booking_data.start_time,
        end_time=booking_data.end_time,
        payment_method=booking_data.payment_method,
        payment_amount=final_amount,
        discount_amount=discount_amount,
        promo_code_id=promo_code_id,
        status="active"
    )
    
    db.add(booking)
    db.flush()  # To get the ID for audit log
    
    # Log the booking creation
    log_booking_audit(
        db, booking.id, current_user.id, "created", 
        None, "active", f"Booking created for {vehicle.license_plate}. Paid: {final_amount}"
    )
    
    db.commit()
    db.refresh(booking)
    
    # Check if booking can be cancelled (configurable business rule)
    can_cancel = booking.status == "active" and booking.start_time > datetime.utcnow()
    
    return BookingResponse(
        id=booking.id,
        spot_info=format_spot_id(spot.row, spot.col),
        name=booking.name,
        email=booking.email,
        phone=booking.phone,
        vehicle=VehicleResponse.model_validate(vehicle),
        start_time=booking.start_time,
        end_time=booking.end_time,
        payment_method=booking.payment_method,
        payment_amount=float(booking.payment_amount),
        discount_amount=float(booking.discount_amount),
        promo_code=booking.promo_code.code if booking.promo_code else None,
        status=booking.status,
        refund_status=booking.refund_status,
        refund_amount=float(booking.refund_amount),
        created_at=booking.created_at,
        can_cancel=can_cancel
    )

@app.get("/bookings", response_model=List[BookingResponse])
def get_user_bookings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from datetime import datetime
    
    bookings = db.query(Booking).filter(
        Booking.user_id == current_user.id
    ).order_by(Booking.created_at.desc()).all()
    
    result = []
    for booking in bookings:
        can_cancel = (
            booking.status == "active" and 
            booking.start_time > datetime.utcnow()
        )
        
        result.append(BookingResponse(
            id=booking.id,
            spot_info=format_spot_id(booking.spot.row, booking.spot.col),
            name=booking.name,
            email=booking.email,
            phone=booking.phone,
            vehicle=VehicleResponse.model_validate(booking.vehicle),
            start_time=booking.start_time,
            end_time=booking.end_time,
            payment_method=booking.payment_method,
            payment_amount=float(booking.payment_amount),
            discount_amount=float(booking.discount_amount),
            promo_code=booking.promo_code.code if booking.promo_code else None,
            status=booking.status,
            refund_status=booking.refund_status,
            refund_amount=float(booking.refund_amount),
            created_at=booking.created_at,
            can_cancel=can_cancel
        ))
    
    return result

@app.get("/admin/bookings", response_model=List[BookingResponse])
def get_all_bookings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    bookings = db.query(Booking).order_by(Booking.created_at.desc()).all()
    
    result = []
    for booking in bookings:
        can_cancel = (
            booking.status == "active" and 
            booking.start_time > datetime.utcnow()
        )
        
        result.append(BookingResponse(
            id=booking.id,
            spot_info=format_spot_id(booking.spot.row, booking.spot.col),
            name=booking.name,
            email=booking.email,
            phone=booking.phone,
            vehicle=VehicleResponse.model_validate(booking.vehicle),
            start_time=booking.start_time,
            end_time=booking.end_time,
            payment_method=booking.payment_method,
            payment_amount=float(booking.payment_amount),
            discount_amount=float(booking.discount_amount),
            promo_code=booking.promo_code.code if booking.promo_code else None,
            status=booking.status,
            refund_status=booking.refund_status,
            refund_amount=float(booking.refund_amount),
            created_at=booking.created_at,
            can_cancel=can_cancel
        ))
    
    return result

@app.delete("/bookings/{booking_id}")
def cancel_booking(
    booking_id: int, 
    cancel_data: CancelBookingRequest,
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    from datetime import datetime
    
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.user_id == current_user.id
    ).first()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking.status != "active":
        raise HTTPException(status_code=400, detail="Cannot cancel this booking")
    
    # Check if booking can be cancelled (before start time)
    current_time = datetime.utcnow()
    if booking.start_time <= current_time:
        raise HTTPException(status_code=400, detail="Cannot cancel booking that has already started")
    
    # Calculate refund amount
    refund_amount, refund_reason = calculate_refund_amount(booking, current_time)
    
    # Update booking status
    old_status = booking.status
    booking.status = "cancelled"
    booking.refund_status = "pending" if refund_amount > 0 else "none"
    booking.refund_amount = refund_amount
    booking.cancellation_reason = cancel_data.cancellation_reason
    booking.cancellation_time = current_time
    
    # Free up the spot
    spot = booking.spot
    spot.is_booked = False
    spot.booked_by_id = None
    
    # Log the cancellation
    log_booking_audit(
        db, booking.id, current_user.id, "cancelled",
        old_status, "cancelled", 
        f"Cancelled by user. Reason: {cancel_data.cancellation_reason or 'Not provided'}. {refund_reason}"
    )
    
    db.commit()
    
    return {
        "message": "Booking cancelled successfully",
        "refund_amount": refund_amount,
        "refund_reason": refund_reason
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
