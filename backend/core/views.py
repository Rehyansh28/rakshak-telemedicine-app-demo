import random

from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
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
    DoctorSerializer,
    EmergencyAlertSerializer,
    MedicalReportSerializer,
    PatientDetailSerializer,
    PatientSerializer,
    SensorStepSerializer,
    SystemConfigSerializer,
)
from .utils import authenticate_login, keys_to_camel


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        identifier = request.data.get("username", "")
        password = request.data.get("password", "")
        user = authenticate_login(identifier, password)
        if user is None:
            return Response({"detail": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
        doctor = Doctor.objects.filter(user=user).first()
        if not doctor:
            return Response(
                {"detail": "This account is not registered as a doctor. Create a doctor profile in Super Admin."},
                status=status.HTTP_403_FORBIDDEN,
            )
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "doctor": DoctorSerializer(doctor).data})


class SuperAdminLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        identifier = request.data.get("username", "")
        password = request.data.get("password", "")
        user = authenticate_login(identifier, password)
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
