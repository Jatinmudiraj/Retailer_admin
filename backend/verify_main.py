import sys
import os

# Ensure cwd is in path
sys.path.append(os.getcwd())

print("--- VERIFYING IMPORT ---")
try:
    import app.main
    print("--- IMPORT SUCCESS ---")
except Exception as e:
    print("--- IMPORT FAILED ---")
    print(f"Error Type: {type(e).__name__}")
    print(f"Error Message: {e}")
    import traceback
    traceback.print_exc()
print("--- FINISHED ---")
