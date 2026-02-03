
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def add_tags_column():
    print("Connecting to database...")
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        print("Checking existing columns in 'products'...")
        res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='products';"))
        columns = [row[0] for row in res]
        print("Columns found:", columns)
        
        if 'tags' not in columns:
            print("Adding 'tags' column...")
            try:
                # SQLite doesn't support JSON type natively in older versions, but typically we are using Postgres or it is handled as text. 
                # Assuming Postgres from older logs (psycopg2 present). Postgres supports JSON/JSONB.
                # Let's try adding as JSON.
                conn.execute(text("ALTER TABLE products ADD COLUMN tags JSON;"))
                conn.commit()
                print("Added 'tags' column.")
            except Exception as e:
                print(f"Error adding tags: {e}")
        else:
            print("'tags' column already exists.")

    print("Schema check complete.")

if __name__ == "__main__":
    add_tags_column()
