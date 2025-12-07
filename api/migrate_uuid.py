
import uuid
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load env vars
load_dotenv()

DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")

SQLALCHEMY_DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def migrate():
    db = SessionLocal()
    try:
        print("Checking for booking_uuid column...")
        # Check if column exists
        try:
            db.execute(text("SELECT booking_uuid FROM bookings LIMIT 1"))
            print("Column booking_uuid already exists.")
        except Exception:
            print("Column missing. Adding booking_uuid column...")
            db.execute(text("ALTER TABLE bookings ADD COLUMN booking_uuid VARCHAR(36) UNIQUE"))
            db.commit()
            print("Column added.")

        # Backfill UUIDs
        print("Backfilling UUIDs for existing bookings...")
        # We use raw sql or simply fetch all bookings that have null uuid
        # But we haven't updated the ORM mapping in this running process? 
        # Actually 'models' is imported in main, but here we run a script.
        # Let's use raw SQL to be safe and efficient
        
        # Fetch IDs with null UUID
        result = db.execute(text("SELECT id FROM bookings WHERE booking_uuid IS NULL"))
        rows = result.fetchall()
        
        count = 0
        for row in rows:
            bid = row[0]
            new_uuid = str(uuid.uuid4())
            db.execute(text("UPDATE bookings SET booking_uuid = :uuid WHERE id = :id"), {"uuid": new_uuid, "id": bid})
            count += 1
            
        db.commit()
        print(f"Backfilled {count} bookings with UUIDs.")
            
    except Exception as e:
        print(f"Migration failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
