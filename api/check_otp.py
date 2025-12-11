from database import engine
from sqlalchemy import text

def get_latest_otp():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT otp FROM password_resets ORDER BY created_at DESC LIMIT 1"))
        row = result.fetchone()
        if row:
            print(f"LATEST_OTP:{row[0]}")

if __name__ == "__main__":
    get_latest_otp()
