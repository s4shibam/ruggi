from django.urls import path

from . import views

app_name = "user"

urlpatterns = [
    path("", views.get_user_profile, name="get_profile"),
    path("update/", views.update_user_profile, name="update_profile"),
    path("delete/", views.delete_user_profile, name="deactivate_account"),
]
