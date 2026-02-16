from __future__ import annotations

import time
from typing import Optional

import jwt
import bcrypt
from fastapi import HTTPException, Request
from google.auth.transport import requests as grequests
from google.oauth2 import id_token

from app.config import get_settings
from app.schemas import AdminUser
# Import Customer only inside function to avoid circular imports if needed, 
# but models are usually safe to import if they don't import auth.
# However, let's keep it safe.

settings = get_settings()

COOKIE_NAME = "admin_session"
CUSTOMER_COOKIE_NAME = "royaliq_customer_session"


def _allowed_email(email: str) -> bool:
    email = (email or "").strip().lower()
    if not email:
        return False

    allowed_emails = [e.strip().lower() for e in settings.ADMIN_EMAILS.split(",") if e.strip()]
    allowed_domains = [d.strip().lower() for d in settings.ADMIN_DOMAINS.split(",") if d.strip()]

    if allowed_emails and email in allowed_emails:
        return True
    if allowed_domains:
        for d in allowed_domains:
            if email.endswith("@" + d):
                return True
    # If neither list provided, deny by default
    return False


def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    # hashpw returns bytes
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    pwd_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    # checkpw expects bytes
    return bcrypt.checkpw(pwd_bytes, hashed_bytes)


def verify_google_credential(credential: str) -> AdminUser:
    """
    Google recommends verifying the ID token on the server side using official libraries.
    """
    try:
        req = grequests.Request()
        info = id_token.verify_oauth2_token(credential, req, settings.GOOGLE_CLIENT_ID)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Google credential")

    email = (info.get("email") or "").lower().strip()
    name = info.get("name")
    picture = info.get("picture")

    if not _allowed_email(email):
        raise HTTPException(status_code=403, detail="Email not allowed for retailer admin")

    return AdminUser(email=email, name=name, picture=picture)


def make_session_token(user: AdminUser, ttl_seconds: int = 24 * 3600) -> str:
    now = int(time.time())
    payload = {
        "sub": user.email,
        "name": user.name,
        "picture": user.picture,
        "iat": now,
        "exp": now + int(ttl_seconds),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


def read_session_token(token: str) -> AdminUser:
    try:
        # decode returns dict
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid session token")

    email = payload.get("sub") or ""
    if not _allowed_email(email):
        raise HTTPException(status_code=403, detail="Not allowed")

    return AdminUser(email=email, name=payload.get("name"), picture=payload.get("picture"))


def get_current_admin(request: Request) -> AdminUser:
    token = request.cookies.get(COOKIE_NAME, "").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return read_session_token(token)


async def get_current_customer(request: Request) -> "Customer":
    """
    Dependency to get current logged in customer from cookie.
    Async because it hits MongoDB.
    """
    from app.models import Customer
    
    token = request.cookies.get(CUSTOMER_COOKIE_NAME, "").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid session token")
    
    phone = payload.get("sub")
    if not phone:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    cust = await Customer.find_one(Customer.phone == phone)
    if not cust:
         raise HTTPException(status_code=401, detail="Customer not found")
    
    return cust
