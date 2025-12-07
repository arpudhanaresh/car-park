from sqlalchemy import create_engine, text
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL)

def force_seed():
    print("Force seeding with explicit values...")
    with engine.connect() as conn:
        try:
            # Delete existing to prevent dupes/bad state
            conn.execute(text("DELETE FROM promo_codes"))
            conn.commit()
            print("Cleared promo_codes table.")

            promos = [
                ("WELCOME50", "percentage", 50.0, (datetime.utcnow() + timedelta(days=365)).strftime('%Y-%m-%d %H:%M:%S'), 1, 100, 0),
                ("FLAT10", "fixed", 10.0, (datetime.utcnow() + timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S'), 1, 50, 0)
            ]

            for code, type, val, exp, active, limit, uses in promos:
                conn.execute(text(f"""
                    INSERT INTO promo_codes (code, discount_type, discount_value, expiry_date, is_active, usage_limit, current_uses)
                    VALUES ('{code}', '{type}', {val}, '{exp}', {active}, {limit}, {uses})
                """))
                print(f"inserted {code}")
            
            conn.commit()
            print("Seeding Complete.")

        except Exception as e:
            print(f"Error: {e}")
            conn.rollback()

if __name__ == "__main__":
    force_seed()
