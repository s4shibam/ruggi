from django.contrib.auth import logout
from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from rest_framework import status


@csrf_exempt
@require_POST
def logout_view(request: HttpRequest):
    logout(request)
    return JsonResponse(
        {"message": "Logged out successfully", "data": None},
        status=status.HTTP_200_OK,
    )
