from main import SessionLocal
from models import PromoCode, User

def check():
    print("Checking DB connection from main.py...")
    db = SessionLocal()
    try:
        # Check Users
        print("\n--- Users ---")
        users = db.query(User).all()
        for u in users:
            print(f"ID: {u.id}, Username: {u.username}, Email: {u.email}")
            
        # Check Promos
        print("\n--- Promos ---")
        promos = db.query(PromoCode).all()
        for p in promos:
            print(f" - {p.code} (Active: {p.is_active})")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check()
