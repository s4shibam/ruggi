import uuid

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.db import models

from common.constants import (
    MAX_AVATAR_URL_LENGTH,
    MAX_EMAIL_LENGTH,
    MAX_FULL_NAME_LENGTH,
    MAX_NICKNAME_LENGTH,
    MAX_OCCUPATION_LENGTH,
    MAX_STYLE_PREFERENCES_LENGTH,
)


class UserManager(BaseUserManager):
    def create_user(self, email, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.save(using=self._db)
        return user


class User(AbstractBaseUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(max_length=MAX_EMAIL_LENGTH, unique=True, db_index=True)
    full_name = models.CharField(max_length=MAX_FULL_NAME_LENGTH)
    avatar = models.URLField(
        max_length=MAX_AVATAR_URL_LENGTH,
        null=True,
        blank=True,
        default=None,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    personalization: "UserPersonalization"

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        db_table = "user"

    def __str__(self):
        return self.email


class UserPersonalization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="personalization", db_index=True
    )
    style_preferences = models.CharField(
        max_length=MAX_STYLE_PREFERENCES_LENGTH,
        null=True,
        blank=True,
        default=None,
    )
    occupation = models.CharField(
        max_length=MAX_OCCUPATION_LENGTH,
        null=True,
        blank=True,
        default=None,
    )
    nick_name = models.CharField(
        max_length=MAX_NICKNAME_LENGTH,
        null=True,
        blank=True,
        default=None,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_personalizations"

    def __str__(self):
        return f"Personalization for {self.user.email}"
