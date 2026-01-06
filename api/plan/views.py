import logging
from typing import Any

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from rest_framework import status

from common.constants import PLAN_TYPE_PRO, SUCCESS_RETRIEVED
from common.types import AuthenticatedHttpRequest

from .helpers import (
    check_and_reset_if_needed,
    get_chats_used,
    get_documents_used,
    get_total_chats,
    get_total_documents,
)
from .models import Plan

logger = logging.getLogger(__name__)


@login_required
@require_GET
def get_usage(request: AuthenticatedHttpRequest) -> JsonResponse:
    """
    Get current user's plan and usage information.
    Returns plan type, limits, remaining usage, and percentages.
    """
    try:
        plan = request.user.plan
    except Plan.DoesNotExist:
        return JsonResponse(
            {"message": "No plan found for user. Please contact support."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Check and reset limits if needed (for Pro plans)
    was_reset = check_and_reset_if_needed(plan)
    if was_reset:
        logger.info(f"Plan limits reset for user {request.user.id}")

    total_documents = get_total_documents(plan)
    total_chats = get_total_chats(plan)
    documents_used = get_documents_used(plan)
    chats_used = get_chats_used(plan)

    data: dict[str, Any] = {
        "plan_type": plan.plan_type,
        "documents": {
            "total": total_documents,
            "used": documents_used,
            "remaining": plan.remaining_documents,
            "percentage_used": round((documents_used / total_documents) * 100, 1)
            if total_documents > 0
            else 0,
        },
        "chats": {
            "total": total_chats,
            "used": chats_used,
            "remaining": plan.remaining_chats,
            "percentage_used": round((chats_used / total_chats) * 100, 1) if total_chats > 0 else 0,
        },
        "last_reset_at": plan.last_reset_at.isoformat() if plan.last_reset_at else None,
        "is_monthly_reset": plan.plan_type == PLAN_TYPE_PRO,
    }

    return JsonResponse(
        {
            "message": SUCCESS_RETRIEVED.format("Usage information"),
            "data": data,
        },
        status=status.HTTP_200_OK,
    )
