import sys
import os
import traceback

sys.path.append(os.getcwd())

try:
    import app.main_broken
    print("SUCCESS")
except Exception as e:
    print(f"FAILED: {e}")
    # Print only file/line info
    tb = traceback.extract_tb(e.__traceback__)
    for frame in tb:
        if "main_broken" in frame.filename:
            print(f"FRAME: {frame.filename} LINE: {frame.lineno} CODE: {frame.line}")
