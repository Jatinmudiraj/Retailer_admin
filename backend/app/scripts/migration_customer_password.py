from app.db import engine
from sqlalchemy import text
from app.models import Base

def run_migration():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE customers ADD COLUMN hashed_password VARCHAR(255)"))
            print("Successfully added hashed_password column to customers table")
        except Exception as e:
            print(f"Migration failed (maybe column exists?): {e}")

if __name__ == "__main__":
    run_migration()
