import json
from typing import Any, Optional, cast

from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_http_methods
from rest_framework import status

from common.constants import (
    ERROR_FIELD_EMPTY,
    ERROR_FIELD_TOO_LONG,
    ERROR_INVALID_JSON,
    MAX_FULL_NAME_LENGTH,
    MAX_NICKNAME_LENGTH,
    MAX_OCCUPATION_LENGTH,
    MAX_STYLE_PREFERENCES_LENGTH,
    SUCCESS_DELETED,
    SUCCESS_RETRIEVED,
    SUCCESS_UPDATED,
)

from .models import User, UserPersonalization


def _serialize_user(user: User) -> dict[str, Any]:
    try:
        personalization: UserPersonalization = user.personalization
        personalization_data: dict[str, Optional[str]] = {
            "style_preferences": personalization.style_preferences,
            "occupation": personalization.occupation,
            "nick_name": personalization.nick_name,
        }
    except UserPersonalization.DoesNotExist:
        personalization_data = {
            "style_preferences": None,
            "occupation": None,
            "nick_name": None,
        }

    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "avatar": user.avatar,
        "personalization": personalization_data,
    }


@require_GET
@ensure_csrf_cookie
def get_user_profile(request: HttpRequest) -> JsonResponse:
    if not request.user.is_authenticated:
        return JsonResponse(
            {"message": "Not authenticated", "data": None},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    user: User = cast(User, request.user)

    return JsonResponse(
        {
            "message": SUCCESS_RETRIEVED.format("User profile"),
            "data": _serialize_user(user),
        },
        status=status.HTTP_200_OK,
    )


@login_required
@csrf_exempt
@require_http_methods(["PUT", "PATCH"])
def update_user_profile(request: HttpRequest) -> JsonResponse:
    user: User = cast(User, request.user)

    try:
        data: dict[str, Any] = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"message": ERROR_INVALID_JSON}, status=status.HTTP_400_BAD_REQUEST)

    if "full_name" in data:
        full_name: str = data["full_name"]
        if not full_name or not full_name.strip():
            return JsonResponse(
                {"message": ERROR_FIELD_EMPTY.format("Full name")},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(full_name) > MAX_FULL_NAME_LENGTH:
            return JsonResponse(
                {"message": ERROR_FIELD_TOO_LONG.format("Full name", MAX_FULL_NAME_LENGTH)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.full_name = full_name.strip()

    if "avatar" in data:
        user.avatar = data["avatar"] or None

    user.save()

    personalization: UserPersonalization
    personalization, _created = UserPersonalization.objects.get_or_create(user=user)

    if "personalization" in data and isinstance(data["personalization"], dict):
        personalization_data: dict[str, Any] = data["personalization"]

        if "style_preferences" in personalization_data:
            style_pref: Optional[str] = personalization_data["style_preferences"]
            if style_pref and len(style_pref) > MAX_STYLE_PREFERENCES_LENGTH:
                return JsonResponse(
                    {
                        "message": ERROR_FIELD_TOO_LONG.format(
                            "Style preferences", MAX_STYLE_PREFERENCES_LENGTH
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            personalization.style_preferences = style_pref or None

        if "occupation" in personalization_data:
            occupation: Optional[str] = personalization_data["occupation"]
            if occupation and len(occupation) > MAX_OCCUPATION_LENGTH:
                return JsonResponse(
                    {"message": ERROR_FIELD_TOO_LONG.format("Occupation", MAX_OCCUPATION_LENGTH)},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            personalization.occupation = occupation or None

        if "nick_name" in personalization_data:
            nick_name: Optional[str] = personalization_data["nick_name"]
            if nick_name and len(nick_name) > MAX_NICKNAME_LENGTH:
                return JsonResponse(
                    {"message": ERROR_FIELD_TOO_LONG.format("Nickname", MAX_NICKNAME_LENGTH)},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            personalization.nick_name = nick_name or None

        personalization.save()

    return JsonResponse(
        {
            "message": SUCCESS_UPDATED.format("User profile"),
            "data": _serialize_user(user),
        },
        status=status.HTTP_200_OK,
    )


@login_required
@csrf_exempt
@require_http_methods(["DELETE"])
def delete_user_profile(request: HttpRequest) -> JsonResponse:
    user: User = cast(User, request.user)
    user.delete()

    return JsonResponse(
        {
            "message": SUCCESS_DELETED.format("User profile"),
        },
        status=status.HTTP_200_OK,
    )
