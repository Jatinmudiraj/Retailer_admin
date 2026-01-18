import os
import sys
import traceback

# Add current dir to path to find "app"
sys.path.append(os.getcwd())

try:
    print("Attempting to import app.config...")
    from app.config import get_settings
    settings = get_settings()
    print(f"Settings loaded. JWT_SECRET length: {len(settings.JWT_SECRET)}")
    
    print("Attempting to import app.auth...")
    from app.auth import make_session_token, AdminUser
    
    print("Testing JWT encoding...")
    user = AdminUser(email="test@example.com", name="Test User", picture=None)
    token = make_session_token(user)
    print(f"JWT Token generated successfully: {token[:10]}...")
    
    print("Checking google-auth imports...")
    from google.oauth2 import id_token
    from google.auth.transport import requests
    print("Google auth libraries imported successfully.")
    
    print("DIAGNOSTICS PASSED")

except Exception:
    print("DIAGNOSTICS FAILED")
    traceback.print_exc()
