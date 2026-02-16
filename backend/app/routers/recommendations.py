from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List, Optional
from app.models import Product, ProductImage, Rating, Reservation, SaleArchive
from app.schemas import ProductOut, ReservationOut, ProductImageOut
from app.auth import get_current_customer, get_current_admin
from app.recommender import HybridRecommender
from app.db import init_db
from app.config import get_settings
from datetime import date

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

# Change: Dependency Injection for Recommender?
# Usually recommender is stateful (trained model). Ideally a Singleton.
# In main.py: `recommender = HybridRecommender()`
# We need access to that instance.
# Option 1: Create a singleton file `app/dependencies.py`
# Option 2: Just import `recommender` from `app.main` (circular import risk)
# Option 3: Define `recommender` in a separate `app/core.py` or similar.

# For now, let's create a get_recommender method.
# In `main.py`, `recommender` is global.
# Circular import if I import `app.main`.
# Let's move standard `recommender` instance to `app/core/recommender_instance.py`?
# Or just put the router code in `main.py` to avoid architectural refactoring right now.
