import random

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    ActivityLog,
    AIInsight,
    AIRecommendation,
    ConsultationQueue,
    Doctor,
    EmergencyAlert,
    MedicalReport,
    OrganDiagnostic,
    Patient,
    SensorStep,
    SystemConfig,
)
from .serializers import (
    ActivityLogSerializer,
    AIInsightSerializer,
    AIRecommendationSerializer,
    ConsultationQueueSerializer,
    AdminDoctorSerializer,
    AdminPatientSerializer,
    DoctorSerializer,
    EmergencyAlertSerializer,
    MedicalReportSerializer,
    PatientDetailSerializer,
    PatientSerializer,
    SensorStepSerializer,
    SystemConfigSerializer,
)
from .utils import keys_to_camel


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username", "")
        password = request.data.get("password", "")
        user = authenticate(username=username, password=password)
        if user is None:
            return Response({"detail": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
        token, _ = Token.objects.get_or_create(user=user)
        doctor = Doctor.objects.filter(user=user).first()
        doctor_data = DoctorSerializer(doctor).data if doctor else None
        return Response({"token": token.key, "doctor": doctor_data})


class SuperAdminLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username", "")
        password = request.data.get("password", "")
        user = authenticate(username=username, password=password)
        if user is None:
            return Response({"detail": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
        if not (user.is_staff or user.is_superuser):
            return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {
                "token": token.key,
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "isStaff": user.is_staff,
                    "isSuperuser": user.is_superuser,
                },
            }
        )


class AdminDoctorListCreateView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        doctors = Doctor.objects.select_related("user").order_by("id")
        return Response(AdminDoctorSerializer(doctors, many=True).data)

    def post(self, request):
        username = request.data.get("username", "")
        password = request.data.get("password", "")
        email = request.data.get("email", "")
        name = request.data.get("name", "")
        rank = request.data.get("rank", "")
        unit = request.data.get("unit", "")
        avatar_url = request.data.get("avatarUrl", "") or request.data.get("avatar_url", "")

        if not username or not password or not name:
            return Response(
                {"detail": "username, password, and name are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                user = User.objects.create(username=username, email=email, is_staff=False)
                user.set_password(password)
                user.save()
                doctor = Doctor.objects.create(
                    user=user, name=name, rank=rank, unit=unit, avatar_url=avatar_url
                )
        except IntegrityError:
            return Response({"detail": "Username already exists"}, status=status.HTTP_409_CONFLICT)

        return Response(AdminDoctorSerializer(doctor).data, status=status.HTTP_201_CREATED)


class AdminDoctorDetailView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, doctor_id: int):
        try:
            doctor = Doctor.objects.select_related("user").get(pk=doctor_id)
        except Doctor.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(AdminDoctorSerializer(doctor).data)

    def patch(self, request, doctor_id: int):
        try:
            doctor = Doctor.objects.select_related("user").get(pk=doctor_id)
        except Doctor.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        user = doctor.user
        username = request.data.get("username")
        email = request.data.get("email")
        password = request.data.get("password")

        if username is not None:
            user.username = username
        if email is not None:
            user.email = email
        if password:
            user.set_password(password)
        try:
            with transaction.atomic():
                user.save()
                for field, key in [
                    ("name", "name"),
                    ("rank", "rank"),
                    ("unit", "unit"),
                    ("avatar_url", "avatarUrl"),
                ]:
                    if key in request.data:
                        setattr(doctor, field, request.data.get(key))
                if "avatar_url" in request.data:
                    doctor.avatar_url = request.data.get("avatar_url")
                doctor.save()
        except IntegrityError:
            return Response({"detail": "Username already exists"}, status=status.HTTP_409_CONFLICT)

        return Response(AdminDoctorSerializer(doctor).data)

    def delete(self, request, doctor_id: int):
        try:
            doctor = Doctor.objects.select_related("user").get(pk=doctor_id)
        except Doctor.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        doctor.user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminPatientListCreateView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        patients = Patient.objects.select_related("user").order_by("soldier_id")
        return Response(AdminPatientSerializer(patients, many=True).data)

    def post(self, request):
        soldier_id = request.data.get("soldierId") or request.data.get("soldier_id") or ""
        username = request.data.get("username", "")
        password = request.data.get("password", "")
        email = request.data.get("email", "")

        if not soldier_id:
            return Response({"detail": "soldierId is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Patient details (defaults if not provided)
        pdata = {
            "soldier_id": soldier_id,
            "name": request.data.get("name", ""),
            "rank": request.data.get("rank", ""),
            "regiment": request.data.get("regiment", ""),
            "status": request.data.get("status", "stable"),
            "altitude": int(request.data.get("altitude", 0) or 0),
            "heart_rate": int(request.data.get("heartRate", request.data.get("heart_rate", 70)) or 70),
            "spo2": int(request.data.get("spo2", 98) or 98),
            "temp": float(request.data.get("temp", 36.8) or 36.8),
            "fatigue": int(request.data.get("fatigue", 0) or 0),
            "stress": int(request.data.get("stress", 0) or 0),
            "location": request.data.get("location", ""),
            "last_update_label": request.data.get("lastUpdate", request.data.get("last_update_label", "just now"))
            or "just now",
            "respiration": int(request.data.get("respiration", 16) or 16),
            "bp_systolic": int(request.data.get("bpSystolic", request.data.get("bp_systolic", 120)) or 120),
            "bp_diastolic": int(request.data.get("bpDiastolic", request.data.get("bp_diastolic", 80)) or 80),
        }

        try:
            with transaction.atomic():
                patient = Patient.objects.create(**pdata)
                if username and password:
                    user = User.objects.create(username=username, email=email, is_staff=False)
                    user.set_password(password)
                    user.save()
                    patient.user = user
                    patient.save(update_fields=["user"])
        except IntegrityError:
            return Response(
                {"detail": "soldierId or username already exists"},
                status=status.HTTP_409_CONFLICT,
            )

        return Response(AdminPatientSerializer(patient).data, status=status.HTTP_201_CREATED)


class AdminPatientDetailView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, soldier_id: str):
        try:
            patient = Patient.objects.select_related("user").get(soldier_id=soldier_id)
        except Patient.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(AdminPatientSerializer(patient).data)

    def patch(self, request, soldier_id: str):
        try:
            patient = Patient.objects.select_related("user").get(soldier_id=soldier_id)
        except Patient.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        username = request.data.get("username")
        email = request.data.get("email")
        password = request.data.get("password")

        try:
            with transaction.atomic():
                if username is not None or email is not None or password:
                    if not patient.user:
                        # Create new user if it doesn't exist yet (requires username+password)
                        if not username or not password:
                            return Response(
                                {"detail": "username and password required to create patient credentials"},
                                status=status.HTTP_400_BAD_REQUEST,
                            )
                        user = User.objects.create(username=username, email=email or "", is_staff=False)
                        user.set_password(password)
                        user.save()
                        patient.user = user
                    else:
                        user = patient.user
                        if username is not None:
                            user.username = username
                        if email is not None:
                            user.email = email
                        if password:
                            user.set_password(password)
                        user.save()

                mapping = {
                    "name": "name",
                    "rank": "rank",
                    "regiment": "regiment",
                    "status": "status",
                    "altitude": "altitude",
                    "heart_rate": "heart_rate",
                    "heartRate": "heart_rate",
                    "spo2": "spo2",
                    "temp": "temp",
                    "fatigue": "fatigue",
                    "stress": "stress",
                    "location": "location",
                    "last_update_label": "last_update_label",
                    "lastUpdate": "last_update_label",
                    "respiration": "respiration",
                    "bp_systolic": "bp_systolic",
                    "bpSystolic": "bp_systolic",
                    "bp_diastolic": "bp_diastolic",
                    "bpDiastolic": "bp_diastolic",
                }
                for key, field in mapping.items():
                    if key in request.data:
                        setattr(patient, field, request.data.get(key))
                patient.save()
        except IntegrityError:
            return Response({"detail": "Username already exists"}, status=status.HTTP_409_CONFLICT)

        return Response(AdminPatientSerializer(patient).data)

    def delete(self, request, soldier_id: str):
        try:
            patient = Patient.objects.select_related("user").get(soldier_id=soldier_id)
        except Patient.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        if patient.user:
            patient.user.delete()
        patient.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DoctorMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        doctor = Doctor.objects.filter(user=request.user).first()
        if not doctor:
            return Response({"detail": "Doctor profile not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(DoctorSerializer(doctor).data)


class ConfigView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        config, _ = SystemConfig.objects.get_or_create(pk=1, defaults={"secure_node": "JOD-01"})
        return Response(SystemConfigSerializer(config).data)


class PatientListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        patients = Patient.objects.all()
        return Response(PatientSerializer(patients, many=True).data)


class PatientDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, soldier_id):
        try:
            patient = Patient.objects.get(soldier_id=soldier_id)
        except Patient.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(PatientDetailSerializer(patient).data)


class PatientOrgansView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, soldier_id):
        organs = OrganDiagnostic.objects.filter(patient_id=soldier_id)
        result = {}
        for organ in organs:
            data = dict(organ.data)
            if "ecg_points" in data:
                data["ecgPoints"] = data.pop("ecg_points")
            result[organ.organ_id] = keys_to_camel(data)
        return Response(result)


class PatientAIInsightsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, soldier_id):
        try:
            insight = AIInsight.objects.get(patient_id=soldier_id)
        except AIInsight.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(AIInsightSerializer(insight).data)


class PatientMedicalReportView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, soldier_id):
        report = MedicalReport.objects.filter(patient_id=soldier_id).first()
        if not report:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(MedicalReportSerializer(report).data)


class PatientSensorStepsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, soldier_id):
        steps = SensorStep.objects.filter(patient_id=soldier_id)
        return Response(SensorStepSerializer(steps, many=True).data)


class PatientVitalsJitterView(APIView):
    """Dev endpoint: nudge vitals slightly and persist to DB for polling demo."""

    permission_classes = [AllowAny]

    def post(self, request, soldier_id):
        try:
            patient = Patient.objects.get(soldier_id=soldier_id)
        except Patient.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        patient.heart_rate += random.choice([-1, 1])
        patient.spo2 = max(85, min(100, patient.spo2 + random.choice([-1, 0])))
        patient.save(update_fields=["heart_rate", "spo2"])
        return Response(PatientDetailSerializer(patient).data)


class EmergencyAlertsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        alerts = EmergencyAlert.objects.select_related("patient").all()
        return Response(EmergencyAlertSerializer(alerts, many=True).data)


class AIRecommendationsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from django.db.models import Q

        patient_id = request.query_params.get("patient")
        if patient_id:
            qs = AIRecommendation.objects.filter(
                Q(patient_id=patient_id) | Q(patient__isnull=True)
            )
        else:
            qs = AIRecommendation.objects.filter(patient__isnull=True)
        texts = [r.text for r in qs.order_by("order", "id")]
        return Response(texts)


class ActivityView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        logs = ActivityLog.objects.all()[:10]
        return Response(ActivityLogSerializer(logs, many=True).data)


class DashboardStatsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            keys_to_camel(
                {
                    "active_consultations": Patient.objects.filter(status="consultation").count(),
                    "critical_alerts": EmergencyAlert.objects.filter(alert_type="critical").count(),
                    "ai_recommendations": AIRecommendation.objects.count(),
                    "reports_today": MedicalReport.objects.filter(
                        generated_at__date=timezone.now().date()
                    ).count()
                    or MedicalReport.objects.count(),
                }
            )
        )


class QueueView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, soldier_id):
        try:
            entry = ConsultationQueue.objects.get(patient_id=soldier_id)
        except ConsultationQueue.DoesNotExist:
            return Response({"queuePosition": 2, "waitTime": 4})
        return Response(ConsultationQueueSerializer(entry).data)
