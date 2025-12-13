from sqlalchemy import text
from database import engine

def run_migration():
    print("Starting MySQL Multi-Level Migration...")
    with engine.connect() as conn:
        try:
            # 1. Add 'floor' to 'parking_spots'
            print("Checking 'parking_spots'...")
            # MySQL syntax to check column - easiest is just try-catch or explicit check
            # We'll just try to add it. If it fails, it usually means it exists.
            try:
                conn.execute(text("ALTER TABLE parking_spots ADD COLUMN floor VARCHAR(50) DEFAULT 'Ground'"))
                print("Added 'floor' to 'parking_spots'.")
            except Exception as e:
                if "Duplicate column" in str(e) or "1060" in str(e):
                    print("'floor' column already exists in 'parking_spots'.")
                else:
                    print(f"Warning adding floor to parking_spots: {e}")

            # 2. Add 'floor' to 'layout_config'
            print("Checking 'layout_config'...")
            try:
                conn.execute(text("ALTER TABLE layout_config ADD COLUMN floor VARCHAR(50) DEFAULT 'Ground'"))
                print("Added 'floor' to 'layout_config'.")
            except Exception as e:
                if "Duplicate column" in str(e) or "1060" in str(e):
                    print("'floor' column already exists in 'layout_config'.")
                else:
                    print(f"Warning adding floor to layout_config: {e}")

            conn.commit()
            print("Migration completed successfully.")
            
        except Exception as e:
            print(f"Migration failed: {e}")
            
if __name__ == "__main__":
    run_migration()
