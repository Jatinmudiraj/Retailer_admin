# AWS S3 Setup Guide

This guide covers the complete setup for production-ready S3 image storage.

## Prerequisites

- AWS Account
- AWS CLI installed (optional, for testing)
- Admin access to create IAM users/roles and S3 buckets

---

## 1. Create S3 Bucket

1. Go to [AWS S3 Console](https://console.aws.amazon.com/s3/)
2. Click **Create bucket**
3. Configure:
   - **Bucket name**: `your-app-images` (must be globally unique)
   - **Region**: Choose closest to your users (e.g., `ap-south-1` for Mumbai)
   - **Block Public Access**: ✅ **Keep ON** (we'll use presigned URLs for access)
   - **Versioning**: Optional (recommended for production)
   - **Encryption**: Enable (SSE-S3 or SSE-KMS)

---

## 2. Configure CORS (for browser uploads)

Add this CORS configuration to your bucket:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["PUT", "POST", "GET"],
        "AllowedOrigins": [
            "http://localhost:5173",
            "https://yourdomain.com"
        ],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3000
    }
]
```

**Steps:**
1. Go to your bucket → **Permissions** tab
2. Scroll to **Cross-origin resource sharing (CORS)**
3. Click **Edit** and paste the JSON above
4. Update `AllowedOrigins` with your actual frontend domains

---

## 3. Create IAM User (Least Privilege)

### Option A: IAM User with Access Keys (Development)

1. Go to [IAM Console](https://console.aws.amazon.com/iam/)
2. **Users** → **Create user**
3. User name: `royaliq-s3-uploader`
4. **Attach policies directly** → Create inline policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "S3ImageOperations",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:HeadObject"
            ],
            "Resource": "arn:aws:s3:::your-app-images/products/*"
        },
        {
            "Sid": "S3BucketAccess",
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": "arn:aws:s3:::your-app-images",
            "Condition": {
                "StringLike": {
                    "s3:prefix": "products/*"
                }
            }
        }
    ]
}
```

5. Create access key → **Application running outside AWS**
6. Save `Access Key ID` and `Secret Access Key`

### Option B: IAM Role (Production - EC2/ECS)

If running on AWS infrastructure, use IAM roles instead of access keys:

1. Create role with same policy as above
2. Attach role to EC2 instance / ECS task
3. No need for access keys in `.env`

---

## 4. Configure Lifecycle Rules

Save costs by cleaning up incomplete uploads:

1. Go to bucket → **Management** tab
2. **Create lifecycle rule**
3. Configure:
   - **Rule name**: `cleanup-incomplete-uploads`
   - **Rule scope**: Apply to all objects
   - **Lifecycle rule actions**: ✅ **Delete expired object delete markers or incomplete multipart uploads**
   - **Days after initiation**: `7`

---

## 5. Set Up Bucket Policy (Public Read - Optional)

> [!WARNING]
> Only do this if you want images to be **publicly accessible** without presigned URLs.
> For private images, skip this step and use presigned GET URLs.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::your-app-images/products/*"
        }
    ]
}
```

**Steps:**
1. Bucket → **Permissions** → **Bucket policy**
2. Paste JSON above
3. Replace `your-app-images` with your bucket name
4. You'll also need to **uncheck "Block all public access"** for this specific use case

---

## 6. Update `.env` File

Add these to your backend `.env`:

```bash
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=ap-south-1
AWS_S3_BUCKET_NAME=your-app-images
```

---

## 7. Test S3 Connection

Run this Python script to test:

```python
import boto3
from app.config import get_settings

settings = get_settings()

s3 = boto3.client(
    's3',
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    region_name=settings.AWS_REGION
)

# Test upload
s3.put_object(
    Bucket=settings.AWS_S3_BUCKET_NAME,
    Key='test/hello.txt',
    Body=b'Hello from RoyalIQ!'
)

print("✅ S3 connection successful!")
```

---

## 8. Run Deletion Worker (Background Task)

The deletion worker processes the queue to safely delete old images.

### Option A: Manual (Development)

```bash
cd backend
venv\Scripts\python -m workers.deletion_worker
```

### Option B: Systemd Service (Linux Production)

Create `/etc/systemd/system/royaliq-deletion-worker.service`:

```ini
[Unit]
Description=RoyalIQ S3 Deletion Worker
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/backend
ExecStart=/path/to/venv/bin/python -m workers.deletion_worker
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable royaliq-deletion-worker
sudo systemctl start royaliq-deletion-worker
```

### Option C: Windows Service (Windows Production)

Use `NSSM` (Non-Sucking Service Manager):

```powershell
nssm install RoyalIQDeletionWorker "C:\path\to\venv\Scripts\python.exe" "-m workers.deletion_worker"
nssm set RoyalIQDeletionWorker AppDirectory "C:\path\to\backend"
nssm start RoyalIQDeletionWorker
```

---

## 9. Monitoring & Alerts

### CloudWatch Metrics

Monitor these S3 metrics:
- `NumberOfObjects` - Track storage growth
- `BucketSizeBytes` - Monitor costs
- `4xxErrors` / `5xxErrors` - Catch issues

### Database Monitoring

Query deletion queue backlog:

```sql
SELECT COUNT(*) as backlog, 
       AVG(attempts) as avg_attempts
FROM s3_deletion_queue
WHERE attempts < max_attempts;
```

Set up alerts if backlog > 100 items.

---

## 10. Cost Optimization

### S3 Storage Classes

For infrequently accessed images:
- Use **S3 Intelligent-Tiering** (auto-moves to cheaper storage)
- Or create lifecycle rule to move to **S3 Standard-IA** after 30 days

### Request Costs

- **PUT/POST**: ~$0.005 per 1,000 requests
- **GET**: ~$0.0004 per 1,000 requests
- **Data Transfer OUT**: First 100GB free/month, then ~$0.09/GB

**Tip**: Use CloudFront CDN to reduce GET requests and data transfer costs.

---

## Security Checklist

- ✅ Use least-privilege IAM policies
- ✅ Enable S3 bucket encryption
- ✅ Enable S3 access logging
- ✅ Use presigned URLs (not public bucket) for sensitive images
- ✅ Rotate access keys regularly
- ✅ Enable MFA Delete for production buckets
- ✅ Set up AWS CloudTrail for audit logs

---

## Troubleshooting

### "Access Denied" errors

- Check IAM policy has correct permissions
- Verify bucket name in `.env` matches actual bucket
- Ensure CORS is configured if uploading from browser

### Images not displaying

- Check bucket policy allows public read (if using public URLs)
- Verify S3 key is correct in database
- Test presigned URL expiration (default 1 hour)

### Deletion worker not processing

- Check worker is running (`ps aux | grep deletion_worker`)
- Verify AWS credentials in `.env`
- Check `s3_deletion_queue` table for errors in `last_error` column
