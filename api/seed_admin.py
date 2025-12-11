
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, User
from passlib.context import CryptContext
import os
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")

SQLALCHEMY_DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def seed_admin():
    db = SessionLocal()
    try:
        username = "arpudhanareshadmin"
        email = "arpudha@admin.com" 
        password = "Nare@9962618791"
        
        # Check if exists
        user = db.query(User).filter(User.username == username).first()
        if user:
            print("Admin user already exists. Updating credentials/role if needed.")
            user.role = "admin"
            user.hashed_password = get_password_hash(password)
        else:
            print("Creating admin user...")
            user = User(
                username=username,
                email=email,
                hashed_password=get_password_hash(password),
                role="admin",
                full_name="Arpudha Naresh Admin"
            )
            db.add(user)
        
        db.commit()
        print("Admin user seeded successfully.")
        
    except Exception as e:
        print(f"Error seeding admin: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_admin()
