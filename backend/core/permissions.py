from rest_framework.permissions import BasePermission

from .models import MedicalStaff


class IsMedicalStaff(BasePermission):
    message = "Medical staff authentication required."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and MedicalStaff.objects.filter(user=request.user).exists()
        )
