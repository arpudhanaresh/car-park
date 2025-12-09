from sqlalchemy.orm import Session
from database import SessionLocal
from models import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def create_test_admin():
    db: Session = SessionLocal()
    try:
        username = "test_admin"
        password = "test_admin123"
        
        user = db.query(User).filter(User.username == username).first()
        if not user:
            print(f"Creating user {username}...")
            user = User(
                username=username,
                email="test_admin@example.com",
                hashed_password=get_password_hash(password),
                role="admin"
            )
            db.add(user)
        else:
            print(f"Updating user {username}...")
            user.role = "admin"
            user.hashed_password = get_password_hash(password)
        
        db.commit()
        print("Successfully setup test_admin / test_admin123")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_test_admin()
