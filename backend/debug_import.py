import sys
import os

# Add cwd to path just in case
sys.path.append(os.getcwd())

try:
    import app.main
    print("Import Success")
except Exception:
    import traceback
    with open('crash.log', 'w') as f:
        traceback.print_exc(file=f)
    print("Import Failed - Check crash.log")
    sys.exit(1)
