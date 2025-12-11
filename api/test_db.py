from sqlalchemy import create_engine
import os
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")

SQLALCHEMY_DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

print(f"Connecting to {DB_HOST}...")

try:
    engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)
    connection = engine.connect()
    print("Database Connection SUCCESS!")
    connection.close()
except Exception as e:
    print(f"Database Connection FAILED: {e}")
    import traceback
    traceback.print_exc()
