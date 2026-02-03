from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timedelta
from typing import Optional

import boto3
from botocore.exceptions import ClientError

from app.config import get_settings

settings = get_settings()


def _generate_object_key(sku: str, content_type: str) -> str:
    """
    Generate an immutable S3 object key.
    Format: products/{sku}/{uuid}.{ext}
    """
    ext_map = {
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
    }
    ext = ext_map.get(content_type, "jpg")
    unique_id = uuid.uuid4().hex
    return f"products/{sku}/{unique_id}.{ext}"


from botocore.client import Config

def _get_s3_client():
    """Create and return S3 client with credentials and SigV4 config."""
    if not all([settings.AWS_ACCESS_KEY_ID, settings.AWS_SECRET_ACCESS_KEY, 
                settings.AWS_S3_BUCKET_NAME]):
        raise ValueError("AWS S3 credentials not configured. Please set AWS_* environment variables.")
    
    if "your_" in settings.AWS_ACCESS_KEY_ID.lower() or "your_" in settings.AWS_S3_BUCKET_NAME.lower():
         raise ValueError("AWS S3 credentials appear to be placeholders. Please update .env with actual credentials.")
    
    # We force s3v4 to support newer regions like eu-north-1
    return boto3.client(
        's3',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
        config=Config(
            signature_version='s3v4',
            s3={'addressing_style': 'virtual'}
        )
    )



def generate_presigned_upload_url(sku: str, content_type: str, expires_in: int = 3600) -> dict:
    """
    Generate a presigned URL for direct client upload to S3.
    
    Args:
        sku: Product SKU for organizing files
        content_type: MIME type (e.g., 'image/jpeg')
        expires_in: URL expiration in seconds (default 1 hour)
        
    Returns:
        dict with 'url', 'key', 'expires_in'
    """
    s3_client = _get_s3_client()
    object_key = _generate_object_key(sku, content_type)
    
    try:
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': settings.AWS_S3_BUCKET_NAME,
                'Key': object_key,
                'ContentType': content_type,
            },
            ExpiresIn=expires_in
        )
        
        return {
            'url': presigned_url,
            'key': object_key,
            'expires_in': expires_in,
            'bucket': settings.AWS_S3_BUCKET_NAME
        }
    except ClientError as e:
        raise Exception(f"Failed to generate presigned URL: {str(e)}")


def verify_object_exists(key: str) -> bool:
    """
    Verify that an object exists in S3 using HEAD request.
    
    Args:
        key: S3 object key
        
    Returns:
        True if object exists, False otherwise
    """
    s3_client = _get_s3_client()
    
    try:
        s3_client.head_object(Bucket=settings.AWS_S3_BUCKET_NAME, Key=key)
        return True
    except ClientError as e:
        if e.response['Error']['Code'] == '404':
            return False
        raise Exception(f"Failed to verify object: {str(e)}")


def get_object_metadata(key: str) -> Optional[dict]:
    """
    Get object metadata (size, content-type, etc.) from S3.
    
    Args:
        key: S3 object key
        
    Returns:
        dict with metadata or None if not found
    """
    s3_client = _get_s3_client()
    
    try:
        response = s3_client.head_object(Bucket=settings.AWS_S3_BUCKET_NAME, Key=key)
        return {
            'content_type': response.get('ContentType'),
            'size': response.get('ContentLength'),
            'etag': response.get('ETag', '').strip('"'),
            'last_modified': response.get('LastModified')
        }
    except ClientError as e:
        if e.response['Error']['Code'] == '404':
            return None
        raise Exception(f"Failed to get object metadata: {str(e)}")


def delete_object_with_retry(key: str, max_retries: int = 3) -> bool:
    """
    Delete an object from S3 with exponential backoff retry.
    
    Args:
        key: S3 object key
        max_retries: Maximum number of retry attempts
        
    Returns:
        True if deleted successfully, False otherwise
    """
    s3_client = _get_s3_client()
    
    for attempt in range(max_retries):
        try:
            s3_client.delete_object(Bucket=settings.AWS_S3_BUCKET_NAME, Key=key)
            return True
        except ClientError as e:
            if attempt == max_retries - 1:
                raise Exception(f"Failed to delete object after {max_retries} attempts: {str(e)}")
            # Exponential backoff: 1s, 2s, 4s
            import time
            time.sleep(2 ** attempt)
    
    return False


def get_public_url(key: str) -> str:
    """
    Get the public URL for an S3 object.
    
    Args:
        key: S3 object key
        
    Returns:
        Public URL string
    """
    return f"https://{settings.AWS_S3_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"


def generate_presigned_get_url(key: str, expires_in: int = 3600) -> str:
    """
    Generate a presigned URL for downloading/viewing a private object.
    Use this if your bucket is private.
    
    Args:
        key: S3 object key
        expires_in: URL expiration in seconds
        
    Returns:
        Presigned GET URL
    """
    s3_client = _get_s3_client()
    
    try:
        presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': settings.AWS_S3_BUCKET_NAME,
                'Key': key,
            },
            ExpiresIn=expires_in
        )
        return presigned_url
    except ClientError as e:
        raise Exception(f"Failed to generate presigned GET URL: {str(e)}")


def upload_file_to_s3(file_content: bytes, content_type: str, sku: str) -> str:
    """
    Direct upload to S3 (legacy method, kept for backward compatibility).
    Prefer using presigned URLs for production.
    
    Args:
        file_content: Binary file content
        content_type: MIME type
        sku: Product SKU
        
    Returns:
        S3 object key
    """
    s3_client = _get_s3_client()
    object_key = _generate_object_key(sku, content_type)
    
    try:
        s3_client.put_object(
            Bucket=settings.AWS_S3_BUCKET_NAME,
            Key=object_key,
            Body=file_content,
            ContentType=content_type,
        )
        return object_key
    except ClientError as e:
        raise Exception(f"Failed to upload to S3: {str(e)}")


def calculate_checksum(file_content: bytes) -> str:
    """Calculate SHA256 checksum of file content."""
    return hashlib.sha256(file_content).hexdigest()
