import sys
import os

# Add api directory to path so we can import main
sys.path.append(os.path.abspath("api"))

try:
    from main import app
    print("Successfully imported app.")
    
    found = False
    print("Searching for '/admin/bookings/{booking_id}/calculate-exit'...")
    for route in app.routes:
        if hasattr(route, "path"):
            if "calculate-exit" in route.path:
                print(f"FOUND: {route.path} [{route.methods}]")
                found = True
    
    if not found:
        print("ERROR: Route NOT found in app.routes")
        # Print all /admin routes to debug
        print("\nAll /admin routes:")
        for route in app.routes:
             if hasattr(route, "path") and "/admin" in route.path:
                 print(f" - {route.path}")
    
except Exception as e:
    print(f"Failed to import app: {e}")
