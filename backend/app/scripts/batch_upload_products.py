import asyncio
import csv
import os
import sys
import logging
import mimetypes
import random
from datetime import datetime

# Add the backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
sys.path.append(backend_dir)

from app.db import init_db
from app.models import Product, ProductImage
from app.s3_service import upload_file_to_s3
from app.config import get_settings

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Constants
SOURCE_DIR = r"d:/project/sachin/For ML model only-20251205T190040Z-1-001/For ML model only/files for ML training"
MAX_PER_CATEGORY = 50
SIMULATE_Multiple_IMAGES = 3  # Number of images to create per product (1 main + 2 dupes)
GOLD_RATE_PER_GRAM = 7200.0   # Approx rate
MAKING_CHARGES_PERCENT = 0.15 

def clean_sku(filename):
    """Generate a clean SKU from filename."""
    name, _ = os.path.splitext(filename)
    return name.replace(" ", "_").replace("(", "").replace(")", "")

def parse_weight(weight_str):
    """Parse weight string like '4-7g' to a float average."""
    try:
        if not weight_str:
            return None
        weight_str = str(weight_str).lower().replace('g', '').strip()
        if '-' in weight_str:
            parts = weight_str.split('-')
            low = float(parts[0])
            high = float(parts[1])
            return (low + high) / 2
        return float(weight_str)
    except Exception:
        return None

async def process_csv_smart(csv_path, root_dir, global_counts):
    logger.info(f"Analyzing CSV: {csv_path}")
    
    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        
    if not rows:
        return

    # Heuristic to find image directory
    sample_filename = rows[0].get('Filename')
    found_image_dir = root_dir
    
    if sample_filename:
        if os.path.exists(os.path.join(root_dir, sample_filename)):
            found_image_dir = root_dir
        else:
            # Check subdirectories
            try:
                for d in os.listdir(root_dir):
                    d_path = os.path.join(root_dir, d)
                    if os.path.isdir(d_path):
                        if os.path.exists(os.path.join(d_path, sample_filename)):
                            found_image_dir = d_path
                            break
            except Exception as e:
                logger.warning(f"Error searching for images in {root_dir}: {e}")
    
    logger.info(f"Using image directory: {found_image_dir}")
    
    # Process rows
    for row in rows:
        filename = row.get('Filename')
        if not filename:
            continue
            
        sku = clean_sku(filename)
        
        # Check existing
        existing = await Product.find_one(Product.sku == sku)
        if existing:
            # Skip if already exists
            continue
            
        # Category limit check
        category = row.get('Class') or "Uncategorized"
        category = category.strip()
        
        current_count = global_counts.get(category, 0)
        if current_count >= MAX_PER_CATEGORY:
            continue
            
        # Parse Details
        weight_str = row.get('Est Weight')
        weight_g = parse_weight(weight_str)
        if not weight_g:
            weight_g = random.uniform(5.0, 15.0) # Fallback random weight if missing

        # Price Calculation
        price = weight_g * GOLD_RATE_PER_GRAM * (1 + MAKING_CHARGES_PERCENT)
        price = round(price, 2)
        
        metal = row.get('Metal', 'Gold').strip()
        color = row.get('Color', 'Yellow').strip()
        main_stone = row.get('Main Stone', '').strip()
        pattern = row.get('Pattern', '').strip()
        item_desc = row.get('Visual Description', '').strip()
        style_era = row.get('Style Era', '').strip()
        occasion = row.get('Occasion', '').strip()
        
        full_name = f"{color} {metal} {category} - {pattern}"
        if main_stone and main_stone.lower() != "none" and main_stone != "N/A":
            full_name += f" with {main_stone}"
            
        # Clean tags
        raw_tags = [metal, color, main_stone, pattern, style_era, occasion, category]
        tags = list(set([t for t in raw_tags if t and t.lower() not in ["none", "n/a"]]))
        
        # Create Product
        product = Product(
            sku=sku,
            name=full_name,
            description=item_desc,
            category=category,
            subcategory=row.get('Gender', 'Women'),
            weight_g=weight_g,
            stock_type="physical",
            qty=1,
            price=price,
            tags=tags,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            is_archived=False,
            options={"metal": metal, "color": color}
        )
        
        # Image Processing
        image_path = os.path.join(found_image_dir, filename)
        
        if os.path.exists(image_path):
            try:
                mime_type, _ = mimetypes.guess_type(image_path)
                if not mime_type: mime_type = "application/octet-stream"
                
                with open(image_path, 'rb') as img_f:
                    content = img_f.read()
                
                # Upload multiple times to simulate gallery
                for i in range(SIMULATE_Multiple_IMAGES):
                    s3_key = upload_file_to_s3(content, mime_type, sku)
                    
                    is_p = (i == 0) # First one is primary
                    status = "active" # Lowercase matching my previous script, but Model default is "ACTIVE"
                    
                    img_doc = ProductImage(
                        sku=sku,
                        s3_key=s3_key,
                        upload_status="ACTIVE",
                        is_primary=is_p,
                        content_type=mime_type,
                        file_size=len(content)
                    )
                    await img_doc.insert()
                    
                # Increment count only after successful product & image insertion
                global_counts[category] = global_counts.get(category, 0) + 1
                await product.insert()
                # logger.info(f"Imported {sku} ({category})")
                
            except Exception as e:
                logger.error(f"Failed to process image/upload for {sku}: {e}")
        else:
             logger.warning(f"Image missing for {sku} at {image_path}")

    logger.info(f"Processed CSV: {csv_path}. Category counts: {global_counts}")

async def main():
    logger.info("Starting Batch Import (Max 50 per category)...")
    await init_db()
    
    global_counts = {}
    
    # Walk through source directory
    for root, dirs, files in os.walk(SOURCE_DIR):
        for file in files:
            if file.lower().endswith('.csv'):
                csv_path = os.path.join(root, file)
                await process_csv_smart(csv_path, root, global_counts)
                
    logger.info("Batch Import Complete.")
    logger.info(f"Final Counts: {global_counts}")

if __name__ == "__main__":
    asyncio.run(main())
