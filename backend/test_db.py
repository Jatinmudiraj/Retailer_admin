import sys
import os

# Add parent dir to path
sys.path.append(os.getcwd())

try:
    from app.db import engine
    from sqlalchemy import text

    print("Attempting to connect to DB...")
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print(f"DB Success: {result.scalar()}")
except Exception as e:
    print(f"DB Error: {e}")
    import traceback
    traceback.print_exc()
