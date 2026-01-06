import uuid

from django.db import models

from common.constants import PLAN_TYPE_CHOICES, PLAN_TYPE_FREE
from user.models import User


class Plan(models.Model):
    """
    Tracks user plan and usage limits.
    - Free plan: Lifetime limits (10 documents, 50 chat messages)
    - Pro plan: Monthly limits (75 documents, 750 chat messages) that reset
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="plan", db_index=True)
    plan_type = models.CharField(
        max_length=20, choices=PLAN_TYPE_CHOICES, default=PLAN_TYPE_FREE, db_index=True
    )

    # Remaining limits
    remaining_documents = models.IntegerField(default=0)
    remaining_chats = models.IntegerField(default=0)

    # Track when the plan last reset (for Pro monthly resets)
    last_reset_at = models.DateTimeField(null=True, blank=True, default=None)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "plan"

    def __str__(self):
        return f"{self.plan_type.title()} plan for {self.user.email}"
