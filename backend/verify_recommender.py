import sys
import os

sys.path.append(os.getcwd())

from app.recommender import ContentBasedRecommender
r = ContentBasedRecommender()
print(f"Has model? {hasattr(r, 'model')}")
print(f"Model value: {r.model}")
