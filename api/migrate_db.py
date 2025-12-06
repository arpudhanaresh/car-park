import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "car_park_db")

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL)

def migrate():
    with engine.connect() as connection:
        # Check if user_id column exists in vehicles table
        try:
            result = connection.execute(text("SHOW COLUMNS FROM vehicles LIKE 'user_id'"))
            if result.fetchone():
                print("Column 'user_id' already exists in 'vehicles' table.")
            else:
                print("Adding 'user_id' column to 'vehicles' table...")
                connection.execute(text("ALTER TABLE vehicles ADD COLUMN user_id INT"))
                connection.execute(text("ALTER TABLE vehicles ADD CONSTRAINT fk_vehicles_users FOREIGN KEY (user_id) REFERENCES users(id)"))
                print("Migration successful: 'user_id' column added.")
        except Exception as e:
            print(f"Error during migration: {e}")

if __name__ == "__main__":
    migrate()
