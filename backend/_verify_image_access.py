import os
import sys
import requests
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from app.s3_service import generate_presigned_get_url

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL not set")
    sys.exit(1)

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    result = conn.execute(text("SELECT sku, s3_key, is_primary FROM product_images WHERE s3_key IS NOT NULL LIMIT 5"))
    print(f"{'SKU':<15} | {'S3 Key':<35} | {'Status'}")
    print("-" * 70)
    
    for row in result:
        sku = row[0]
        s3_key = row[1]
        
        try:
            url = generate_presigned_get_url(s3_key)
            resp = requests.get(url)
            status = f"OK ({resp.status_code})" if resp.status_code == 200 else f"FAIL ({resp.status_code})"
        except Exception as e:
            status = f"ERR: {e}"
            
        print(f"{sku:<15} | {s3_key:<35} | {status}")
