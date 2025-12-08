from database import engine
from sqlalchemy import text

def add_column():
    with engine.connect() as connection:
        try:
            connection.execute(text("ALTER TABLE bookings ADD COLUMN latest_order_id VARCHAR(100) NULL;"))
            print("Successfully added column latest_order_id")
        except Exception as e:
            print(f"Error (might already exist): {e}")

if __name__ == "__main__":
    add_column()
