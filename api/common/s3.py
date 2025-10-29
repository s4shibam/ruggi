import boto3
from botocore.exceptions import ClientError
from mypy_boto3_s3.client import S3Client

from config.settings import (
    AWS_ACCESS_KEY_ID,
    AWS_S3_BUCKET,
    AWS_S3_REGION,
    AWS_SECRET_ACCESS_KEY,
)


def get_s3_client() -> S3Client:
    """Return a configured S3 client for the configured bucket."""
    if not AWS_S3_BUCKET:
        raise ValueError("AWS_S3_BUCKET not configured")

    return boto3.client(
        "s3",
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        region_name=AWS_S3_REGION,
    )


def _parse_storage_url(storage_url: str) -> tuple[str, str]:
    """
    Parse HTTPS storage URL and return (bucket, key).
    Format: https://bucket.s3.region.amazonaws.com/key
    """
    if not storage_url.startswith("https://"):
        raise ValueError(f"Storage URL must start with https://: {storage_url}")

    if ".amazonaws.com/" not in storage_url:
        raise ValueError(f"Invalid storage URL format: {storage_url}")

    key = storage_url.split(".amazonaws.com/", 1)[1]
    bucket = AWS_S3_BUCKET

    if not bucket:
        raise ValueError("AWS_S3_BUCKET not configured")

    return bucket, key


def get_storage_url(key: str) -> str:
    """Generate HTTPS storage URL for a given key."""
    if not AWS_S3_BUCKET:
        raise ValueError("AWS_S3_BUCKET not configured")

    region = AWS_S3_REGION or "us-east-1"
    return f"https://{AWS_S3_BUCKET}.s3.{region}.amazonaws.com/{key}"


def generate_presigned_upload_url(key: str, content_type: str, expires_in: int = 3600) -> str:
    """Generate a presigned URL for uploading a file to S3."""
    s3_client = get_s3_client()
    return s3_client.generate_presigned_url(
        ClientMethod="put_object",
        Params={
            "Bucket": AWS_S3_BUCKET,
            "Key": key,
            "ContentType": content_type,
        },
        ExpiresIn=expires_in,
    )


def download_file(storage_url: str) -> bytes:
    """Download file from S3 and return file data as bytes."""
    s3_client = get_s3_client()
    bucket, key = _parse_storage_url(storage_url)

    try:
        response = s3_client.get_object(Bucket=bucket, Key=key)
        return response["Body"].read()
    except ClientError as e:
        raise ValueError(f"S3 download failed for {storage_url}: {e}") from e


def delete_file(storage_url: str) -> None:
    """Delete file from S3."""
    s3_client = get_s3_client()
    bucket, key = _parse_storage_url(storage_url)

    try:
        s3_client.delete_object(Bucket=bucket, Key=key)
    except ClientError as e:
        raise ValueError(f"S3 delete failed for {storage_url}: {e}") from e
