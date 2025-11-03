from django.urls import path

from . import views

app_name = "auth"

urlpatterns = [
    path("google/login-url/", views.google_login_url, name="google_login_url"),
    path("google/callback/", views.google_callback, name="google_callback"),
    path("logout/", views.logout_view, name="logout"),
]
