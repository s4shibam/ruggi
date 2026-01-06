from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.urls import include, path


def root_view(request):
    """Root endpoint."""
    return JsonResponse({"message": "Hello, It's Ruggi!"})


urlpatterns = [
    path("", root_view, name="root"),
    path("status/", include("status.urls")),
    path("auth/", include("auth.urls")),
    path("user/", include("user.urls")),
    path("chat/", include("chat.urls")),
    path("document/", include("document.urls")),
    path("plan/", include("plan.urls")),
]

# Serve static files in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
