import uvicorn
import sys
import os

sys.path.append(os.getcwd())

print("Importing app...")
try:
    from app.main import app
    print("App imported.")
except Exception as e:
    print(f"Import failed: {e}")
    sys.exit(1)

if __name__ == "__main__":
    print("Starting Uvicorn...")
    uvicorn.run(app, host="0.0.0.0", port=9001)
