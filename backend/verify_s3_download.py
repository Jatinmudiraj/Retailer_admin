from app.s3_service import generate_presigned_get_url
import requests

key = "products/SKU-200496/eb9e244e0e994d3d9ca259573b03a0aa.jpg"
url = generate_presigned_get_url(key)
print(f"Testing URL: {url}")
r = requests.get(url)
print(f"Status Code: {r.status_code}")
print(f"Content-Type: {r.headers.get('Content-Type')}")
if r.status_code != 200:
    print(f"Response Body: {r.text[:300]}")
