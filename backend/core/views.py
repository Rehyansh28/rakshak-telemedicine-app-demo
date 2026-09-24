import random

from django.db import IntegrityError
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from django.db.models import Max
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    ActivityLog,
    AIInsight,
    AIRecommendation,
    Consultation,
    ConsultationQueue,
    Doctor,
    MedicalStaff,
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
    ConsultationSerializer,
    DoctorSerializer,
    MedicalStaffSerializer,
    EmergencyAlertSerializer,
    MedicalReportSerializer,
    PatientDetailSerializer,
    PatientSerializer,
    SensorStepSerializer,
    SystemConfigSerializer,
)
from .hub_views import has_live_sensor
from .patient_utils import apply_patient_fields, bootstrap_patient_session, build_patient_create_data
from .permissions import IsMedicalStaff, IsDoctor
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


class StaffLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        identifier = request.data.get("username", "")
        password = request.data.get("password", "")
        user = authenticate_login(identifier, password)
        if user is None:
            return Response({"detail": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
        staff = MedicalStaff.objects.filter(user=user).first()
        if not staff:
            return Response(
                {
                    "detail": "This account is not registered as medical staff. "
                    "Create a medical staff profile in Super Admin."
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "staff": MedicalStaffSerializer(staff).data})


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
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsMedicalStaff()]
        return [AllowAny()]

    def get(self, request):
        patients = Patient.objects.all()
        return Response(PatientSerializer(patients, many=True).data)

    def post(self, request):
        """Medical staff registration of a new soldier (patient) profile."""
        soldier_id, pdata = build_patient_create_data(request.data)
        if not soldier_id:
            return Response({"detail": "soldierId is required"}, status=status.HTTP_400_BAD_REQUEST)
        if not pdata["name"]:
            return Response({"detail": "name is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            patient = Patient.objects.create(**pdata)
            bootstrap_patient_session(patient)
        except IntegrityError:
            return Response({"detail": "soldierId already exists"}, status=status.HTTP_409_CONFLICT)
        return Response(PatientSerializer(patient).data, status=status.HTTP_201_CREATED)


class PatientDetailView(APIView):
    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsMedicalStaff()]

    def get(self, request, soldier_id):
        try:
            patient = Patient.objects.get(soldier_id=soldier_id)
        except Patient.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(PatientDetailSerializer(patient).data)

    def patch(self, request, soldier_id):
        try:
            patient = Patient.objects.get(soldier_id=soldier_id)
        except Patient.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        apply_patient_fields(patient, request.data)
        patient.save()
        return Response(PatientDetailSerializer(patient).data)

    def delete(self, request, soldier_id):
        try:
            patient = Patient.objects.select_related("user").get(soldier_id=soldier_id)
        except Patient.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        if patient.user:
            patient.user.delete()
        else:
            patient.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


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
        fields = ["spo2"]
        if not has_live_sensor(patient):  # never overwrite a real heart rate from the sensor hub
            patient.heart_rate += random.choice([-1, 1])
            fields.append("heart_rate")
        patient.spo2 = max(85, min(100, patient.spo2 + random.choice([-1, 0])))
        patient.save(update_fields=fields)
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


class QueueEnqueueView(APIView):
    permission_classes = [IsMedicalStaff]

    def post(self, request, soldier_id):
        try:
            patient = Patient.objects.get(soldier_id=soldier_id)
        except Patient.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        max_pos = ConsultationQueue.objects.aggregate(m=Max("queue_position"))["m"] or 0
        wait = int(request.data.get("waitTime", request.data.get("wait_time", 5)) or 5)
        position = int(request.data.get("queuePosition", request.data.get("queue_position", max_pos + 1)) or max_pos + 1)

        entry, _ = ConsultationQueue.objects.update_or_create(
            patient=patient,
            defaults={
                "queue_position": position,
                "estimated_wait_minutes": wait,
            },
        )
        patient.status = "consultation"
        patient.save(update_fields=["status"])
        return Response(ConsultationQueueSerializer(entry).data, status=status.HTTP_200_OK)


class CallRequestView(APIView):
    permission_classes = [IsMedicalStaff]

    def post(self, request):
        import uuid
        soldier_id = request.data.get("soldierId") or request.data.get("patient_id")
        if not soldier_id:
            return Response({"detail": "soldierId is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            patient = Patient.objects.get(soldier_id=soldier_id)
        except Patient.DoesNotExist:
            return Response({"detail": "Patient not found"}, status=status.HTTP_404_NOT_FOUND)
            
        # Cancel any prior active calls
        Consultation.objects.filter(patient=patient, status__in=['waiting', 'accepted']).update(
            status='ended', ended_at=timezone.now()
        )

        room_id = f"room_{uuid.uuid4().hex}"
        consultation = Consultation.objects.create(
            patient=patient,
            room_id=room_id,
            status="waiting",
            requested_at=timezone.now()
        )
        
        # Ensure patient status
        patient.status = "consultation"
        patient.save(update_fields=["status"])
        
        # Enqueue if not in queue
        max_pos = ConsultationQueue.objects.aggregate(m=Max("queue_position"))["m"] or 0
        ConsultationQueue.objects.get_or_create(
            patient=patient,
            defaults={
                "queue_position": max_pos + 1,
                "estimated_wait_minutes": 5,
            }
        )

        return Response(ConsultationSerializer(consultation).data, status=status.HTTP_201_CREATED)


class CallAcceptView(APIView):
    permission_classes = [IsDoctor]

    def post(self, request):
        doctor = Doctor.objects.get(user=request.user)
        consultation_id = request.data.get("consultationId") or request.data.get("id")
        if not consultation_id:
            return Response({"detail": "consultationId is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            consultation = Consultation.objects.get(id=consultation_id)
        except Consultation.DoesNotExist:
            return Response({"detail": "Consultation not found"}, status=status.HTTP_404_NOT_FOUND)
            
        if consultation.status != "waiting":
            return Response({"detail": f"Consultation cannot be accepted in '{consultation.status}' state"}, status=status.HTTP_400_BAD_REQUEST)
            
        consultation.status = "accepted"
        consultation.doctor = doctor
        consultation.accepted_at = timezone.now()
        consultation.save()
        
        return Response(ConsultationSerializer(consultation).data, status=status.HTTP_200_OK)


class CallRejectView(APIView):
    permission_classes = [IsDoctor]

    def post(self, request):
        doctor = Doctor.objects.get(user=request.user)
        consultation_id = request.data.get("consultationId") or request.data.get("id")
        if not consultation_id:
            return Response({"detail": "consultationId is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            consultation = Consultation.objects.get(id=consultation_id)
        except Consultation.DoesNotExist:
            return Response({"detail": "Consultation not found"}, status=status.HTTP_404_NOT_FOUND)
            
        consultation.status = "rejected"
        consultation.doctor = doctor
        consultation.save()
        
        # Dequeue
        ConsultationQueue.objects.filter(patient=consultation.patient).delete()
        if consultation.patient.status == "consultation":
            consultation.patient.status = "stable"
            consultation.patient.save(update_fields=["status"])
            
        return Response(ConsultationSerializer(consultation).data, status=status.HTTP_200_OK)


class CallEndView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        room_id = request.data.get("roomId")
        consultation_id = request.data.get("consultationId") or request.data.get("id")
        
        consultation = None
        if consultation_id:
            consultation = Consultation.objects.filter(id=consultation_id).first()
        elif room_id:
            consultation = Consultation.objects.filter(room_id=room_id).first()
            
        if not consultation:
            return Response({"detail": "Consultation not found"}, status=status.HTTP_404_NOT_FOUND)
            
        if consultation.status == "ended":
            return Response(ConsultationSerializer(consultation).data, status=status.HTTP_200_OK)
            
        consultation.status = "ended"
        consultation.ended_at = timezone.now()
        if consultation.accepted_at:
            delta = consultation.ended_at - consultation.accepted_at
            consultation.duration = int(delta.total_seconds())
        consultation.save()
        
        # Dequeue
        ConsultationQueue.objects.filter(patient=consultation.patient).delete()
        if consultation.patient.status == "consultation":
            consultation.patient.status = "stable"
            consultation.patient.save(update_fields=["status"])
            
        return Response(ConsultationSerializer(consultation).data, status=status.HTTP_200_OK)


class CallStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, room_id):
        try:
            consultation = Consultation.objects.get(room_id=room_id)
        except Consultation.DoesNotExist:
            return Response({"detail": "Consultation not found"}, status=status.HTTP_404_NOT_FOUND)
            
        return Response(ConsultationSerializer(consultation).data)


class CallRequestsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        waiting = Consultation.objects.filter(status="waiting")
        return Response(ConsultationSerializer(waiting, many=True).data)

