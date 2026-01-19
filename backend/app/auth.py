from __future__ import annotations

import time
from typing import Optional, Tuple

import jwt
import bcrypt
from fastapi import HTTPException, Request
from google.auth.transport import requests as grequests
from google.oauth2 import id_token

from app.config import get_settings
from app.schemas import AdminUser

settings = get_settings()

COOKIE_NAME = "admin_session"


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
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    pwd_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
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
