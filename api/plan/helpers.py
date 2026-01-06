from datetime import datetime, timezone

from common.constants import PLAN_LIMITS, PLAN_TYPE_PRO

from .models import Plan


def get_total_documents(plan: Plan) -> int:
    """Get total document limit for the plan"""
    return PLAN_LIMITS[plan.plan_type]["documents"]


def get_total_chats(plan: Plan) -> int:
    """Get total chat limit for the plan"""
    return PLAN_LIMITS[plan.plan_type]["chats"]


def get_documents_used(plan: Plan) -> int:
    """Get number of documents used"""
    total = get_total_documents(plan)
    return total - plan.remaining_documents


def get_chats_used(plan: Plan) -> int:
    """Get number of chats used"""
    total = get_total_chats(plan)
    return total - plan.remaining_chats


def can_add_document(plan: Plan) -> bool:
    """Check if user can add a document"""
    return plan.remaining_documents > 0


def can_add_chat(plan: Plan) -> bool:
    """Check if user can add a chat"""
    return plan.remaining_chats > 0


def deduct_document(plan: Plan) -> bool:
    """
    Deduct one document from remaining limit.
    Returns True if successful, False if no limit remaining.
    """
    if plan.remaining_documents <= 0:
        return False
    plan.remaining_documents -= 1
    plan.save(update_fields=["remaining_documents", "updated_at"])
    return True


def deduct_chat(plan: Plan) -> bool:
    """
    Deduct one chat from remaining limit.
    Returns True if successful, False if no limit remaining.
    """
    if plan.remaining_chats <= 0:
        return False
    plan.remaining_chats -= 1
    plan.save(update_fields=["remaining_chats", "updated_at"])
    return True


def reset_limits(plan: Plan) -> None:
    """
    Reset limits to plan defaults.
    For Pro plans, this happens monthly. For Free plans, only on upgrade.
    """
    plan.remaining_documents = get_total_documents(plan)
    plan.remaining_chats = get_total_chats(plan)
    plan.last_reset_at = datetime.now(timezone.utc)
    plan.save(
        update_fields=["remaining_documents", "remaining_chats", "last_reset_at", "updated_at"]
    )


def check_and_reset_if_needed(plan: Plan) -> bool:
    """
    For Pro plans, check if a month has passed since last reset.
    If so, reset limits. Returns True if reset was performed.
    """
    if plan.plan_type != PLAN_TYPE_PRO:
        return False

    if not plan.last_reset_at:
        # First time setup, just set the timestamp
        plan.last_reset_at = datetime.now(timezone.utc)
        plan.save(update_fields=["last_reset_at", "updated_at"])
        return False

    now = datetime.now(timezone.utc)
    days_since_reset = (now - plan.last_reset_at).days

    # Reset if 30 days have passed
    if days_since_reset >= 30:
        reset_limits(plan)
        return True

    return False
