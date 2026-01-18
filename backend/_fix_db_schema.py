
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def fix_schema():
    print("Connecting to database...")
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        print("Checking existing columns in 'product_images'...")
        res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='product_images';"))
        columns = [row[0] for row in res]
        print("Columns found:", columns)
        
        if 'url' not in columns:
            print("Adding 'url' column...")
            try:
                conn.execute(text("ALTER TABLE product_images ADD COLUMN url VARCHAR(500);"))
                conn.commit()
                print("Added 'url'.")
            except Exception as e:
                print(f"Error adding url: {e}")
        else:
            print("'url' column already exists.")

        if 's3_key' not in columns:
            print("Adding 's3_key' column...")
            try:
                conn.execute(text("ALTER TABLE product_images ADD COLUMN s3_key VARCHAR(500);"))
                conn.commit()
                print("Added 's3_key'.")
            except Exception as e:
                print(f"Error adding s3_key: {e}")
        else:
            print("'s3_key' column already exists.")

        if 'upload_status' not in columns:
            print("Adding 'upload_status' column...")
            try:
                conn.execute(text("ALTER TABLE product_images ADD COLUMN upload_status VARCHAR(20) DEFAULT 'ACTIVE';"))
                conn.commit()
                print("Added 'upload_status'.")
            except Exception as e:
                print(f"Error adding upload_status: {e}")
        else:
            print("'upload_status' column already exists.")

        if 'content_type' not in columns:
            print("Adding 'content_type' column...")
            try:
                conn.execute(text("ALTER TABLE product_images ADD COLUMN content_type VARCHAR(50);"))
                conn.commit()
                print("Added 'content_type'.")
            except Exception as e:
                print(f"Error adding content_type: {e}")
        else:
            print("'content_type' column already exists.")

        if 'file_size' not in columns:
            print("Adding 'file_size' column...")
            try:
                conn.execute(text("ALTER TABLE product_images ADD COLUMN file_size INT;"))
                conn.commit()
                print("Added 'file_size'.")
            except Exception as e:
                print(f"Error adding file_size: {e}")
        else:
            print("'file_size' column already exists.")

        if 'checksum' not in columns:
            print("Adding 'checksum' column...")
            try:
                conn.execute(text("ALTER TABLE product_images ADD COLUMN checksum VARCHAR(64);"))
                conn.commit()
                print("Added 'checksum'.")
            except Exception as e:
                print(f"Error adding checksum: {e}")
        else:
            print("'checksum' column already exists.")

        if 'is_primary' not in columns:
            print("Adding 'is_primary' column...")
            try:
                conn.execute(text("ALTER TABLE product_images ADD COLUMN is_primary BOOLEAN DEFAULT FALSE;"))
                conn.commit()
                print("Added 'is_primary'.")
            except Exception as e:
                print(f"Error adding is_primary: {e}")
        else:
            print("'is_primary' column already exists.")

        if 'created_at' not in columns:
            print("Adding 'created_at' column...")
            try:
                conn.execute(text("ALTER TABLE product_images ADD COLUMN created_at TIMESTAMP DEFAULT now();"))
                conn.commit()
                print("Added 'created_at'.")
            except Exception as e:
                print(f"Error adding created_at: {e}")
        else:
            print("'created_at' column already exists.")

        if 'updated_at' not in columns:
            print("Adding 'updated_at' column...")
            try:
                conn.execute(text("ALTER TABLE product_images ADD COLUMN updated_at TIMESTAMP DEFAULT now();"))
                conn.commit()
                print("Added 'updated_at'.")
            except Exception as e:
                print(f"Error adding updated_at: {e}")
        else:
            print("'updated_at' column already exists.")

        if 'path' not in columns:
            print("Adding 'path' column...")
            try:
                conn.execute(text("ALTER TABLE product_images ADD COLUMN path VARCHAR(500);"))
                conn.commit()
                print("Added 'path'.")
            except Exception as e:
                print(f"Error adding path: {e}")
        else:
            print("'path' column already exists.")

        if 'image_data' not in columns:
            print("Adding 'image_data' column...")
            try:
                conn.execute(text("ALTER TABLE product_images ADD COLUMN image_data BYTES;"))
                conn.commit()
                print("Added 'image_data'.")
            except Exception as e:
                print(f"Error adding image_data: {e}")
        else:
            print("'image_data' column already exists.")


            
        # Verify
        res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='product_images';"))
        print("Final columns:", [row[0] for row in res])
    
    print("Schema check complete.")

if __name__ == "__main__":
    fix_schema()
