from typing import List, Dict, Optional, Tuple, Set
import numpy as np
import pandas as pd
from app.models import Product, Rating, Order, SaleArchive
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity, linear_kernel
from sklearn.preprocessing import MinMaxScaler
import logging
import random
from datetime import datetime, timedelta
from functools import lru_cache

logger = logging.getLogger(__name__)

class AdvancedRecommender:
    def __init__(self):
        # Configuration
        self.weights = {
            'content': 0.7,
            'price': 0.2,
            'popularity': 0.1
        }
        
        # Models
        self.tfidf = TfidfVectorizer(stop_words='english', max_features=2000)
        self.scaler = MinMaxScaler()
        
        # State
        self.products_df = None
        self.tfidf_matrix = None
        self.price_matrix = None
        self.popularity_scores = None
        
        self.sku_to_idx = {}
        self.idx_to_sku = {}
        self.products_map = {} # SKU -> Product Object
        
        self.is_fitted = False
        self.last_trained = None

    def _prepare_metadata_soup(self, p: Product) -> str:
        """
        Create a 'soup' of metadata for content matching.
        Weight important features by repetition.
        """
        # 1. Title/Name (High weight)
        soup = f"{p.name} {p.name} " 
        
        # 2. Category/Subcategory (Medium weight)
        if p.category:
            soup += f"{p.category} {p.category} "
        if p.subcategory:
            soup += f"{p.subcategory} "
            
        # 3. Tags (High weight - specific features usually)
        if p.tags:
            soup += " ".join(p.tags) + " " + " ".join(p.tags) + " "
            
        # 4. Specific Attributes (Metal, Color)
        if p.options:
            metal = p.options.get('metal', '')
            color = p.options.get('color', '')
            if metal: soup += f"{metal} {metal} "
            if color: soup += f"{color} {color} "
            
        # 5. Description (Low weight - noisy)
        if p.description:
            soup += f"{p.description}"
            
        return soup.lower()

    def fit(self, products: List[Product]):
        """
        Train the recommender system on the current product catalog.
        """
        if not products:
            logger.warning("No products to train recommender.")
            return

        logger.info(f"Training AdvancedRecommender on {len(products)} products...")
        self.products_map = {p.sku: p for p in products}
        self.sku_to_idx = {p.sku: i for i, p in enumerate(products)}
        self.idx_to_sku = {i: p.sku for i, p in enumerate(products)}

        # 1. Build DataFrame for easier manipulation
        data = []
        for p in products:
            data.append({
                'sku': p.sku,
                'soup': self._prepare_metadata_soup(p),
                'price': p.price if p.price is not None else 0.0,
                'weight': p.weight_g if p.weight_g is not None else 0.0,
                # Simulate popularity if we don't have real metrics yet
                # ideally: p.views + p.sales
                'popularity': float(p.manual_rating or 0) + (0.5 if p.qty == 0 else 0) 
            })
        
        self.products_df = pd.DataFrame(data)
        
        # 2. Vectorize Text (Content)
        self.tfidf_matrix = self.tfidf.fit_transform(self.products_df['soup'])
        
        # 3. Normalize Numerical Features
        # Price
        prices = self.products_df[['price']].values
        self.price_matrix = self.scaler.fit_transform(prices)
        
        # Popularity (Normalized)
        pop_scaler = MinMaxScaler()
        self.popularity_scores = pop_scaler.fit_transform(self.products_df[['popularity']].values).flatten()

        self.is_fitted = True
        self.last_trained = datetime.utcnow()
        logger.info("Recommender training complete.")

    def get_similar_products(self, sku: str, top_n: int = 5) -> List[Product]:
        """
        Get products similar to a specific SKU based on content and price.
        """
        if not self.is_fitted or sku not in self.sku_to_idx:
            return []
            
        idx = self.sku_to_idx[sku]
        
        # 1. Content Similarity (Cosine of TF-IDF)
        # Calculate only for this item vector vs all
        content_sim = linear_kernel(self.tfidf_matrix[idx:idx+1], self.tfidf_matrix).flatten()
        
        # 2. Price Similarity (1 - diff)
        target_price = self.price_matrix[idx][0]
        price_diff = np.abs(self.price_matrix[:, 0] - target_price)
        price_sim = 1 - price_diff
        
        # 3. Combined Score
        # Weight content higher for "Similarity", price secondary
        final_scores = (content_sim * 0.85) + (price_sim * 0.15)
        
        # 4. Sort
        related_indices = final_scores.argsort()[:-top_n-2:-1]
        
        recommendations = []
        for i in related_indices:
            other_sku = self.idx_to_sku[i]
            if other_sku == sku:
                continue
            recommendations.append(self.products_map[other_sku])
            if len(recommendations) >= top_n:
                break
                
        return recommendations

    async def recommend_for_user(self, user_id: str, top_n: int = 10) -> List[Product]:
        """
        Generate personalized recommendations.
        """
        if not self.is_fitted:
            return []
            
        ratings = await Rating.find(Rating.customer_ref == user_id).to_list()
        orders = await Order.find(Order.customer_id == user_id).to_list()
        
        liked_skus = set()
        user_prices = []
        
        for r in ratings:
            if r.stars >= 4:
                liked_skus.add(r.sku)
                if r.sku in self.products_map:
                    user_prices.append(self.products_map[r.sku].price)
                    
        for o in orders:
            for item in o.items:
                liked_skus.add(item.sku)
                user_prices.append(item.price)

        if not liked_skus:
            return self._get_trending_products(top_n)

        # Content Profile
        liked_indices = [self.sku_to_idx[s] for s in liked_skus if s in self.sku_to_idx]
        if not liked_indices:
             return self._get_trending_products(top_n)
             
        user_profile_vec = np.mean(self.tfidf_matrix[liked_indices], axis=0)
        user_profile_vec = np.asarray(user_profile_vec)
        
        content_scores = cosine_similarity(user_profile_vec, self.tfidf_matrix).flatten()
        
        # Price Profile
        user_prices = [p for p in user_prices if p is not None]
        if user_prices:
            avg_price = np.median(user_prices)
            norm_avg_price = self.scaler.transform([[avg_price]])[0][0]
            price_score = 1 - np.abs(self.price_matrix[:, 0] - norm_avg_price)
        else:
            price_score = 0.5 
            
        final_scores = (content_scores * 0.6) + (price_score * 0.3) + (self.popularity_scores * 0.1)
        
        # Optimized Ranking
        candidates_indices = final_scores.argsort()[::-1][:top_n*3]
        
        seen_base_names = set() 
        recommendations = []
        
        for i in candidates_indices:
            sku = self.idx_to_sku[i]
            if sku in liked_skus: continue
                
            p = self.products_map[sku]
            base_name = " ".join(p.name.split()[:2]).lower()
            if base_name in seen_base_names: continue
            seen_base_names.add(base_name)
            
            recommendations.append(p)
            if len(recommendations) >= top_n: break
                
        # Fallback
        if len(recommendations) < top_n:
            for i in final_scores.argsort()[::-1]:
                 if len(recommendations) >= top_n: break
                 sku = self.idx_to_sku[i]
                 if sku not in liked_skus and self.products_map[sku] not in recommendations:
                      recommendations.append(self.products_map[sku])
        
        return recommendations

    @lru_cache(maxsize=128)
    def _get_trending_cached(self, n: int) -> List[str]:
        # Returns SKUs to be pickleable/cacheable
        if self.popularity_scores is None:
             return list(self.products_map.keys())[:n]
             
        indices = self.popularity_scores.argsort()[::-1]
        # Return top 100 SKUs cached
        return [self.idx_to_sku[i] for i in indices[:100]]

    def _get_trending_products(self, n: int) -> List[Product]:
        """
        Return products sorted by popularity score.
        """
        cached_skus = self._get_trending_cached(100) # Get top 100
        
        if len(cached_skus) > n:
            chosen_skus = random.sample(cached_skus, n)
        else:
            chosen_skus = cached_skus[:n]
            
        return [self.products_map[s] for s in chosen_skus if s in self.products_map]

# Singleton
recommender = AdvancedRecommender()
