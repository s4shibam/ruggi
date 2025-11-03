import os
import urllib.parse
from typing import Optional

import requests
from django.contrib.auth import get_user_model, login, logout
from django.http import HttpRequest, HttpResponseRedirect, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST
from rest_framework import status

from common.constants import (
    ERROR_GOOGLE_OAUTH_NOT_CONFIGURED,
    GOOGLE_AUTH_URL,
    GOOGLE_OAUTH_SCOPE,
    GOOGLE_TOKEN_URL,
    GOOGLE_USERINFO_URL,
)
from config.settings import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_PATH

User = get_user_model()


def _get_redirect_uri(request: HttpRequest):
    api_base = os.environ.get("VITE_API_BASE_URL", "http://localhost:8000").rstrip("/")
    redirect_path = GOOGLE_REDIRECT_PATH

    if api_base:
        return f"{api_base}{redirect_path}"

    return request.build_absolute_uri(redirect_path)


@require_POST
@csrf_exempt
def google_login_url(request: HttpRequest):
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        return JsonResponse(
            {"message": ERROR_GOOGLE_OAUTH_NOT_CONFIGURED},
            status=status.HTTP_400_BAD_REQUEST,
        )

    redirect_uri = _get_redirect_uri(request)
    scope = GOOGLE_OAUTH_SCOPE

    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": scope,
        "access_type": "offline",
        "prompt": "consent",
        "state": "default",
    }

    url = f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"
    return JsonResponse(
        {
            "message": "Google OAuth URL generated successfully",
            "data": {"auth_url": url},
        },
        status=status.HTTP_200_OK,
    )


@require_GET
def google_callback(request: HttpRequest):
    web_base = os.environ.get("VITE_WEB_BASE_URL", "http://localhost:3000").rstrip("/")
    success_redirect = f"{web_base}/lab/chat/new"
    error_redirect_base = f"{web_base}/auth/error"

    error = request.GET.get("error")
    if error:
        reason = urllib.parse.quote(error)
        return HttpResponseRedirect(f"{error_redirect_base}?reason={reason}")

    code = request.GET.get("code")
    if not code:
        return HttpResponseRedirect(f"{error_redirect_base}?reason=no_code")

    redirect_uri = _get_redirect_uri(request)

    data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }

    try:
        token_res = requests.post(GOOGLE_TOKEN_URL, data=data, timeout=10)
        token_res.raise_for_status()
        tokens = token_res.json()
    except Exception:
        return HttpResponseRedirect(f"{error_redirect_base}?reason=token_exchange_failed")

    access_token = tokens.get("access_token")
    if not access_token:
        return HttpResponseRedirect(f"{error_redirect_base}?reason=no_access_token")

    try:
        userinfo_res = requests.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
        userinfo_res.raise_for_status()
        userinfo = userinfo_res.json()
    except Exception:
        return HttpResponseRedirect(f"{error_redirect_base}?reason=userinfo_failed")

    email: Optional[str] = userinfo.get("email")
    name: Optional[str] = userinfo.get("name") or email
    picture: Optional[str] = userinfo.get("picture")

    if not email:
        return HttpResponseRedirect(f"{error_redirect_base}?reason=no_email")

    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            "full_name": name,
            "avatar": picture,
        },
    )

    login(request, user)
    return HttpResponseRedirect(success_redirect)


@csrf_exempt
@require_POST
def logout_view(request: HttpRequest):
    logout(request)
    return JsonResponse(
        {"message": "Logged out successfully", "data": None},
        status=status.HTTP_200_OK,
    )
