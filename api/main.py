import os
from datetime import datetime, timedelta
from typing import List, Optional
from contextlib import asynccontextmanager

from pydantic import BaseModel

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker, Session
from passlib.context import CryptContext
from jose import JWTError, jwt
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import io
import math
import os
import random
import string
from fastapi.responses import StreamingResponse
from utils.pdf import generate_booking_receipt
from dotenv import load_dotenv
from utils.email import send_email
from utils.common import format_spot_id

try:
    # from ddtrace import patch_all
    # patch_all()
    pass
except ImportError:
    pass

# ... models imports ... 
from models import (
    Base, User, ParkingSpot, Booking, Vehicle, PromoCode, SystemConfig, 
    BookingStatus, RefundStatus, BookingAuditLog, LayoutConfigDB, PasswordReset
) 



from models import (
    Base, User, ParkingSpot, LayoutConfigDB, Booking, Vehicle, BookingAuditLog,
    UserCreate, Token, ParkingState, LayoutConfig, BookingRequest, SpotSchema,
    BookingCreate, BookingResponse, VehicleCreate, VehicleResponse, CancelBookingRequest,
    AnalyticsResponse, ChartData, UpdateSpot, PromoCode, PromoCodeCreate, PromoCodeResponse, SystemConfig,
    UserResponse
)

# Pydantic Models for Password Reset

class PasswordResetRequest(BaseModel):
    email: str

class OTPVerifyRequest(BaseModel):
    email: str
    otp: str

class NewPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str

# Pydantic Models for Config
class ConfigItem(BaseModel):
    key: str
    value: str
    description: Optional[str] = None

class ConfigUpdate(BaseModel):
    configs: List[ConfigItem]

class PaginatedBookingResponse(BaseModel):
    items: List[BookingResponse]
    total: int
    page: int
    size: int
    pages: int

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

from database import engine, SessionLocal, get_db

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
    
    # Start background task for expiring pending bookings & email alerts
    import asyncio
    from utils.email import send_email

    async def background_monitor():
        while True:
            # Check every 5 minutes (300 seconds)
            await asyncio.sleep(300) 
            db_session = SessionLocal()
            try:
                now = datetime.utcnow()
                # print(f"Running background monitor at {now}...")
                
                # 1. Expire Pending Bookings
                expiration_threshold = now - timedelta(minutes=15)
                expired_bookings = db_session.query(Booking).filter(
                    Booking.status == 'pending',
                    Booking.created_at < expiration_threshold
                ).all()
                
                for booking in expired_bookings:
                    booking.status = 'expired'
                    if booking.payment_status == 'pending':
                         booking.payment_status = 'failed'
                db_session.commit()

                # 2. Email Notifications
                active_bookings = db_session.query(Booking).filter(Booking.status == 'active').all()
                for booking in active_bookings:
                    if not booking.user or not booking.user.email:
                        continue
                        
                    # ensure naive utc
                    end_time_utc = booking.end_time if not booking.end_time.tzinfo else booking.end_time.replace(tzinfo=None)
                    time_left = (end_time_utc - now).total_seconds() / 60.0 # minutes

                    # A. Pre-Alert (10-20 mins before)
                    if 10 <= time_left <= 20 and not booking.is_pre_alert_sent:
                        send_email(booking.user.email, "Parking Expiring Soon", f"Your parking expires in 15 minutes.")
                        booking.is_pre_alert_sent = True

                    # B. Expiry Alert (<= 0 mins)
                    if time_left <= 0 and not booking.is_expiry_alert_sent:
                        send_email(booking.user.email, "Parking Expired", f"Your parking time has expired.")
                        booking.is_expiry_alert_sent = True
                        booking.last_overstay_sent_at = now

                    # C. Overstay Reminder (Every 6 hours)
                    if time_left < 0 and booking.is_expiry_alert_sent:
                        last_sent = booking.last_overstay_sent_at
                        if last_sent:
                            last_sent = last_sent.replace(tzinfo=None) if last_sent.tzinfo else last_sent
                            hours_since_last = (now - last_sent).total_seconds() / 3600.0
                            if hours_since_last >= 6.0:
                                # Calculate current excess fee
                                overstay_duration_sec = (now - end_time_utc).total_seconds()
                                overstay_hours_calc = math.ceil(overstay_duration_sec / 3600.0)
                                
                                # Fetch Rate (inside loop is inefficient but safe for low volume)
                                hourly_rate_config = db_session.query(SystemConfig).filter(SystemConfig.key == "hourly_rate").first()
                                base_rate = float(hourly_rate_config.value) if hourly_rate_config else 10.0
                                
                                multiplier = 1.0
                                if booking.spot:
                                    if booking.spot.spot_type == 'ev': 
                                        multiplier = 1.5
                                    elif booking.spot.spot_type == 'vip':
                                        multiplier = 2.0
                                
                                current_excess = overstay_hours_calc * base_rate * multiplier
                                
                                plate = booking.vehicle.license_plate if booking.vehicle else "Unknown"
                                spot_str = format_spot_id(booking.spot.row, booking.spot.col, booking.spot.floor) if booking.spot else "N/A"
                                
                                send_email(
                                    booking.user.email, 
                                    f"Rate Alert: Vehicle {plate} Overstay Notice", 
                                    f"Hello {booking.user.username},\n\n"
                                    f"Your vehicle ({plate}) in spot {spot_str} has exceeded the booked time by {int(overstay_hours_calc)} hours.\n"
                                    f"Current Estimated Excess Fee: MYR {current_excess:.2f}\n\n"
                                    f"Please checkout immediately to avoid further charges.\n"
                                    f"Thank you."
                                )
                                booking.last_overstay_sent_at = now

                db_session.commit()
                db_session.close()
            except Exception as e:
                print(f"Error in background expiration task: {e}")

    asyncio.create_task(background_monitor())
    
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
from routers import payment

