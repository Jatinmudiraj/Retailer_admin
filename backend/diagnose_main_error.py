import sys
import os
import traceback

sys.path.append(os.getcwd())

try:
    from app.main import app
    print("SUCCESS")
except Exception as e:
    with open("verify_error.txt", "w") as f:
        f.write(f"Error Type: {type(e).__name__}\n")
        f.write(f"Error Message: {str(e)}\n")
        traceback.print_exc(file=f)
    print("FAILED")
