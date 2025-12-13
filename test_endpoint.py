import requests
import sys

def test_endpoint():
    print("-" * 20)
    # Check /docs
    try:
        r_docs = requests.get("http://127.0.0.1:8000/docs")
        print(f"GET /docs -> {r_docs.status_code}")
    except:
        print("GET /docs failed")

    print("-" * 20)
    url = "http://127.0.0.1:8000/admin/bookings/57/calculate-exit"
    print(f"Testing POST {url}...")
    try:
        response = requests.post(url)
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {response.headers}")
        print(f"Response Body: {response.text}")

            
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_endpoint()
