from database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        try:
            # Add is_pre_alert_sent
            conn.execute(text("ALTER TABLE bookings ADD COLUMN is_pre_alert_sent BOOLEAN DEFAULT 0"))
            print("Added is_pre_alert_sent")
        except Exception as e:
            print(f"Skipped is_pre_alert_sent: {e}")

        try:
            # Add is_expiry_alert_sent
            conn.execute(text("ALTER TABLE bookings ADD COLUMN is_expiry_alert_sent BOOLEAN DEFAULT 0"))
            print("Added is_expiry_alert_sent")
        except Exception as e:
            print(f"Skipped is_expiry_alert_sent: {e}")

        try:
            # Add last_overstay_sent_at
            conn.execute(text("ALTER TABLE bookings ADD COLUMN last_overstay_sent_at DATETIME NULL"))
            print("Added last_overstay_sent_at")
        except Exception as e:
            print(f"Skipped last_overstay_sent_at: {e}")
            
        conn.commit()

if __name__ == "__main__":
    migrate()
