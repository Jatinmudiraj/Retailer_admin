import boto3
from app.s3_service import settings

s3 = boto3.client(
    's3',
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    region_name=settings.AWS_REGION
)

prefix = "products/SKU-200496/"
print(f"Listing objects in {settings.AWS_S3_BUCKET_NAME} with prefix {prefix}")

try:
    response = s3.list_objects_v2(Bucket=settings.AWS_S3_BUCKET_NAME, Prefix=prefix)
    if 'Contents' in response:
        for obj in response['Contents']:
            print(f" - {obj['Key']} (Size: {obj['Size']})")
    else:
        print("No objects found.")
except Exception as e:
    print(f"Error: {e}")