app.include_router(payment.router)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    if len(password.encode('utf-8')) > 72:
        password = password.encode('utf-8')[:72].decode('utf-8', errors='ignore')
    return pwd_context.hash(password)



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
def get_layout(
    start_time: str = None, 
    end_time: str = None, 
    floor: str = "Ground", # Default to Ground floor
    db: Session = Depends(get_db)
):
    # Fetch layout for specific floor
    layout = db.query(LayoutConfigDB).filter(LayoutConfigDB.floor == floor).first()
    if not layout:
        # If no config for this floor, fallback or return empty/default
        # For seamless upgrades, if requesting "Ground" and no record exists but oldrecord does (no floor set), use that.
        # But our migration added "Ground" to existing records. So this should be fine.
        # If completely new floor requested (e.g. Level1) and not found, default to 5x5
        layout = LayoutConfigDB(rows=5, cols=5, floor=floor) 
    
    # Check occupancy based on specific time range if provided, else current time (now)
    # If checking a future slot, we want to know what is booked THEN.
    from datetime import timezone
    
    check_start = datetime.utcnow()
    check_end = datetime.utcnow()
    
    if start_time and end_time:
        try:
    # Parse ISO strings (likely with Z or offset)
            # Normalize to naive UTC as stored in DB
            s_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            e_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
            
            if s_dt.tzinfo:
                s_dt = s_dt.astimezone(timezone.utc).replace(tzinfo=None)
            if e_dt.tzinfo:
                e_dt = e_dt.astimezone(timezone.utc).replace(tzinfo=None)
                
            check_start = s_dt
            check_end = e_dt
        except ValueError:
            pass # Fallback to now if parse fails
            
    from sqlalchemy import or_, and_
    
    occupied_spot_ids = db.query(Booking.spot_id).filter(
        Booking.status.in_(['active', 'pending']),
        or_(
            # 1. Normal overlap: Booking interval overlaps with Check interval
            and_(Booking.start_time < check_end, Booking.end_time > check_start),
            
            # 2. Overstay: Status is 'active' AND booking should have ended before check_start
            # This implies the car is still physically there (hasn't checked out), so it blocks the spot.
            # We treat 'active' overstayers as occupying the spot indefinitely until status changes.
            and_(Booking.status == 'active', Booking.end_time <= check_start)
        )
    ).all()
    
    # Flatten list of tuples [(1,), (2,)] -> {1, 2}
    occupied_ids_set = {s[0] for s in occupied_spot_ids}

    # Fetch spots for THIS floor only
    spots_db = db.query(ParkingSpot).filter(ParkingSpot.floor == floor).all()
    spots_out = []
    
    # We must generate the grid based on the layout dimensions
    # If spots exist in DB, use them. If not (new floor), they will be simulated as empty until admin saves?
    # Actually, usually admin initializes the layout. 
    # Let's ensure we return a structured grid.
    
    for r in range(layout.rows):
        for c in range(layout.cols):
            spot = next((s for s in spots_db if s.row == r and s.col == c), None)
            
            # Determine status dynamically
            is_booked = False
            booked_by_username = None
            spot_id = 0
            label = ""
            spot_type = "standard"
            is_blocked = False
            
            if spot:
                spot_id = spot.id
                label = spot.label
                spot_type = spot.spot_type
                is_blocked = spot.is_blocked
                if spot.id in occupied_ids_set:
                    is_booked = True
            else:
                # Lazy create the spot so it has an ID for Admin editing
                new_spot = ParkingSpot(row=r, col=c, floor=floor)
                db.add(new_spot)
                db.flush() # Get ID
                db.refresh(new_spot)
                spot_id = new_spot.id
                label = new_spot.label # default ""
                spot_type = new_spot.spot_type # default "standard"
                # is_blocked default False
            
            spots_out.append(SpotSchema(
                id=spot_id,
                row=r,
                col=c,
                is_booked=is_booked,
                label=label,
                spot_type=spot_type,
                is_blocked=is_blocked,
                booked_by_username=booked_by_username
            ))
            
    # Commit any newly created spots
    try:
        db.commit()
    except:
        db.rollback()
        
    return ParkingState(rows=layout.rows, cols=layout.cols, spots=spots_out)

class UpdateSpot(BaseModel):
    label: Optional[str] = None
    spot_type: Optional[str] = None # standard, ev, vip

