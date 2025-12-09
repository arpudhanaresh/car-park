from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

load_dotenv()

DB_USER = os.getenv("DB_USER", "user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "password")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "car_park_db")

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL)

def add_column():
    with engine.connect() as connection:
        try:
            connection.execute(text("ALTER TABLE parking_spots ADD COLUMN is_blocked BOOLEAN DEFAULT FALSE"))
            print("Successfully added is_blocked column to parking_spots table")
        except Exception as e:
            if "Duplicate column name" in str(e):
                print("Column is_blocked already exists")
            else:
                print(f"Error adding column: {e}")

if __name__ == "__main__":
    add_column()
