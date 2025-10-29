# Pagination
DEFAULT_PAGE_NUMBER = 1
DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 100

# Field Max Lengths
MAX_TITLE_LENGTH = 255
MAX_FULL_NAME_LENGTH = 255
MAX_EMAIL_LENGTH = 255
MAX_AVATAR_URL_LENGTH = 1024
MAX_STYLE_PREFERENCES_LENGTH = 1024
MAX_OCCUPATION_LENGTH = 255
MAX_NICKNAME_LENGTH = 64
MAX_STORAGE_URL_LENGTH = 2048

# Document Statuses
DOC_STATUS_QUEUED = "queued"
DOC_STATUS_PROCESSING = "processing"
DOC_STATUS_COMPLETED = "completed"
DOC_STATUS_FAILED = "failed"

DOCUMENT_STATUS_CHOICES = [
    (DOC_STATUS_QUEUED, "Queued"),
    (DOC_STATUS_PROCESSING, "Processing"),
    (DOC_STATUS_COMPLETED, "Completed"),
    (DOC_STATUS_FAILED, "Failed"),
]

# Document Sources
DOC_SOURCE_UPLOAD = "upload"
DOC_SOURCE_URL = "url"
DOC_SOURCE_INTERNAL = "internal"

DOCUMENT_SOURCE_CHOICES = [
    (DOC_SOURCE_UPLOAD, "Upload"),
    (DOC_SOURCE_URL, "URL"),
    (DOC_SOURCE_INTERNAL, "Internal"),
]

# Document Types
DOC_TYPE_PDF = "pdf"
DOC_TYPE_DOCX = "docx"
DOC_TYPE_TXT = "txt"
DOC_TYPE_MD = "md"
DOC_TYPE_HTML = "html"
DOC_TYPE_OTHER = "other"

DOCUMENT_TYPE_CHOICES = [
    (DOC_TYPE_PDF, "PDF"),
    (DOC_TYPE_DOCX, "Word Document"),
    (DOC_TYPE_TXT, "Text"),
    (DOC_TYPE_MD, "Markdown"),
    (DOC_TYPE_HTML, "HTML"),
    (DOC_TYPE_OTHER, "Other"),
]

DOCUMENT_TYPE_MAP = {
    "pdf": DOC_TYPE_PDF,
    "txt": DOC_TYPE_TXT,
    "md": DOC_TYPE_MD,
    "html": DOC_TYPE_HTML,
}

# Supported document types for upload
SUPPORTED_DOCUMENT_TYPES = [DOC_TYPE_PDF, DOC_TYPE_TXT, DOC_TYPE_MD, DOC_TYPE_HTML]

# Chat Roles
CHAT_ROLE_USER = "user"
CHAT_ROLE_ASSISTANT = "assistant"

CHAT_ROLE_CHOICES = [
    (CHAT_ROLE_USER, "User"),
    (CHAT_ROLE_ASSISTANT, "Assistant"),
]

# Chunk Processing
DEFAULT_CHUNK_SIZE = 2000
DEFAULT_CHUNK_OVERLAP = 400
CHUNK_PREVIEW_LENGTH = 200

# LLM & AI Configuration
LLM_MODEL_NAME = "gpt-4o-mini"
EMBEDDING_MODEL_NAME = "text-embedding-3-small"
LLM_TEMPERATURE = 0.2
LLM_MAX_TOOL_CALLS = 10

# Context Window Management - Simple approach
MAX_CONTEXT_TOKENS = 50000  # Conservative limit for all messages
MODEL_NAME_FOR_TOKENS = "gpt-4o"  # For token counting

# Safety limits for full document retrieval
MAX_FULL_DOCUMENT_CHARS = 200000  # ~50k tokens
WARN_FULL_DOCUMENT_CHARS = 100000  # ~25k tokens

# Embedding
OPENAI_EMBEDDING_DIMENSION = 256

# Document Summary
SUMMARY_MAX_TOKENS = 300
SUMMARY_TEMPERATURE = 0.3
SUMMARY_CHUNKS_TO_USE = 10  # Number of chunks to use for summary generation

# Title Generation
TITLE_MAX_TOKENS = 32
TITLE_TEMPERATURE = 0.3

# File Upload Limits
MAX_FILE_SIZE_MB = 10
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

# Google OAuth
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
GOOGLE_OAUTH_SCOPE = "openid email profile"

# Standard Error Messages
ERROR_INVALID_JSON = "Invalid JSON format"
ERROR_INVALID_UUID = "Invalid {} ID format"
ERROR_NOT_AUTHORIZED = "You are not authorized to access this {}"
ERROR_NOT_FOUND = "Invalid or non-existent {} ID"
ERROR_FIELD_REQUIRED = "{} is required"
ERROR_FIELD_EMPTY = "{} cannot be empty"
ERROR_FIELD_TOO_LONG = "{} too long (max {} characters)"
ERROR_FIELD_INVALID_TYPE = "{} must be a {}"
ERROR_NO_FILE_PROVIDED = "No file provided"
ERROR_FILE_TYPE_NOT_SUPPORTED = "Only {} files are currently supported"
ERROR_FILE_TOO_LARGE = "File size exceeds the maximum limit of {} MB"
ERROR_GOOGLE_OAUTH_NOT_CONFIGURED = "Google OAuth not configured"
ERROR_PROCESSING_FAILED = "{} processing failed: {}"

# Standard Success Messages
SUCCESS_RETRIEVED = "{} retrieved successfully"
SUCCESS_CREATED = "{} created successfully"
SUCCESS_UPDATED = "{} updated successfully"
SUCCESS_DELETED = "{} deleted successfully"
SUCCESS_UPLOADED_AND_PROCESSED = "{} uploaded successfully and queued for processing"
