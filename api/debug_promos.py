from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
from models import Base, PromoCode
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "mysql+pymysql://root:password@localhost/car_parking"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def debug_db():
    print("--- START DEBUG ---")
    
    # 1. Check tables
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"Tables in DB: {tables}")
    
    if "promo_codes" not in tables:
        print("TABLE 'promo_codes' MISSING! Attempting to create...")
        try:
            # Use SQLAlchemy create_all specifically for PromoCode
            PromoCode.__table__.create(engine)
            print("Table 'promo_codes' created via SQLAlchemy.")
        except Exception as e:
            print(f"Failed to create table via SQLAlchemy: {e}")
            # Fallback to raw SQL if needed (but SQLAlchemy should work since we fixed the model)
    else:
        print("Table 'promo_codes' exists.")

    # 2. Check content
    db = SessionLocal()
    try:
        count = db.query(PromoCode).count()
        print(f"PromoCode count: {count}")
        
        if count == 0:
            print("Seeding promos...")
            promos = [
                PromoCode(
                    code="WELCOME50", 
                    discount_type="percentage", 
                    discount_value=50.0, 
                    expiry_date=datetime.utcnow() + timedelta(days=365),
                    usage_limit=100,
                    current_uses=0,
                    is_active=True
                ),
                PromoCode(
                    code="FLAT10", 
                    discount_type="fixed", 
                    discount_value=10.0, 
                    expiry_date=datetime.utcnow() + timedelta(days=30),
                    usage_limit=50,
                    current_uses=0,
                    is_active=True
                )
            ]
            
            for p in promos:
                try:
                    db.add(p)
                    db.commit() # Commit individually to isolate errors
                    print(f"Seeded: {p.code}")
                except Exception as e:
                    db.rollback()
                    print(f"Failed to seed {p.code}: {e}")
        else:
            promos = db.query(PromoCode).all()
            for p in promos:
                print(f" - {p.code} ({p.discount_type}: {p.discount_value})")

    except Exception as e:
        print(f"Query error: {e}")
    finally:
        db.close()
    
    print("--- END DEBUG ---")

if __name__ == "__main__":
    debug_db()
