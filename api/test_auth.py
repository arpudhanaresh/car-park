from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "secret"
ALGORITHM = "HS256"

def test_hash():
    print("Testing Hash...")
    try:
        hash = pwd_context.hash("password")
        print(f"Hash success: {hash}")
        verify = pwd_context.verify("password", hash)
        print(f"Verify success: {verify}")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Hash Error: {e}")

def test_jwt():
    print("Testing JWT...")
    try:
        data = {"sub": "test", "exp": datetime.utcnow() + timedelta(minutes=15)}
        token = jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)
        print(f"JWT Success: {token}")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"JWT Error: {e}")

if __name__ == "__main__":
    test_hash()
    test_jwt()
