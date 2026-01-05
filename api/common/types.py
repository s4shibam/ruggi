"""
Common type definitions for type hints across the application.
"""

from django.http import HttpRequest

from user.models import User


class AuthenticatedHttpRequest(HttpRequest):
    """
    Custom HttpRequest with typed user attribute.
    Use this for views that require authentication (decorated with @login_required or @csrf_exempt).
    """

    user: User

