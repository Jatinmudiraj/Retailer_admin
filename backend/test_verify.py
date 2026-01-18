import os
import sys
# Add current dir to path to find "app"
sys.path.append(os.getcwd())

from fastapi import HTTPException
from app.auth import verify_google_credential

print("Testing verify_google_credential with dummy token...")

try:
    # This SHOULD raise HTTPException(401) because token is invalid
    verify_google_credential("invalid_token_string")
    print("Unexpected success (should have failed)")
except HTTPException as e:
    print(f"Caught expected HTTPException: {e.status_code} {e.detail}")
except Exception as e:
    print(f"CAUGHT UNEXPECTED CRASH: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
