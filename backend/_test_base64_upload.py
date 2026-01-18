
import sys
import os
import base64
import requests
import json
import time
import jwt
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "http://localhost:9001"
# Default secret from .env.example or known default if not in .env
SECRET_KEY = os.getenv("JWT_SECRET", "e0b16f6e297c40750ade32ea7fa0dba6f64709588aa5269c4efdc108df550dca8ec31dcd70d68801a2f598ccbe6f059371083ec149ecc7d2b3a87af3dce6f7f3")
ALGORITHM = "HS256"

def create_access_token():
    # Use allowed email from .env
    to_encode = {
        "sub": "jatinmudiraj126@gmail.com", 
        "name": "Test Admin",
        "exp": time.time() + 3600
    }
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def test_upload():
    print("Testing Product Creation with Base64 Image...")

    # Create a small red dot image
    base64_img = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    
    sku = f"TEST-SKU-{os.urandom(4).hex()}"
    
    payload = {
        "sku": sku,
        "name": "Test Upload Product",
        "category": "Test",
        "qty": 10,
        "stock_type": "physical",
        "image_base64": base64_img
    }
    
    headers = {"Content-Type": "application/json"}
    token = create_access_token()
    # Cookie name must match backend COOKIE_NAME
    cookies = {"admin_session": token}
    
    try:
        print(f"Sending request to {BASE_URL}/products with token...")
        response = requests.post(f"{BASE_URL}/products", json=payload, headers=headers, cookies=cookies)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print("Response:", response.text)
            return
            
        data = response.json()
        print("Success!")
        print(json.dumps(data, indent=2))
        
        if data.get("url") and "retail-app-bucket58" in data["url"]:
             print("URL Verification Passed: URL contains bucket name.")
        else:
             print("URL Verification FAILED: URL missing or incorrect.")

    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_upload()
