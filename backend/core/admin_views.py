from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .admin_serializers import (
    AdminActivityLogSerializer,
    AdminAIInsightSerializer,
    AdminAIRecommendationSerializer,
    AdminConsultationQueueSerializer,
    AdminDoctorSerializer,
    AdminEmergencyAlertSerializer,
    AdminMedicalReportSerializer,
    AdminOrganDiagnosticSerializer,
    AdminPatientSerializer,
    AdminSensorStepSerializer,
    AdminSystemConfigSerializer,
)
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
from .utils import keys_to_camel


def _apply_patient_fields(patient, data):
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
        if key in data:
            val = data.get(key)
            if field in ("altitude", "heart_rate", "spo2", "fatigue", "stress", "respiration", "bp_systolic", "bp_diastolic"):
                val = int(val)
            elif field == "temp":
                val = float(val)
            setattr(patient, field, val)


def _apply_user_credentials(user, data, create=False):
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")
    if username is not None:
        user.username = username
    if email is not None:
        user.email = email
    if password:
        user.set_password(password)
    if create and not password:
        raise ValueError("password required")
    user.save()


class AdminOverviewView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response(
            keys_to_camel(
                {
                    "stats": {
                        "doctors": Doctor.objects.count(),
                        "patients": Patient.objects.count(),
                        "alerts": EmergencyAlert.objects.count(),
                        "critical_alerts": EmergencyAlert.objects.filter(alert_type="critical").count(),
                        "activity_logs": ActivityLog.objects.count(),
                        "reports": MedicalReport.objects.count(),
                        "recommendations": AIRecommendation.objects.count(),
                        "queue_entries": ConsultationQueue.objects.count(),
                    },
                    "recent_activity": AdminActivityLogSerializer(
                        ActivityLog.objects.all()[:15], many=True
                    ).data,
                    "recent_alerts": AdminEmergencyAlertSerializer(
                        EmergencyAlert.objects.select_related("patient").all()[:15], many=True
                    ).data,
                }
            )
        )


