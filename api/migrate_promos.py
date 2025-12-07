from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from models import Base, PromoCode
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

# Load env vars
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "mysql+pymysql://root:password@localhost/car_parking"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def migrate():
    print("Starting migration...")
    
    # Create promo_codes table
    try:
        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS promo_codes (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    code VARCHAR(50) NOT NULL UNIQUE,
                    discount_type VARCHAR(20) NOT NULL,
                    discount_value DECIMAL(10, 2) NOT NULL,
                    expiry_date DATETIME NOT NULL,
                    usage_limit INT DEFAULT 1,
                    current_uses INT DEFAULT 0,
                    is_active BOOLEAN DEFAULT TRUE,
                    INDEX (code)
                )
            """))
            print("Created promo_codes table.")
            
            # Add columns to bookings table
            # Check if columns exist first to avoid errors
            try:
                conn.execute(text("ALTER TABLE bookings ADD COLUMN discount_amount DECIMAL(10, 2) DEFAULT 0"))
                print("Added discount_amount to bookings.")
            except Exception as e:
                print(f"Column discount_amount might already exist: {e}")

            try:
                conn.execute(text("ALTER TABLE bookings ADD COLUMN promo_code_id INT DEFAULT NULL"))
                conn.execute(text("ALTER TABLE bookings ADD CONSTRAINT fk_bookings_promo_code FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id)"))
                print("Added promo_code_id to bookings.")
            except Exception as e:
                print(f"Column promo_code_id might already exist: {e}")

            conn.commit()
            
    except Exception as e:
        print(f"Migration error: {e}")

    # Seed Initial Promo Codes
    db = SessionLocal()
    try:
        promos = [
            PromoCode(
                code="WELCOME50", 
                discount_type="percentage", 
                discount_value=50.0, 
                expiry_date=datetime.utcnow() + timedelta(days=365),
                usage_limit=100
            ),
            PromoCode(
                code="FLAT10", 
                discount_type="fixed", 
                discount_value=10.0, 
                expiry_date=datetime.utcnow() + timedelta(days=30),
                usage_limit=50
            )
        ]
        
        for promo in promos:
            existing = db.query(PromoCode).filter(PromoCode.code == promo.code).first()
            if not existing:
                db.add(promo)
                print(f"Added promo code: {promo.code}")
        
        db.commit()
        print("Seeded promo codes.")
        
    except Exception as e:
        print(f"Seeding error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
