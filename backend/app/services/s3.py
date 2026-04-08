# backend/app/services/s3.py
import boto3
from botocore.exceptions import ClientError
from app.core.config import (
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_BUCKET_NAME,
    AWS_REGION,
    USE_LOCALSTACK,
    LOCALSTACK_ENDPOINT
)

# Connect to S3
def get_s3_client():
    if USE_LOCALSTACK:
        return boto3.client(
            "s3",
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            region_name=AWS_REGION,
            endpoint_url=LOCALSTACK_ENDPOINT
        )
    return boto3.client(
        "s3",
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        region_name=AWS_REGION
    )

s3 = get_s3_client()

# Function to ensure bucket exists
def ensure_bucket():
    if not AWS_BUCKET_NAME:
        raise ValueError("AWS_BUCKET_NAME is not defined!")
    try:
        s3.head_bucket(Bucket=AWS_BUCKET_NAME)
    except ClientError:
        s3.create_bucket(Bucket=AWS_BUCKET_NAME)

# Function to generate presigned URL
def generate_presigned_upload_url(key: str, expiration: int = 3600):
    if not key:
        raise ValueError("Key must be provided")
    # Ensure bucket exists when generating URL
    ensure_bucket()
    return s3.generate_presigned_url(
        "put_object",
        Params={"Bucket": AWS_BUCKET_NAME, "Key": key},
        ExpiresIn=expiration
    )