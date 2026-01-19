from typing import List, Dict
import numpy as np
import re
from app.models import Product

# Try importing gensim, handle if missing
try:
    from gensim.models import Word2Vec
    from gensim.utils import simple_preprocess
    GENSIM_AVAILABLE = True
except ImportError:
    GENSIM_AVAILABLE = False
    print("WARNING: Gensim not installed. Semantic recommendations will be disabled.")


class ContentBasedRecommender:
    def __init__(self):
        self.model = None
        self.product_vectors = {}
        self.sku_to_index = {}
        self.index_to_sku = {}

    def fit(self, products: List[Product]):
        """
        Train Word2Vec model on product descriptions/names.
        """
        if not products or not GENSIM_AVAILABLE:
            return

        # 1. Prepare corpus
        # We treat each product as a "sentence" or combine fields
        corpus = []
        self.sku_to_index = {}
        self.index_to_sku = {}
        
        for idx, p in enumerate(products):
            self.sku_to_index[p.sku] = idx
            self.index_to_sku[idx] = p.sku
            
            # Combine text
            text = f"{p.name} {p.category or ''} {p.subcategory or ''} {p.description or ''}"
            # Tokenize
            tokens = simple_preprocess(text)
            corpus.append(tokens)

        # 2. Train Word2Vec
        # vector_size=100, window=5, min_count=1, workers=4
        self.model = Word2Vec(sentences=corpus, vector_size=50, window=5, min_count=1, workers=1, epochs=20)
        
        # 3. Compute Product Vectors (Average of word vectors)
        self.product_vectors = {}
        for p in products:
            text = f"{p.name} {p.category or ''} {p.subcategory or ''} {p.description or ''}"
            tokens = simple_preprocess(text)
            if not tokens:
                continue
            
            # Get valid vectors
            vectors = [self.model.wv[word] for word in tokens if word in self.model.wv]
            if vectors:
                self.product_vectors[p.sku] = np.mean(vectors, axis=0)
    
    def get_recommendations(self, sku: str, top_n: int = 5) -> List[str]:
        """
        Find products with highest cosine similarity between average vectors.
        """
        if not self.model or sku not in self.product_vectors:
            return []
        
        target_vec = self.product_vectors[sku]
        
        scores = []
        for other_sku, vec in self.product_vectors.items():
            if other_sku == sku:
                continue
            
            # Cosine similarity
            dot = np.dot(target_vec, vec)
            norm_a = np.linalg.norm(target_vec)
            norm_b = np.linalg.norm(vec)
            if norm_a == 0 or norm_b == 0:
                sim = 0
            else:
                sim = dot / (norm_a * norm_b)
            
            scores.append((other_sku, sim))
        
        # Sort desc
        scores.sort(key=lambda x: x[1], reverse=True)
        
        return [s[0] for s in scores[:top_n]]
