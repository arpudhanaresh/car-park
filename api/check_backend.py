from utils.db import get_db, SessionLocal
from models import Booking

db = SessionLocal()
b = db.query(Booking).filter(Booking.id == 51).first()
if b:
    print(f"ID: {b.id}")
    print(f"Excess Fee: {b.excess_fee}")
    print(f"Payment Amount: {b.payment_amount}")
    print(f"Status: {b.status}")
else:
    print("Booking 51 not found")
