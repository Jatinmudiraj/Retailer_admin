from app.db import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        print("Migrating schema for images...")
        try:
            conn.execute(text("ALTER TABLE product_images ADD COLUMN IF NOT EXISTS image_data BYTES"))
            print("Added image_data")
        except Exception as e:
            print(f"Error adding image_data: {e}")

        try:
            conn.execute(text("ALTER TABLE product_images ADD COLUMN IF NOT EXISTS content_type VARCHAR(50)"))
            print("Added content_type")
        except Exception as e:
            print(f"Error adding content_type: {e}")
            
        try:
            # Make path nullable if strict
            conn.execute(text("ALTER TABLE product_images ALTER COLUMN path DROP NOT NULL"))
            print("Made path nullable")
        except Exception as e:
            print(f"Error making path nullable: {e}")

        conn.commit()
        print("Migration complete.")

if __name__ == "__main__":
    migrate()
