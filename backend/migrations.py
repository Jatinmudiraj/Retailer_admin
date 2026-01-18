from app.db import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        print("Migrating schema...")
        try:
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS price FLOAT"))
            print("Added price")
        except Exception as e:
            print(f"Error adding price: {e}")

        try:
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS manual_rating FLOAT"))
            print("Added manual_rating")
        except Exception as e:
            print(f"Error adding manual_rating: {e}")

        try:
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS terms TEXT"))
            print("Added terms")
        except Exception as e:
            print(f"Error adding terms: {e}")

        try:
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS options JSONB"))
            print("Added options")
        except Exception as e:
            print(f"Error adding options: {e}")
            
        conn.commit()
        print("Migration complete.")

if __name__ == "__main__":
    migrate()
