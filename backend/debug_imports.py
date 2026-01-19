import sys
import os

sys.path.append(os.getcwd())

print("Testing imports...")
try:
    import app.config
    print("config ok")
except Exception as e:
    print(f"config failed: {e}")

try:
    import app.db
    print("db ok")
except Exception as e:
    print(f"db failed: {e}")

try:
    import app.schemas
    print("schemas ok")
except Exception as e:
    print(f"schemas failed: {e}")

try:
    import app.models
    print("models ok")
except Exception as e:
    print(f"models failed: {e}")

try:
    import app.s3_service
    print("s3 ok")
except Exception as e:
    print(f"s3 failed: {e}")

try:
    import app.auth
    print("auth ok")
except Exception as e:
    print(f"auth failed: {e}")

try:
    import app.recommender
    print("rec ok")
except Exception as e:
    print(f"rec failed: {e}")

print("Testing main...")
try:
    import app.main
    print("main ok")
except Exception as e:
    print(f"main failed: {e}")
    import traceback
    traceback.print_exc()
