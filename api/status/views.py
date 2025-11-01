from django.db import connection
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class StatusView(APIView):
    """API status endpoint."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        checks = {"database": self._check_database()}
        all_checks_pass = all(checks.values())
        api_status = "up" if all_checks_pass else "down"

        return Response(
            {"data": {"status": api_status, "checks": checks}},
            status=status.HTTP_200_OK,
        )

    def _check_database(self) -> bool:
        """Check database connection."""
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            return True
        except Exception:
            return False
