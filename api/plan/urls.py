from django.urls import path

from . import views

urlpatterns = [
    path("usage/", views.get_usage, name="get_usage"),
]
