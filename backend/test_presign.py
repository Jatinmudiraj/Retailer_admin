from app.s3_service import generate_presigned_get_url, settings

print(f"Bucket: {settings.AWS_S3_BUCKET_NAME}")
key = "products/SKU-200496/eb9e244e0e994d3d9ca259573b03a0aa.jpg"
url = generate_presigned_get_url(key)
print(f"Generated URL: {url}")
