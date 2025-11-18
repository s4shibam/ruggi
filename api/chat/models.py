import uuid

from django.conf import settings
from django.db import models
from django.db.models import Manager

from common.constants import CHAT_ROLE_CHOICES, MAX_TITLE_LENGTH


class ChatSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chat_sessions",
    )
    title = models.CharField(
        max_length=MAX_TITLE_LENGTH,
        null=True,
        blank=True,
        default=None,
    )
    attached_documents = models.ManyToManyField(
        "document.Document",
        blank=True,
        related_name="attached_to_sessions",
    )
    is_starred = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_message_at = models.DateTimeField(null=True, blank=True, default=None)

    messages: "Manager[ChatMessage]"

    class Meta:
        db_table = "chat_sessions"
        ordering = ["-last_message_at", "-updated_at"]

    def __str__(self):
        return self.title or f"Chat Session {self.id}"


class ChatMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name="messages")
    role = models.CharField(max_length=16, choices=CHAT_ROLE_CHOICES)
    content = models.TextField()
    metadata = models.JSONField(
        null=True,
        blank=True,
        default=None,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "chat_messages"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.role}: {self.content[:50]}..."
