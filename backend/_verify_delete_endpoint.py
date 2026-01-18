import requests
import os
import sys
import jwt
import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from app.models import Product

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("JWT_SECRET")
COOKIE_NAME = "admin_session"
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:9001")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

def create_dummy_product(sku):
    # Ensure clean slate
    db.execute(text(f"DELETE FROM products WHERE sku = '{sku}'"))
    db.commit()

    p = Product(
        sku=sku,
        name="Delete Test Item",
        weight_g=1.0,
        qty=1,
        created_at=datetime.datetime.utcnow(),
        updated_at=datetime.datetime.utcnow()
    )
    db.add(p)
    db.commit()
    print(f"Created dummy product: {sku}")

def get_token():
    payload = {
        "sub": "test_admin",
        "email": "jatinmudiraj126@gmail.com",
        "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=5)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def test_delete_endpoint(sku):
    token = get_token()
    cookies = {COOKIE_NAME: token}
    
    url = f"{BACKEND_URL}/products/{sku}"
    print(f"Sending DELETE to {url}")
    
    try:
        resp = requests.delete(url, cookies=cookies)
        print(f"Response: {resp.status_code} {resp.text}")
        
        if resp.status_code == 200:
            # Verify in DB
            exists = db.query(Product).filter(Product.sku == sku).first()
            if not exists:
                print("SUCCESS: Product was deleted from DB via API.")
            else:
                print("FAILURE: API returned 200, but Product still exists in DB.")
        else:
            print("FAILURE: API did not return 200.")

    except Exception as e:
        print(f"Exception during request: {e}")

if __name__ == "__main__":
    SKU = "DELETE_TEST_999"
    create_dummy_product(SKU)
    test_delete_endpoint(SKU)
