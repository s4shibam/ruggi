from django.urls import path

from . import views

app_name = "document"

urlpatterns = [
    path("", views.list_documents, name="list_documents"),
    path(
        "upload/presign/", views.generate_document_upload_url, name="generate_document_upload_url"
    ),
    path("upload/complete/", views.complete_document_upload, name="complete_document_upload"),
    path("<uuid:document_id>/", views.get_document_detail, name="get_document"),
    path("<uuid:document_id>/update/", views.update_document, name="update_document"),
    path("<uuid:document_id>/delete/", views.delete_document, name="delete_document"),
]
