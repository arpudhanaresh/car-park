import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load env vars
load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "car_park_db")

SQLALCHEMY_DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def migrate():
    print("Migrating ParkingSpot table...")
    with engine.connect() as conn:
        # Check if columns exist
        result = conn.execute(text("SHOW COLUMNS FROM parking_spots LIKE 'label'"))
        if not result.fetchone():
            print("Adding 'label' column...")
            conn.execute(text("ALTER TABLE parking_spots ADD COLUMN label VARCHAR(10) DEFAULT ''"))
        
        result = conn.execute(text("SHOW COLUMNS FROM parking_spots LIKE 'spot_type'"))
        if not result.fetchone():
            print("Adding 'spot_type' column...")
            conn.execute(text("ALTER TABLE parking_spots ADD COLUMN spot_type VARCHAR(20) DEFAULT 'standard'"))
            
    print("Columns added. Backfilling labels...")
    
    db = SessionLocal()
    try:
        # Raw SQL or model usage to backfill
        # We need to map row/col to labels: 0,0 -> A1
        result = db.execute(text("SELECT id, row, col FROM parking_spots"))
        spots = result.fetchall()
        
        for spot in spots:
            spot_id, row, col = spot
            label = f"{chr(65 + row)}{col + 1}"
            db.execute(
                text("UPDATE parking_spots SET label = :label WHERE id = :id"),
                {"label": label, "id": spot_id}
            )
            print(f"Updated Spot ID {spot_id}: {label}")
            
        db.commit()
        print("Migration complete.")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
