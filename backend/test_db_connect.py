import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
print(f"URL: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'HIDDEN'}")

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        print("Connecting...")
        res = conn.execute(text("SELECT 1"))
        print(f"Result: {res.scalar()}")
    print("SUCCESS")
except Exception as e:
    print(f"FAILED: {e}")
