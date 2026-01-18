"""
S3 Deletion Queue Worker

This worker processes the S3 deletion queue, safely deleting objects
from S3 with retry logic and exponential backoff.

Run this as a background task or cron job:
    python -m workers.deletion_worker
"""

from __future__ import annotations

import time
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.models import S3DeletionQueue
from app.s3_service import delete_object_with_retry

settings = get_settings()


def process_deletion_queue(db: Session, batch_size: int = 10):
    """
    Process items from the S3 deletion queue.
    
    Args:
        db: Database session
        batch_size: Number of items to process per batch
    """
    now = datetime.utcnow()
    
    # Fetch items ready for processing
    items = (
        db.query(S3DeletionQueue)
        .filter(S3DeletionQueue.next_retry_at <= now)
        .filter(S3DeletionQueue.attempts < S3DeletionQueue.max_attempts)
        .limit(batch_size)
        .all()
    )
    
    if not items:
        print(f"[{now}] No items in deletion queue")
        return 0
    
    print(f"[{now}] Processing {len(items)} items from deletion queue")
    
    processed = 0
    for item in items:
        try:
            # Attempt deletion
            success = delete_object_with_retry(item.key, max_retries=1)
            
            if success:
                # Delete from queue
                db.delete(item)
                processed += 1
                print(f"  ✓ Deleted: {item.key}")
            else:
                # Update retry info
                item.attempts += 1
                item.next_retry_at = now + timedelta(minutes=2 ** item.attempts)
                item.last_error = "Deletion failed"
                print(f"  ✗ Failed: {item.key} (attempt {item.attempts}/{item.max_attempts})")
                
        except Exception as e:
            # Update retry info
            item.attempts += 1
            item.next_retry_at = now + timedelta(minutes=2 ** item.attempts)
            item.last_error = str(e)
            print(f"  ✗ Error: {item.key} - {str(e)}")
    
    db.commit()
    print(f"[{now}] Processed {processed}/{len(items)} successfully")
    return processed


def run_worker(interval_seconds: int = 300):
    """
    Run the deletion worker in a loop.
    
    Args:
        interval_seconds: Time to wait between processing batches (default 5 minutes)
    """
    print(f"Starting S3 deletion worker (interval: {interval_seconds}s)")
    
    while True:
        try:
            db = next(get_db())
            process_deletion_queue(db)
            db.close()
        except Exception as e:
            print(f"Worker error: {str(e)}")
        
        time.sleep(interval_seconds)


if __name__ == "__main__":
    # Run worker with 5-minute interval
    run_worker(interval_seconds=300)
