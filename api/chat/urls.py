from django.urls import path

from . import views

app_name = "chat"

urlpatterns = [
    path("message/", views.create_chat_message, name="create_message"),
    path("session/", views.get_all_chats, name="list_sessions"),
    path("session/<uuid:chat_id>/", views.get_chat_detail, name="get_session"),
    path("session/<uuid:chat_id>/update/", views.update_chat, name="update_session"),
    path("session/<uuid:chat_id>/delete/", views.delete_chat, name="delete_session"),
    path("session/<uuid:chat_id>/title/", views.generate_chat_title, name="generate_title"),
]