class AdminDoctorListCreateView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        doctors = Doctor.objects.select_related("user").order_by("id")
        return Response(AdminDoctorSerializer(doctors, many=True).data)

    def post(self, request):
        username = request.data.get("username", "")
        password = request.data.get("password", "")
        if not username or not password or not request.data.get("name"):
            return Response(
                {"detail": "username, password, and name are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            with transaction.atomic():
                user = User.objects.create(
                    username=username,
                    email=request.data.get("email", ""),
                    is_staff=False,
                )
                user.set_password(password)
                user.save()
                doctor = Doctor.objects.create(
                    user=user,
                    name=request.data.get("name", ""),
                    rank=request.data.get("rank", ""),
                    unit=request.data.get("unit", ""),
                    avatar_url=request.data.get("avatarUrl", "") or request.data.get("avatar_url", ""),
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
        reports = AdminMedicalReportSerializer(
            MedicalReport.objects.filter(doctor=doctor).select_related("patient"), many=True
        ).data
        return Response({"doctor": AdminDoctorSerializer(doctor).data, "reports": reports})

    def patch(self, request, doctor_id: int):
        try:
            doctor = Doctor.objects.select_related("user").get(pk=doctor_id)
        except Doctor.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        try:
            with transaction.atomic():
                user = doctor.user
                if any(k in request.data for k in ("username", "email", "password")):
                    _apply_user_credentials(user, request.data)
                for field, key in [("name", "name"), ("rank", "rank"), ("unit", "unit")]:
                    if key in request.data:
                        setattr(doctor, field, request.data[key])
                if "avatarUrl" in request.data or "avatar_url" in request.data:
                    doctor.avatar_url = request.data.get("avatarUrl") or request.data.get("avatar_url", "")
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
        if not soldier_id:
            return Response({"detail": "soldierId is required"}, status=status.HTTP_400_BAD_REQUEST)
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
            "last_update_label": request.data.get("lastUpdate", "just now") or "just now",
            "respiration": int(request.data.get("respiration", 16) or 16),
            "bp_systolic": int(request.data.get("bpSystolic", 120) or 120),
            "bp_diastolic": int(request.data.get("bpDiastolic", 80) or 80),
        }
        try:
            with transaction.atomic():
                patient = Patient.objects.create(**pdata)
                username = request.data.get("username")
                password = request.data.get("password")
                if username and password:
                    user = User.objects.create(username=username, email=request.data.get("email", ""))
                    user.set_password(password)
                    user.save()
                    patient.user = user
                    patient.save(update_fields=["user"])
        except IntegrityError:
            return Response({"detail": "soldierId or username already exists"}, status=status.HTTP_409_CONFLICT)
        return Response(AdminPatientSerializer(patient).data, status=status.HTTP_201_CREATED)


class AdminPatientDetailView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, soldier_id: str):
        try:
            patient = Patient.objects.select_related("user").get(soldier_id=soldier_id)
        except Patient.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        insight = AIInsight.objects.filter(patient=patient).first()
        queue = ConsultationQueue.objects.filter(patient=patient).first()
        return Response(
            {
                "patient": AdminPatientSerializer(patient).data,
                "alerts": AdminEmergencyAlertSerializer(
                    EmergencyAlert.objects.filter(patient=patient), many=True
                ).data,
                "aiInsight": AdminAIInsightSerializer(insight).data if insight else None,
                "sensorSteps": AdminSensorStepSerializer(
                    SensorStep.objects.filter(patient=patient), many=True
                ).data,
                "queue": AdminConsultationQueueSerializer(queue).data if queue else None,
                "organs": AdminOrganDiagnosticSerializer(
                    OrganDiagnostic.objects.filter(patient=patient), many=True
                ).data,
                "reports": AdminMedicalReportSerializer(
                    MedicalReport.objects.filter(patient=patient).select_related("doctor"), many=True
                ).data,
                "recommendations": AdminAIRecommendationSerializer(
                    AIRecommendation.objects.filter(patient=patient), many=True
                ).data,
            }
        )

    def patch(self, request, soldier_id: str):
        try:
            patient = Patient.objects.select_related("user").get(soldier_id=soldier_id)
        except Patient.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        try:
            with transaction.atomic():
                username = request.data.get("username")
                email = request.data.get("email")
                password = request.data.get("password")
                if username is not None or email is not None or password:
                    if not patient.user:
                        if not username or not password:
                            return Response(
                                {"detail": "username and password required to create credentials"},
                                status=status.HTTP_400_BAD_REQUEST,
                            )
                        user = User.objects.create(username=username, email=email or "")
                        user.set_password(password)
                        user.save()
                        patient.user = user
                    else:
                        _apply_user_credentials(patient.user, request.data)
                _apply_patient_fields(patient, request.data)
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


class AdminActivityListCreateView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        logs = ActivityLog.objects.all()
        return Response(AdminActivityLogSerializer(logs, many=True).data)

    def post(self, request):
        log = ActivityLog.objects.create(
            action=request.data.get("action", ""),
            patient_name=request.data.get("patientName", request.data.get("patient_name", "")),
            time_label=request.data.get("timeLabel", request.data.get("time_label", "now")),
        )
        return Response(AdminActivityLogSerializer(log).data, status=status.HTTP_201_CREATED)


class AdminActivityDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, log_id: int):
        try:
            log = ActivityLog.objects.get(pk=log_id)
        except ActivityLog.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        if "action" in request.data:
            log.action = request.data["action"]
        if "patientName" in request.data or "patient_name" in request.data:
            log.patient_name = request.data.get("patientName") or request.data.get("patient_name")
        if "timeLabel" in request.data or "time_label" in request.data:
            log.time_label = request.data.get("timeLabel") or request.data.get("time_label")
        log.save()
        return Response(AdminActivityLogSerializer(log).data)

    def delete(self, request, log_id: int):
        ActivityLog.objects.filter(pk=log_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminAlertListCreateView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        alerts = EmergencyAlert.objects.select_related("patient").all()
        return Response(AdminEmergencyAlertSerializer(alerts, many=True).data)

    def post(self, request):
        patient_id = request.data.get("patientId") or request.data.get("patient_id")
        if not patient_id:
            return Response({"detail": "patientId required"}, status=status.HTTP_400_BAD_REQUEST)
        alert = EmergencyAlert.objects.create(
            patient_id=patient_id,
            alert_type=request.data.get("alertType", request.data.get("alert_type", "info")),
            title=request.data.get("title", ""),
            message=request.data.get("message", ""),
            time_label=request.data.get("timeLabel", request.data.get("time_label", "now")),
        )
        return Response(AdminEmergencyAlertSerializer(alert).data, status=status.HTTP_201_CREATED)


class AdminAlertDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, alert_id: int):
        try:
            alert = EmergencyAlert.objects.get(pk=alert_id)
        except EmergencyAlert.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        if "patientId" in request.data:
            alert.patient_id = request.data["patientId"]
        if "alertType" in request.data or "alert_type" in request.data:
            alert.alert_type = request.data.get("alertType") or request.data.get("alert_type")
        for key, attr in [("title", "title"), ("message", "message")]:
            if key in request.data:
                setattr(alert, attr, request.data[key])
        if "timeLabel" in request.data or "time_label" in request.data:
            alert.time_label = request.data.get("timeLabel") or request.data.get("time_label")
        alert.save()
        return Response(AdminEmergencyAlertSerializer(alert).data)

    def delete(self, request, alert_id: int):
        EmergencyAlert.objects.filter(pk=alert_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminRecommendationListCreateView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        recs = AIRecommendation.objects.select_related("patient").all()
        return Response(AdminAIRecommendationSerializer(recs, many=True).data)

    def post(self, request):
        patient_id = request.data.get("patientId") or request.data.get("patient_id")
        rec = AIRecommendation.objects.create(
            text=request.data.get("text", ""),
            patient_id=patient_id or None,
            order=int(request.data.get("order", 0) or 0),
        )
        return Response(AdminAIRecommendationSerializer(rec).data, status=status.HTTP_201_CREATED)


class AdminRecommendationDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, rec_id: int):
        try:
            rec = AIRecommendation.objects.get(pk=rec_id)
        except AIRecommendation.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        if "text" in request.data:
            rec.text = request.data["text"]
        if "patientId" in request.data:
            rec.patient_id = request.data["patientId"] or None
        if "order" in request.data:
            rec.order = int(request.data["order"])
        rec.save()
        return Response(AdminAIRecommendationSerializer(rec).data)

    def delete(self, request, rec_id: int):
        AIRecommendation.objects.filter(pk=rec_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminReportListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        reports = MedicalReport.objects.select_related("patient", "doctor").all()
        return Response(AdminMedicalReportSerializer(reports, many=True).data)


class AdminReportDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, report_id: int):
        try:
            report = MedicalReport.objects.get(pk=report_id)
        except MedicalReport.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        for key, attr in [
            ("diagnosis", "diagnosis"),
            ("notes", "notes"),
            ("hashValue", "hash_value"),
            ("hash_value", "hash_value"),
            ("reportId", "report_id"),
            ("report_id", "report_id"),
        ]:
            if key in request.data:
                setattr(report, attr, request.data[key])
        report.save()
        return Response(AdminMedicalReportSerializer(report).data)

    def delete(self, request, report_id: int):
        MedicalReport.objects.filter(pk=report_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminQueueListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        entries = ConsultationQueue.objects.select_related("patient").all()
        return Response(AdminConsultationQueueSerializer(entries, many=True).data)


class AdminQueueDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, queue_id: int):
        try:
            entry = ConsultationQueue.objects.get(pk=queue_id)
        except ConsultationQueue.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        if "queuePosition" in request.data:
            entry.queue_position = int(request.data["queuePosition"])
        if "waitTime" in request.data:
            entry.estimated_wait_minutes = int(request.data["waitTime"])
        entry.save()
        return Response(AdminConsultationQueueSerializer(entry).data)

    def delete(self, request, queue_id: int):
        ConsultationQueue.objects.filter(pk=queue_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminInsightDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, insight_id: int):
        try:
            insight = AIInsight.objects.get(pk=insight_id)
        except AIInsight.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        mapping = {
            "fatiguePrediction": "fatigue_prediction",
            "fatigue_prediction": "fatigue_prediction",
            "altitudeSicknessRisk": "altitude_sickness_risk",
            "altitude_sickness_risk": "altitude_sickness_risk",
            "cardiacRisk": "cardiac_risk",
            "cardiac_risk": "cardiac_risk",
            "stressScore": "stress_score",
            "stress_score": "stress_score",
            "readiness": "readiness",
            "trends": "trends",
        }
        for key, field in mapping.items():
            if key in request.data:
                setattr(insight, field, request.data[key])
        insight.save()
        return Response(AdminAIInsightSerializer(insight).data)


class AdminSensorStepDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, step_id: int):
        try:
            step = SensorStep.objects.get(pk=step_id)
        except SensorStep.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        for key in ("label", "icon", "status", "order"):
            if key in request.data:
                setattr(step, key, request.data[key])
        step.save()
        return Response(AdminSensorStepSerializer(step).data)


class AdminOrganDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, organ_id: int):
        try:
            organ = OrganDiagnostic.objects.get(pk=organ_id)
        except OrganDiagnostic.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        if "data" in request.data:
            organ.data = request.data["data"]
        if "organId" in request.data:
            organ.organ_id = request.data["organId"]
        organ.save()
        return Response(AdminOrganDiagnosticSerializer(organ).data)


class AdminSystemConfigView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        config, _ = SystemConfig.objects.get_or_create(pk=1, defaults={"secure_node": "JOD-01"})
        return Response(AdminSystemConfigSerializer(config).data)

    def patch(self, request):
        config, _ = SystemConfig.objects.get_or_create(pk=1, defaults={"secure_node": "JOD-01"})
        if "secureNode" in request.data:
            config.secure_node = request.data["secureNode"]
        if "uplinkData" in request.data:
            config.uplink_data = request.data["uplinkData"]
        config.save()
        return Response(AdminSystemConfigSerializer(config).data)