@app.put("/admin/spots/{spot_id}")
def update_spot(spot_id: int, updates: UpdateSpot, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    spot = db.query(ParkingSpot).filter(ParkingSpot.id == spot_id).first()
    if not spot:
        raise HTTPException(status_code=404, detail="Spot not found")
        
    if updates.label is not None:
        spot.label = updates.label
    if updates.spot_type is not None:
        spot.spot_type = updates.spot_type
        
    db.commit()
    return {"message": "Spot updated successfully"}



@app.put("/admin/spots/{spot_id}/toggle-block")
def toggle_spot_block(spot_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    spot = db.query(ParkingSpot).filter(ParkingSpot.id == spot_id).first()
    if not spot:
        raise HTTPException(status_code=404, detail="Spot not found")
    
    spot.is_blocked = not spot.is_blocked
    db.commit()
    
    status = "blocked" if spot.is_blocked else "unblocked"
    return {"message": f"Spot {status} successfully", "is_blocked": spot.is_blocked}

@app.get("/admin/analytics", response_model=AnalyticsResponse)
def get_analytics(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # 1. Total Revenue (Completed payments only)
    total_revenue = db.query(func.sum(Booking.payment_amount)).filter(
        Booking.payment_status == 'paid',
        Booking.status != 'cancelled'
    ).scalar() or 0.0
    
    # 2. Total Bookings
    total_bookings = db.query(func.count(Booking.id)).scalar()
    
    # 3. Active Bookings
    active_bookings = db.query(func.count(Booking.id)).filter(Booking.status == 'active').scalar()
    
    # 4. Revenue Chart (Last 7 Days)
    # Group by Date
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    revenue_data = db.query(
        func.date(Booking.created_at).label('date'),
        func.sum(Booking.payment_amount).label('total')
    ).filter(
        Booking.payment_status == 'paid',
        Booking.status != 'cancelled',
        Booking.created_at >= seven_days_ago
    ).group_by(func.date(Booking.created_at)).all()
    
    revenue_chart = [
        ChartData(name=str(r.date), value=float(r.total)) for r in revenue_data
    ]
    
    # 5. Occupancy/Peak Times (by Hour of Day)
    # Simple heuristic: Count bookings starting in each hour
    occupancy_data = db.query(
        func.extract('hour', Booking.start_time).label('hour'),
        func.count(Booking.id).label('count')
    ).group_by(func.extract('hour', Booking.start_time)).all()
    
    occupancy_chart = [
        ChartData(name=f"{int(r.hour):02d}:00", value=float(r.count)) for r in occupancy_data
    ]
    # Sort by hour
    occupancy_chart.sort(key=lambda x: x.name)

    return AnalyticsResponse(
        total_revenue=float(total_revenue),
        total_bookings=total_bookings,
        active_bookings=active_bookings,
        revenue_chart=revenue_chart,
        occupancy_chart=occupancy_chart
    )



# Define LayoutConfig Pydantic model at cleaner scope if needed, assuming it's imported or defined above.
# Need to check if LayoutConfig has 'floor' field. If not, we should update the Pydantic model too?
# Let's assume we need to update Pydantic model first. 
# But this tool call is for Main.py. I'll simply update the endpoint to assume the body has it.

class LayoutConfig(BaseModel):
    rows: int
    cols: int
    floor: Optional[str] = "Ground"

@app.post("/admin/layout")
def update_layout(config: LayoutConfig, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Config object should have 'floor'. If not, default to Ground.
    # Note: We need to see LayoutConfig definition. If I simply access config.floor it might fail if pydantic model doesn't have it.
    # I will inspect Pydantic model in next step. For now, assuming it's available or I'll fix it.
    floor_name = getattr(config, 'floor', 'Ground')
    
    layout = db.query(LayoutConfigDB).filter(LayoutConfigDB.floor == floor_name).first()
    if not layout:
        layout = LayoutConfigDB(rows=config.rows, cols=config.cols, floor=floor_name)
        db.add(layout)
    else:
        layout.rows = config.rows
        layout.cols = config.cols
    
    # Delete spots that are out of bounds for THIS floor
    db.query(ParkingSpot).filter(
        ParkingSpot.floor == floor_name,
        (ParkingSpot.row >= config.rows) | (ParkingSpot.col >= config.cols)
    ).delete()
    
    db.commit()
    # Return layout for the specific floor
    return get_layout(floor=floor_name, db=db)

@app.get("/floors", response_model=List[str])
def get_floors(db: Session = Depends(get_db)):
    """
    Returns a list of all configured floors.
    """
    floors = db.query(LayoutConfigDB.floor).distinct().all()
    # If empty, return at least Ground
    floor_list = [f[0] for f in floors] if floors else ["Ground"]
    return sorted(floor_list)

@app.get("/admin/config", response_model=List[ConfigItem])
def get_system_config(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    configs = db.query(SystemConfig).all()
    return [ConfigItem(key=c.key, value=c.value, description=c.description) for c in configs]

@app.post("/admin/config")
def update_system_config(update_data: ConfigUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    for item in update_data.configs:
        config = db.query(SystemConfig).filter(SystemConfig.key == item.key).first()
        if config:
            config.value = item.value
            if item.description:
                config.description = item.description
        else:
            # Create if not exists
            new_config = SystemConfig(key=item.key, value=item.value, description=item.description)
            db.add(new_config)
            
    db.commit()
    db.commit()
    return {"message": "Configuration updated successfully"}

@app.get("/config/public")
def get_public_config(db: Session = Depends(get_db)):
    """
    Fetch public configuration values (e.g. pricing) that don't require auth.
    """
    public_keys = ["hourly_rate", "cancellation_rule_1_hours", "cancellation_rule_2_hours", "cancellation_rule_2_percent"]
    configs = db.query(SystemConfig).filter(SystemConfig.key.in_(public_keys)).all()
    
    result = {}
    for c in configs:
        result[c.key] = c.value
        
    return result

# Promo Code Models
class PromoCodeCreate(BaseModel):
    code: str
    discount_type: str # percentage, fixed
    discount_value: float
    expiry_date: datetime
    usage_limit: int = 100
    is_active: bool = True

@app.get("/admin/promos", response_model=List[PromoCodeResponse])
def get_all_promos(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    promos = db.query(PromoCode).all()
    # Map to response manually or use orm_mode 
    return [
        PromoCodeResponse(
            id=p.id,
            code=p.code,
            discount_type=p.discount_type,
            discount_value=float(p.discount_value),
            expiry_date=p.expiry_date, # Assuming response schema has this
            usage_limit=p.usage_limit, # And this
            current_uses=p.current_uses,
            is_active=p.is_active,
            description=f"{p.discount_value}% OFF" if p.discount_type == "percentage" else f"FLAT {p.discount_value} OFF"
        ) for p in promos
    ]

@app.post("/admin/promos", response_model=PromoCodeResponse)
def create_promo(promo_data: PromoCodeCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    existing = db.query(PromoCode).filter(PromoCode.code == promo_data.code.upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Promo code already exists")
        
    new_promo = PromoCode(
        code=promo_data.code.upper(),
        discount_type=promo_data.discount_type,
        discount_value=promo_data.discount_value,
        expiry_date=promo_data.expiry_date,
        usage_limit=promo_data.usage_limit,
        is_active=promo_data.is_active
    )
    db.add(new_promo)
    db.commit()
    db.refresh(new_promo)
    
    return PromoCodeResponse(
        id=new_promo.id,
        code=new_promo.code,
        discount_type=new_promo.discount_type,
        discount_value=float(new_promo.discount_value),
        expiry_date=new_promo.expiry_date,
        usage_limit=new_promo.usage_limit,
        current_uses=new_promo.current_uses,
        is_active=new_promo.is_active,
        description=f"{new_promo.discount_value}% OFF" if new_promo.discount_type == "percentage" else f"FLAT {new_promo.discount_value} OFF"
    )

@app.put("/admin/promos/{promo_id}/toggle")
def toggle_promo(promo_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    promo = db.query(PromoCode).filter(PromoCode.id == promo_id).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Promo code not found")
        
    promo.is_active = not promo.is_active
    db.commit()
    return {"message": f"Promo code {'activated' if promo.is_active else 'deactivated'}", "is_active": promo.is_active}

@app.delete("/admin/promos/{promo_id}")
def delete_promo(promo_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    promo = db.query(PromoCode).filter(PromoCode.id == promo_id).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Promo code not found")
        
    db.delete(promo)
    db.commit()
    return {"message": "Promo code deleted successfully"}

@app.put("/admin/promos/{promo_id}/update", response_model=PromoCodeResponse)
def update_promo(promo_id: int, promo_data: PromoCodeCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    promo = db.query(PromoCode).filter(PromoCode.id == promo_id).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Promo code not found")

    # Check for code uniqueness if changed
    if promo.code != promo_data.code.upper():
        existing = db.query(PromoCode).filter(PromoCode.code == promo_data.code.upper()).first()
        if existing:
            raise HTTPException(status_code=400, detail="Promo code already exists")
    
    promo.code = promo_data.code.upper()
    promo.discount_type = promo_data.discount_type
    promo.discount_value = promo_data.discount_value
    promo.expiry_date = promo_data.expiry_date
    promo.usage_limit = promo_data.usage_limit
    promo.is_active = promo_data.is_active
    
    db.commit()
    db.refresh(promo)
    
    return PromoCodeResponse(
        id=promo.id,
        code=promo.code,
        discount_type=promo.discount_type,
        discount_value=float(promo.discount_value),
        expiry_date=promo.expiry_date,
        usage_limit=promo.usage_limit,
        current_uses=promo.current_uses,
        is_active=promo.is_active,
        description=f"{promo.discount_value}% OFF" if promo.discount_type == "percentage" else f"FLAT {promo.discount_value} OFF"
    )

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

def calculate_refund_amount(booking: Booking, cancellation_time: datetime, db: Session) -> tuple[float, str]:
    # Default values
    rule_1_hours = 24
    rule_2_hours = 2
    rule_2_percent = 50
    
    # Fetch from DB
    try:
        configs = db.query(SystemConfig).all()
        config_map = {c.key: c.value for c in configs}
        
        if "cancellation_rule_1_hours" in config_map:
            rule_1_hours = int(config_map["cancellation_rule_1_hours"])
        if "cancellation_rule_2_hours" in config_map:
            rule_2_hours = int(config_map["cancellation_rule_2_hours"])
        if "cancellation_rule_2_percent" in config_map:
            rule_2_percent = float(config_map["cancellation_rule_2_percent"])
    except Exception as e:
        print(f"Error fetching config: {e}") 

    hours_before_start = (booking.start_time - cancellation_time).total_seconds() / 3600
    
    if hours_before_start >= rule_1_hours:
        return float(booking.payment_amount), "100% refund - full refund window"
    elif hours_before_start >= rule_2_hours:
        refund = float(booking.payment_amount) * (rule_2_percent / 100.0)
        return refund, f"{rule_2_percent}% refund - partial refund window"
    else:
        return 0, "No refund - late cancellation"

@app.post("/bookings", response_model=BookingResponse)
def create_booking(booking_data: BookingCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from datetime import datetime
    
    # Check if spot exists and is available
    spot = db.query(ParkingSpot).filter(
        ParkingSpot.row == booking_data.row,
        ParkingSpot.col == booking_data.col,
        ParkingSpot.floor == booking_data.floor
    ).first()
    
    if spot:
        if spot.is_booked:
            raise HTTPException(status_code=400, detail="Spot is already booked")
        if spot.is_blocked:
            raise HTTPException(status_code=400, detail="Spot is under maintenance")
    
    # Create spot if it doesn't exist
    if not spot:
        spot = ParkingSpot(row=booking_data.row, col=booking_data.col)
        db.add(spot)
        db.flush()  # To get the ID
    
    # TIME VALIDATION
    # Normalize inputs to naive UTC for comparison with DB and utcnow
    # The frontend is sending ISO strings with Z (offset-aware), but DB stores naive UTC
    from datetime import timezone
    
    start_time_naive = booking_data.start_time
    if start_time_naive.tzinfo:
        start_time_naive = start_time_naive.astimezone(timezone.utc).replace(tzinfo=None)
        
    end_time_naive = booking_data.end_time
    if end_time_naive.tzinfo:
        end_time_naive = end_time_naive.astimezone(timezone.utc).replace(tzinfo=None)

    # Allow 5 minute buffer for network latency/server time diffs
    if start_time_naive < datetime.utcnow() - timedelta(minutes=5):
        raise HTTPException(status_code=400, detail="Booking start time cannot be in the past")
    
    if end_time_naive <= start_time_naive:
        raise HTTPException(status_code=400, detail="End time must be after start time")

    # OVERLAP CHECK
    # Check if this spot is already booked for the requested duration
    overlapping_booking = db.query(Booking).filter(
        Booking.spot_id == spot.id,
        Booking.status.in_(['active', 'pending']),
        Booking.start_time < end_time_naive,
        Booking.end_time > start_time_naive
    ).first()
    
    if overlapping_booking:
        raise HTTPException(status_code=400, detail="This spot is already booked for the selected time range.")
        
    # Handle vehicle
    vehicle = db.query(Vehicle).filter(
        Vehicle.license_plate == booking_data.license_plate.upper()
    ).first()
    
    if vehicle:
        # Check if vehicle needs to be claimed by user
        if vehicle.user_id is None:
            vehicle.user_id = current_user.id
            db.add(vehicle) # Ensure update is tracked
    
    if not vehicle:
        if not booking_data.vehicle_data:
            # Create basic vehicle record with license plate
            vehicle = Vehicle(
                license_plate=booking_data.license_plate.upper(),
                owner_name=booking_data.name,
                phone=booking_data.phone,
                email=booking_data.email,
                user_id=current_user.id 
            )
        else:
            # Create vehicle with detailed data
            vehicle_dict = booking_data.vehicle_data.dict()
            vehicle_dict["license_plate"] = booking_data.license_plate.upper()
            vehicle_dict["user_id"] = current_user.id
            vehicle = Vehicle(**vehicle_dict)
        
        db.add(vehicle)
        db.flush()  # To get the ID
    
    # We do NOT set is_booked statically anymore. It is calculated dynamically based on time.
    spot.booked_by_id = current_user.id
    
    
    # Calculate Payment (Server-side Authority)
    # Fetch base rate
    hourly_rate_config = db.query(SystemConfig).filter(SystemConfig.key == "hourly_rate").first()
    hourly_rate = float(hourly_rate_config.value) if hourly_rate_config else 10.0
    
    # Calculate duration in hours
    duration_hours = (end_time_naive - start_time_naive).total_seconds() / 3600.0
    
    # Apply Spot Type Multiplier
    multiplier = 1.0
    if spot.spot_type == 'ev':
        multiplier = 1.5
    elif spot.spot_type == 'vip':
        multiplier = 2.0
        
    calculated_base_amount = duration_hours * hourly_rate * multiplier
    
    # Round to 2 decimals
    original_amount = round(calculated_base_amount, 2)
    
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
    import uuid
    new_booking_uuid = str(uuid.uuid4())
    
    booking = Booking(
        user_id=current_user.id,
        spot_id=spot.id,
        vehicle_id=vehicle.id,
        booking_uuid=new_booking_uuid,
        name=booking_data.name,
        email=booking_data.email,
        phone=booking_data.phone,
        start_time=start_time_naive,
        end_time=end_time_naive,
        payment_method=booking_data.payment_method,
        payment_amount=final_amount,
        discount_amount=discount_amount,
        promo_code_id=promo_code_id,
        status="pending"
    )
    
    db.add(booking)
    db.flush()  # To get the ID for audit log
    
    # Log the booking creation
    log_booking_audit(
        db, booking.id, current_user.id, "created", 
        None, "pending", f"Booking created for {vehicle.license_plate}. Amount: {final_amount}"
    )
    
    # Email sending moved to payment success callback
    # See api/routers/payment.py
    
    db.commit()
    db.refresh(booking)
    

    
    # Check if booking can be cancelled (configurable business rule)
    can_cancel = booking.status == "active" and booking.start_time > datetime.utcnow()
    
    return BookingResponse(
        id=booking.id,
        booking_uuid=booking.booking_uuid,
        spot_info=format_spot_id(spot.row, spot.col, spot.floor),
        name=booking.name,
        email=booking.email,
        phone=booking.phone,
        vehicle=VehicleResponse.model_validate(vehicle),
        start_time=booking.start_time.replace(tzinfo=timezone.utc),
        end_time=booking.end_time.replace(tzinfo=timezone.utc),
        payment_method=booking.payment_method,
        payment_amount=float(booking.payment_amount),
        payment_status=booking.payment_status,
        discount_amount=float(booking.discount_amount),
        promo_code=booking.promo_code.code if booking.promo_code else None,
        status=booking.status,
        refund_status=booking.refund_status,
        refund_amount=float(booking.refund_amount),
        excess_fee=float(booking.excess_fee or 0),
        created_at=booking.created_at.replace(tzinfo=timezone.utc) if booking.created_at else None,
        can_cancel=can_cancel,
        latest_order_id=booking.latest_order_id
    )

@app.get("/bookings", response_model=PaginatedBookingResponse)
def get_user_bookings(
    page: int = 1,
    limit: int = 50,
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    from datetime import datetime, timezone
    
    query = db.query(Booking).filter(
        Booking.user_id == current_user.id
    )
    
    total = query.count()
    total_pages = math.ceil(total / limit)
    
    bookings = query.order_by(Booking.created_at.desc())\
        .offset((page - 1) * limit)\
        .limit(limit)\
        .all()
    
    result = []
    for booking in bookings:
        can_cancel = (
            (booking.status == "active" or booking.status == "pending") and 
            booking.start_time > datetime.utcnow()
        )
        
        # Ensure times are sent as UTC (ISO string with Z)
        # DB stores naive UTC, so we must attach UTC tzinfo
        response_start = booking.start_time.replace(tzinfo=timezone.utc)
        response_end = booking.end_time.replace(tzinfo=timezone.utc)
        response_created = booking.created_at.replace(tzinfo=timezone.utc) if booking.created_at else None
        
        result.append(BookingResponse(
            id=booking.id,
            booking_uuid=booking.booking_uuid,
            spot_info=format_spot_id(booking.spot.row, booking.spot.col, booking.spot.floor),
            name=booking.name,
            email=booking.email,
            phone=booking.phone,
            vehicle=VehicleResponse.model_validate(booking.vehicle),
            start_time=response_start,
            end_time=response_end,
            payment_method=booking.payment_method,
            payment_amount=float(booking.payment_amount),
            payment_status=booking.payment_status,
            discount_amount=float(booking.discount_amount),
            promo_code=booking.promo_code.code if booking.promo_code else None,
            status=booking.status,
            refund_status=booking.refund_status,
            refund_amount=float(booking.refund_amount),
            excess_fee=float(booking.excess_fee or 0),
            created_at=response_created,
            can_cancel=can_cancel,
            latest_order_id=booking.latest_order_id
        ))
    
    return PaginatedBookingResponse(
        items=result,
        total=total,
        page=page,
        size=limit,
        pages=total_pages
    )



@app.post("/admin/bookings/{booking_id}/close", response_model=BookingResponse)
def close_booking(booking_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    if booking.status != "active":
        raise HTTPException(status_code=400, detail=f"Booking is {booking.status}, cannot close.")

    from datetime import datetime, timezone
    now = datetime.utcnow()
    
    excess_fee = 0.0
    if now > booking.end_time:
        duration_over = (now - booking.end_time).total_seconds() / 3600
        import math
        hours_over = math.ceil(duration_over)
        excess_fee = float(hours_over * 10.0)
    
    booking.status = "completed"
    booking.excess_fee = excess_fee
    
    db.commit()
    db.refresh(booking)
    

    
    # Log it
    log_booking_audit(
        db, booking.id, current_user.id, "completed", 
        "active", "completed", f"Admin closed booking. Excess Fee: {excess_fee}"
    )

    response_start = booking.start_time.replace(tzinfo=timezone.utc)
    response_end = booking.end_time.replace(tzinfo=timezone.utc)
    response_created = booking.created_at.replace(tzinfo=timezone.utc) if booking.created_at else None

    return BookingResponse(
        id=booking.id,
        booking_uuid=booking.booking_uuid,
        spot_info=format_spot_id(booking.spot.row, booking.spot.col, booking.spot.floor),
        name=booking.name,
        email=booking.email,
        phone=booking.phone,
        vehicle=VehicleResponse.model_validate(booking.vehicle),
        start_time=response_start,
        end_time=response_end,
        payment_method=booking.payment_method,
        payment_amount=float(booking.payment_amount),
        payment_status=booking.payment_status,
        discount_amount=float(booking.discount_amount),
        promo_code=booking.promo_code.code if booking.promo_code else None,
        status=booking.status,
        refund_status=booking.refund_status,
        refund_amount=float(booking.refund_amount),
        excess_fee=float(booking.excess_fee),
        created_at=response_created,
        can_cancel=False,
        latest_order_id=booking.latest_order_id
    )

@app.get("/admin/bookings", response_model=PaginatedBookingResponse)
def get_all_bookings(
    page: int = 1,
    limit: int = 50,
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    from datetime import datetime, timezone
    
    query = db.query(Booking)
    
    total = query.count()
    total_pages = math.ceil(total / limit)
        
    bookings = query.order_by(Booking.created_at.desc())\
        .offset((page - 1) * limit)\
        .limit(limit)\
        .all()
    
    # Fetch hourly rate once
    hourly_rate_config = db.query(SystemConfig).filter(SystemConfig.key == "hourly_rate").first()
    base_rate = float(hourly_rate_config.value) if hourly_rate_config else 10.0

    result = []
    current_time_utc = datetime.utcnow()

    for booking in bookings:
        can_cancel = (
            (booking.status == "active" or booking.status == "pending") and 
            booking.start_time > datetime.utcnow()
        )
        
        # Ensure times are sent as UTC
        response_start = booking.start_time.replace(tzinfo=timezone.utc)
        response_end = booking.end_time.replace(tzinfo=timezone.utc)
        response_created = booking.created_at.replace(tzinfo=timezone.utc) if booking.created_at else None
        
        # Calculate Estimated Excess Fee for Active Bookings
        estimated_excess_fee = 0.0
        if booking.status == "active":
            booking_end_utc = booking.end_time if not booking.end_time.tzinfo else booking.end_time.replace(tzinfo=None)
            if current_time_utc > booking_end_utc:
                diff_seconds = (current_time_utc - booking_end_utc).total_seconds()
                overstay_hours = math.ceil(diff_seconds / 3600.0)
                
                multiplier = 1.0
                if booking.spot and booking.spot.spot_type == 'ev':
                    multiplier = 1.5
                elif booking.spot and booking.spot.spot_type == 'vip':
                    multiplier = 2.0
                
                estimated_excess_fee = overstay_hours * base_rate * multiplier

        result.append(BookingResponse(
            id=booking.id,
            booking_uuid=booking.booking_uuid,
            spot_info=format_spot_id(booking.spot.row, booking.spot.col, booking.spot.floor),
            name=booking.name,
            email=booking.email,
            phone=booking.phone,
            vehicle=VehicleResponse.model_validate(booking.vehicle),
            start_time=response_start,
            end_time=response_end,
            payment_method=booking.payment_method,
            payment_amount=float(booking.payment_amount),
            payment_status=booking.payment_status,
            discount_amount=float(booking.discount_amount),
            promo_code=booking.promo_code.code if booking.promo_code else None,
            status=booking.status,
            refund_status=booking.refund_status,
            refund_amount=float(booking.refund_amount),
            excess_fee=float(booking.excess_fee) if booking.excess_fee else 0.0,
            estimated_excess_fee=estimated_excess_fee,
            created_at=response_created,
            can_cancel=can_cancel,
            latest_order_id=booking.latest_order_id
        ))
    
    return PaginatedBookingResponse(
        items=result,
        total=total,
        page=page,
        size=limit,
        pages=total_pages
    )

@app.get("/bookings/{booking_id}/receipt")
def download_receipt(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    # Check authorization
    if current_user.role != "admin" and booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this receipt")
        
    # Generate PDF
    pdf_buffer = generate_booking_receipt(booking)
    
    filename = f"Receipt_Booking_{booking.id}.pdf"
    
    return StreamingResponse(
        pdf_buffer, 
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

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
    
    if booking.status not in ["active", "pending"]:
        raise HTTPException(status_code=400, detail="Cannot cancel this booking")
    
    # Check if booking can be cancelled (before start time)
    current_time = datetime.utcnow()
    if booking.start_time <= current_time:
        raise HTTPException(status_code=400, detail="Cannot cancel booking that has already started")
    
    # Calculate refund amount
    refund_amount, refund_reason = calculate_refund_amount(booking, current_time, db)
    
    # Update booking status
    booking.status = "cancelled"
    booking.refund_amount = refund_amount
    # CHANGE: Set to 'pending' if amount > 0, so Admin currently has to click 'Process Refund'
    booking.refund_status = "pending" if refund_amount > 0 else "none"
    booking.cancellation_reason = cancel_data.cancellation_reason
    booking.cancellation_time = current_time
    
    db.commit()
    
    # Send Cancellation Email
    try:
        if booking.email:
             send_email(
                booking.email,
                "Booking Cancelled - ParkPro",
                f"Hello,\n\nYour booking #{booking.id} has been cancelled.\n"
                f" Refund Amount: MYR {refund_amount}\n"
                f"Reason: {refund_reason}\n\n"
                f"Thank you."
             )
    except Exception as e:
        print(f"Failed to send cancellation email: {e}")
        
    old_status = booking.status # Kept for audit log if needed, though status is now cancelled.
    # Logic note: old_status should have been captured BEFORE update.
    # But since we committed, it's too late for exact old_status if not captured earlier.
    # However, we know it was 'active' or 'pending' from earlier check.
    
    # Free up the spot (technically validation does this by checking status, but good to be clear)
    
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
    
    # Send Email to User
    try:
        current_year = datetime.utcnow().year
        send_email(
            booking.user.email,
            "Booking Cancelled - ParkPro",
            f"Hello {booking.user.username},\n\nYour booking #{booking.id} has been cancelled.\n\nRefund Status: {refund_reason}\nRefund Amount: MYR {refund_amount:.2f}\n\nWe hope to see you again soon."
        )
        
        # Send Email to Admin(s)
        # Fetch from DB Config first, fallback to Env
        admin_emails_config = db.query(SystemConfig).filter(SystemConfig.key == "admin_notification_emails").first()
        
        admin_emails = []
        if admin_emails_config and admin_emails_config.value:
            admin_emails = [e.strip() for e in admin_emails_config.value.split(",") if e.strip()]
        
        if not admin_emails:
            # Fallback to env or sender
            env_admin = os.getenv("ADMIN_EMAIL")
            if env_admin:
                admin_emails = [env_admin]
            else:
                admin_emails = [os.getenv("MAIL_FROM")]
                
        for email in admin_emails:
            if email: # Safety check
                send_email(
                    email,
                    f"Booking Cancelled: #{booking.id}",
                    f"Admin Alert:\n\nUser {booking.user.username} (Email: {booking.user.email}) has cancelled booking #{booking.id}.\n\nReason: {cancel_data.cancellation_reason or 'Not provided'}\nRefund: MYR {refund_amount:.2f} ({refund_reason})\nTime: {datetime.utcnow()}"
                )
    except Exception as e:
        print(f"Failed to send cancellation emails: {e}")

    db.commit()
    

    
    return {
        "message": "Booking cancelled successfully",
        "refund_amount": refund_amount,
        "refund_reason": refund_reason
    }

@app.post("/vehicles", response_model=VehicleResponse)
def create_vehicle(vehicle_data: VehicleCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check if vehicle exists (by license plate)
    # The constraint is unique globally.
    existing_vehicle = db.query(Vehicle).filter(Vehicle.license_plate == vehicle_data.license_plate.upper()).first()
    
    if existing_vehicle:
        # If it exists, check ownership
        if existing_vehicle.user_id == current_user.id:
             # Just update details
             for key, value in vehicle_data.dict(exclude_unset=True).items():
                 if key != 'license_plate': # Don't update PK-like field
                    setattr(existing_vehicle, key, value)
             db.commit()
             db.refresh(existing_vehicle)
             return existing_vehicle
        elif existing_vehicle.user_id is None:
            # Claim it
            existing_vehicle.user_id = current_user.id
            for key, value in vehicle_data.dict(exclude_unset=True).items():
                 if key != 'license_plate':
                    setattr(existing_vehicle, key, value)
            db.commit()
            db.refresh(existing_vehicle)
            return existing_vehicle
        else:
             raise HTTPException(status_code=400, detail="Vehicle already registered to another user.")
    
    # Create new
    vehicle_dict = vehicle_data.dict()
    vehicle_dict["license_plate"] = vehicle_dict["license_plate"].upper()
    vehicle_dict["user_id"] = current_user.id
    new_vehicle = Vehicle(**vehicle_dict)
    
    db.add(new_vehicle)
    db.commit()
    db.refresh(new_vehicle)
    db.refresh(new_vehicle)
    return new_vehicle

@app.get("/vehicles", response_model=List[VehicleResponse])
def get_user_vehicles(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Vehicle).filter(Vehicle.user_id == current_user.id).all()

@app.put("/vehicles/{vehicle_id}", response_model=VehicleResponse)
def update_vehicle(vehicle_id: int, vehicle_data: VehicleCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id, Vehicle.user_id == current_user.id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    # Check for license plate conflict if changing
    new_plate = vehicle_data.license_plate.upper()
    if new_plate != vehicle.license_plate:
        existing = db.query(Vehicle).filter(Vehicle.license_plate == new_plate).first()
        if existing and existing.id != vehicle.id:
             raise HTTPException(status_code=400, detail="License plate already registered.")

    vehicle.license_plate = new_plate
    for key, value in vehicle_data.dict(exclude_unset=True).items():
         if key != 'license_plate':
            setattr(vehicle, key, value)
            
    db.commit()
    db.refresh(vehicle)
    return vehicle

@app.get("/vehicles", response_model=List[VehicleResponse])
def get_user_vehicles(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Vehicle).filter(Vehicle.user_id == current_user.id).all()

@app.delete("/vehicles/{vehicle_id}")
def delete_vehicle(vehicle_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id, Vehicle.user_id == current_user.id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    # Check if any bookings exist
    bookings_count = db.query(Booking).filter(Booking.vehicle_id == vehicle.id).count()
    
    if bookings_count > 0:
        # Just unlink
        vehicle.user_id = None
        message = "Vehicle removed from your account."
    else:
        # Hard delete
        db.delete(vehicle)
        message = "Vehicle deleted successfully."
        
    db.commit()
    return {"message": message}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

# Admin Exit Logic
import math

class ExitCalculationResponse(BaseModel):
    actual_end_time: datetime
    booked_end_time: datetime
    overstay_hours: float # Actually overstay_duration in frontend, let's keep hours for calculation
    overstay_duration: float # Add this alias for frontend consistency if needed, or mapped
    extra_fee: float # overstay_fee
    overstay_fee: float # Alias
    hourly_rate_applied: float
    total_amount: float
    message: str

class CompleteBookingRequest(BaseModel):
    payment_method: str # 'cash' or 'online'
    final_amount: float
    notes: Optional[str] = None

@app.post("/admin/bookings/{booking_id}/calculate-exit", response_model=ExitCalculationResponse)
def calculate_exit_fee(booking_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    actual_end = datetime.utcnow()
    # Ensure naive UTC comparison (booking.end_time is stored naive UTC)
    if booking.end_time.tzinfo:
        booked_end = booking.end_time.replace(tzinfo=None)
    else:
        booked_end = booking.end_time
        
    extra_fee = 0.0
    overstay_hours = 0.0
    message = "On time departure"
    
    # Get Rate
    hourly_rate_config = db.query(SystemConfig).filter(SystemConfig.key == "hourly_rate").first()
    base_rate = float(hourly_rate_config.value) if hourly_rate_config else 10.0
    
    # Get Multiplier
    multiplier = 1.0
    if booking.spot and booking.spot.spot_type == 'ev':
        multiplier = 1.5
    elif booking.spot and booking.spot.spot_type == 'vip':
        multiplier = 2.0
    
    if actual_end > booked_end:
        diff_seconds = (actual_end - booked_end).total_seconds()
        overstay_hours = math.ceil(diff_seconds / 3600.0)
        
        extra_fee = overstay_hours * base_rate * multiplier
        message = f"Overstayed by {int(overstay_hours)} hour(s)"
        
    return ExitCalculationResponse(
        actual_end_time=actual_end,
        booked_end_time=booked_end,
        overstay_hours=overstay_hours,
        overstay_duration=overstay_hours, # Logic uses hours as float
        extra_fee=extra_fee,
        overstay_fee=extra_fee,
        hourly_rate_applied=base_rate * multiplier,
        total_amount=float(booking.payment_amount) + extra_fee, # Total due? Or just total paid + extra? Backend logic suggests extra is added.
        message=message
    )

@app.post("/admin/bookings/{booking_id}/complete")
def complete_booking_admin(booking_id: int, req: CompleteBookingRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    # Validation checks?
    # If online payment requested but not implemented
    if req.payment_method == 'online':
        # In strictly manual exit flow, 'online' might mean user paid separately via link?
        # For now we assume admin verifies it.
        pass
        
    booking.status = 'completed'
    booking.payment_status = 'paid'
    
    # Calculate proper excess fee (Total - Initial Payment)
    # Ensure we handle potential float/decimal mismatches
    final_amount = float(req.final_amount)
    initial_payment = float(booking.payment_amount or 0)
    excess = final_amount - initial_payment
    
    booking.excess_fee = excess if excess > 0 else 0
    booking.end_time = datetime.utcnow()
    
    # Audit log
    db.add(BookingAuditLog(
        booking_id=booking.id,
        user_id=current_user.id,
        action="admin_completed",
        old_status="active",
        new_status="completed",
        details=f"Method: {req.payment_method}, Final Total: {final_amount}"
    ))
    
    db.commit()
    return {"message": "Booking completed successfully", "total_amount": final_amount}

@app.post("/admin/bookings/{booking_id}/notify-overstay")
def notify_overstay(booking_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status != 'active':
        raise HTTPException(status_code=400, detail="Booking is not active")

    # Recalculate overstay details
    actual_end_time = datetime.utcnow()
    # Ensure booking.end_time is UTC naive for calc
    booked_end_time = booking.end_time if not booking.end_time.tzinfo else booking.end_time.replace(tzinfo=None)
    
    if actual_end_time <= booked_end_time:
         raise HTTPException(status_code=400, detail="Booking has not expired yet")
         
    overstay_duration = actual_end_time - booked_end_time
    overstay_hours = math.ceil(overstay_duration.total_seconds() / 3600.0)
    
    # Get config (redundant fetch but safe)
    hourly_rate_config = db.query(SystemConfig).filter(SystemConfig.key == "hourly_rate").first()
    base_rate = float(hourly_rate_config.value) if hourly_rate_config else 10.0
    
    # Simple multiplier logic for fee preview in email
    multiplier = 1.0
    if booking.spot and booking.spot.spot_type == 'ev':
        multiplier = 1.5
    elif booking.spot and booking.spot.spot_type == 'vip':
        multiplier = 2.0
            
    excess_fee = overstay_hours * base_rate * multiplier
    
    if booking.user and booking.user.email:
        send_email(
            booking.user.email,
            "Urgent: Parking Overstay Fee Notification",
            f"Dear {booking.user.username},\n\nYour parking session has expired by {int(overstay_hours)} hours.\n"
            f"Current excess fees accumulated: MYR {excess_fee:.2f}.\n\n"
            f"Please return to your vehicle and checkout immediately to avoid further charges.\n\n"
            f"Thank you,\nMy Car Park Team"
        )
        return {"message": "Notification email sent successfully", "excess_fee": excess_fee}
    else:
        raise HTTPException(status_code=400, detail="User email not found")

@app.post("/forgot-password")
def forgot_password(req: PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        # Return success even if user not found to prevent enumeration
        return {"message": "If this email exists, an OTP has been sent."}
    
    # Generate OTP
    otp = ''.join(random.choices(string.digits, k=6))
    expires = datetime.utcnow() + timedelta(minutes=15)
    
    reset_entry = PasswordReset(
        user_id=user.id,
        email=req.email,
        otp=otp,
        expires_at=expires
    )
    db.add(reset_entry)
    db.commit()
    
    # Send Email
    try:
        send_email(
            req.email,
            "Password Reset OTP - ParkPro",
            f"Hello {user.username},\n\nYour OTP for password reset is: {otp}\n\nThis OTP is valid for 15 minutes.\n\nIf you did not request this, please ignore."
        )
    except Exception as e:
        print(f"Failed to send OTP: {e}")
        
    return {"message": "If this email exists, an OTP has been sent."}

@app.post("/verify-otp")
def verify_otp(req: OTPVerifyRequest, db: Session = Depends(get_db)):
    record = db.query(PasswordReset).filter(
        PasswordReset.email == req.email,
        PasswordReset.otp == req.otp,
        PasswordReset.is_verified == False,
        PasswordReset.expires_at > datetime.utcnow()
    ).order_by(PasswordReset.created_at.desc()).first()
    
    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
        
    record.is_verified = True
    db.commit()
    
    return {"message": "OTP Verified"}

@app.post("/reset-password")
def reset_password(req: NewPasswordRequest, db: Session = Depends(get_db)):
    # Verify again
    record = db.query(PasswordReset).filter(
        PasswordReset.email == req.email,
        PasswordReset.otp == req.otp,
        PasswordReset.is_verified == True, # Must be verified
        PasswordReset.expires_at > datetime.utcnow()
    ).order_by(PasswordReset.created_at.desc()).first()
    
    if not record:
        raise HTTPException(status_code=400, detail="Invalid request or OTP expired")
        
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
         raise HTTPException(status_code=404, detail="User not found")
         
    # Update Password
    user.hashed_password = pwd_context.hash(req.new_password)
    
    # Invalidate OTP (delete or mark used)
    # Ideally mark used, but for now we delete or just rely on expiry. 
    # Let's delete this specific record to prevent reuse.
    db.delete(record)
    
    db.commit()
    
    return {"message": "Password reset successfully"}

@app.post("/admin/bookings/{booking_id}/refund")
def process_manual_refund(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    if booking.status != "cancelled":
        raise HTTPException(status_code=400, detail="Booking must be cancelled to process refund")
        
    if booking.refund_status != "pending":
         raise HTTPException(status_code=400, detail=f"Refund status is {booking.refund_status}, cannot process")
         
    if booking.refund_amount <= 0:
        raise HTTPException(status_code=400, detail="No refund amount to process")
        
    # Process the dummy refund
    booking.refund_status = "refunded"
    
    # Send Email to User
    try:
        from datetime import datetime
        send_email(
            booking.user.email,
            "Refund Processed - ParkPro",
            f"Hello {booking.user.username},\n\n"
            f"Your refund of MYR {booking.refund_amount:.2f} for booking #{booking.id} has been processed.\n"
            f"It should appear in your account shortly.\n\n"
            f"Thank you."
        )
    except Exception as e:
        print(f"Failed to send refund email: {e}")
        
    # Log Audit
    log_booking_audit(
        db, booking.id, current_user.id, "cancelled",
        "cancelled", "cancelled", # Status didn't change, just refund status
        f"Refund processed manually by admin. Amount: {booking.refund_amount}"
    )
    
    db.commit()
    return {"message": "Refund marked as processed successfully", "status": "refunded"}

@app.get("/debug/booking/51")
def debug_booking_51(db: Session = Depends(get_db)):
    b = db.query(Booking).filter(Booking.id == 51).first()
    if b:
         print(f"DEBUG: ID={b.id}, EXCESS={b.excess_fee}, STATUS={b.status}")
         return {
             "id": b.id, 
             "excess_fee": b.excess_fee,
             "status": b.status
         }
    return {"error": "not found"}
