import os
from datetime import timedelta
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
    Base, User, ParkingSpot, LayoutConfigDB,
    UserCreate, Token, ParkingState, LayoutConfig, BookingRequest, SpotSchema
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

def get_password_hash(password):
    # Bcrypt has a 72-byte limit, so we truncate if necessary
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
    new_user = User(username=user.username, hashed_password=hashed_password, role=user.role)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    access_token = create_access_token(data={"sub": new_user.username, "role": new_user.role})
    return {"access_token": access_token, "token_type": "bearer", "role": new_user.role, "username": new_user.username}

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
    return {"access_token": access_token, "token_type": "bearer", "role": user.role, "username": user.username}

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
            spots_out.append(SpotSchema(row=r, col=c, is_booked=is_booked))
            
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
    
    # Remove spots that are out of bounds
    db.query(ParkingSpot).filter((ParkingSpot.row >= config.rows) | (ParkingSpot.col >= config.cols)).delete()
    db.commit()
    return get_layout(db)

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
