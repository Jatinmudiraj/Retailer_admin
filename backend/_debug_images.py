import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL not set")
    sys.exit(1)

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    result = conn.execute(text("SELECT sku, url, s3_key, is_primary FROM product_images LIMIT 10"))
    print(f"{'SKU':<20} | {'URL':<50} | {'S3 Key':<30} | {'Primary'}")
    print("-" * 110)
    for row in result:
        sku = row[0]
        url = row[1] if row[1] else "NULL"
        s3_key = row[2] if row[2] else "NULL"
        is_primary = str(row[3])
        # Truncate URL for display
        display_url = (url[:47] + '...') if len(url) > 50 else url
        print(f"{sku:<20} | {display_url:<50} | {s3_key:<30} | {is_primary}")
