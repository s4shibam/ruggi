from django.db.models.signals import post_save
from django.dispatch import receiver

from common.constants import PLAN_LIMITS, PLAN_TYPE_FREE
from user.models import User

from .models import Plan


@receiver(post_save, sender=User)
def create_user_plan(sender, instance, created, **kwargs):
    """
    Automatically create a Free plan for new users upon account creation.
    """
    if created:
        Plan.objects.get_or_create(
            user=instance,
            defaults={
                "plan_type": PLAN_TYPE_FREE,
                "remaining_documents": PLAN_LIMITS[PLAN_TYPE_FREE]["documents"],
                "remaining_chats": PLAN_LIMITS[PLAN_TYPE_FREE]["chats"],
            },
        )

