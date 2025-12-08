from services.ringgitpay import RinggitPayService
import os
from dotenv import load_dotenv

load_dotenv()

def test_check_status():
    print("Initializing service...")
    try:
        service = RinggitPayService()
        print("Service initialized.")
        
        order_id = "RP-22-1765220916"
        print(f"Checking status for {order_id}...")
        result = service.check_status(order_id)
        print(f"Result: {result}")
    except Exception as e:
        print(f"CRASHED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_check_status()
