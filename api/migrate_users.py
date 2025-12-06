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
        # Check if columns exist in users table
        try:
            # Add full_name
            result = connection.execute(text("SHOW COLUMNS FROM users LIKE 'full_name'"))
            if not result.fetchone():
                print("Adding 'full_name' column to 'users' table...")
                connection.execute(text("ALTER TABLE users ADD COLUMN full_name VARCHAR(100)"))
            
            # Add email
            result = connection.execute(text("SHOW COLUMNS FROM users LIKE 'email'"))
            if not result.fetchone():
                print("Adding 'email' column to 'users' table...")
                connection.execute(text("ALTER TABLE users ADD COLUMN email VARCHAR(100)"))
            
            # Add phone
            result = connection.execute(text("SHOW COLUMNS FROM users LIKE 'phone'"))
            if not result.fetchone():
                print("Adding 'phone' column to 'users' table...")
                connection.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(20)"))

            print("Migration successful: User columns added.")
        except Exception as e:
            print(f"Error during migration: {e}")

if __name__ == "__main__":
    migrate()
