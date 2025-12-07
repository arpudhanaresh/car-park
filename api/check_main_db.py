from main import SessionLocal
from models import PromoCode

def check():
    print("Checking DB connection from main.py...")
    db = SessionLocal()
    try:
        # Check connection info (hacky way to inspect engine url if possible, or just tests data)
        print(f"Engine URL: {db.bind.url}")
        
        count = db.query(PromoCode).count()
        print(f"PromoCode count: {count}")
        promos = db.query(PromoCode).all()
        for p in promos:
            print(f" - {p.code} (Active: {p.is_active})")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check()
