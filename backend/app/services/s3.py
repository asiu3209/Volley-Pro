import boto3
from app.core.config import (
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_BUCKET_NAME,
    AWS_REGION,
    AWS_ENDPOINT_URL,
)

s3 = boto3.client(
    "s3",
    aws_access_key_id = AWS_ACCESS_KEY_ID,
    aws_secret_access_key = AWS_SECRET_ACCESS_KEY,
    region_name = AWS_REGION,
    endpoint_url = AWS_ENDPOINT_URL,
)

s3.create_bucket(Bucket=AWS_BUCKET_NAME) #Make bucket or check if it already exists in localstack

# Generate a presigned URL to allow frontend to upload video directly
def generate_presigned_upload_url(key: str):
    return s3.generate_presigned_url(
        ClientMethod="put_object",
        Params={
            "Bucket":AWS_BUCKET_NAME,
            "Key": key,
            "ContentType" : "video/mp4",
        },
        ExpiresIn=3600,
    )