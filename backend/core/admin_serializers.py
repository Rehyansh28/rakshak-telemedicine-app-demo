from rest_framework import serializers

from django.contrib.auth.models import User

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


class CamelCaseSerializerMixin:
    def to_representation(self, instance):
        return keys_to_camel(super().to_representation(instance))


class AdminUserSummarySerializer(CamelCaseSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "is_staff", "is_superuser", "is_active"]


class AdminDoctorSerializer(CamelCaseSerializerMixin, serializers.ModelSerializer):
    user = AdminUserSummarySerializer(read_only=True)
    userId = serializers.IntegerField(source="user_id", read_only=True)
    avatarUrl = serializers.URLField(source="avatar_url", required=False, allow_blank=True)

    class Meta:
        model = Doctor
        fields = ["id", "userId", "user", "name", "rank", "unit", "avatarUrl"]


class AdminPatientSerializer(CamelCaseSerializerMixin, serializers.ModelSerializer):
    id = serializers.CharField(source="soldier_id")
    user = AdminUserSummarySerializer(read_only=True)
    userId = serializers.IntegerField(source="user_id", read_only=True)
    heartRate = serializers.IntegerField(source="heart_rate", required=False)
    lastUpdate = serializers.CharField(source="last_update_label", required=False)
    bpSystolic = serializers.IntegerField(source="bp_systolic", required=False)
    bpDiastolic = serializers.IntegerField(source="bp_diastolic", required=False)

    class Meta:
        model = Patient
        fields = [
            "id",
            "userId",
            "user",
            "name",
            "rank",
            "regiment",
            "status",
            "altitude",
            "heartRate",
            "spo2",
            "temp",
            "fatigue",
            "stress",
            "location",
            "lastUpdate",
            "respiration",
            "bpSystolic",
            "bpDiastolic",
        ]


class AdminEmergencyAlertSerializer(CamelCaseSerializerMixin, serializers.ModelSerializer):
    patientId = serializers.CharField(source="patient_id")
    alertType = serializers.CharField(source="alert_type")
    timeLabel = serializers.CharField(source="time_label")

    class Meta:
        model = EmergencyAlert
        fields = ["id", "patientId", "alertType", "title", "message", "timeLabel"]


class AdminActivityLogSerializer(CamelCaseSerializerMixin, serializers.ModelSerializer):
    patientName = serializers.CharField(source="patient_name")
    timeLabel = serializers.CharField(source="time_label")

    class Meta:
        model = ActivityLog
        fields = ["id", "action", "patientName", "timeLabel"]


class AdminAIRecommendationSerializer(CamelCaseSerializerMixin, serializers.ModelSerializer):
    patientId = serializers.CharField(source="patient_id", allow_null=True, required=False)

    class Meta:
        model = AIRecommendation
        fields = ["id", "text", "patientId", "order"]


class AdminAIInsightSerializer(CamelCaseSerializerMixin, serializers.ModelSerializer):
    patientId = serializers.CharField(source="patient_id", read_only=True)
    fatiguePrediction = serializers.IntegerField(source="fatigue_prediction")
    altitudeSicknessRisk = serializers.IntegerField(source="altitude_sickness_risk")
    cardiacRisk = serializers.IntegerField(source="cardiac_risk")
    stressScore = serializers.IntegerField(source="stress_score")

    class Meta:
        model = AIInsight
        fields = [
            "id",
            "patientId",
            "fatiguePrediction",
            "altitudeSicknessRisk",
            "cardiacRisk",
            "stressScore",
            "readiness",
            "trends",
        ]


class AdminSensorStepSerializer(CamelCaseSerializerMixin, serializers.ModelSerializer):
    patientId = serializers.CharField(source="patient_id")

    class Meta:
        model = SensorStep
        fields = ["id", "patientId", "label", "icon", "status", "order"]


class AdminConsultationQueueSerializer(CamelCaseSerializerMixin, serializers.ModelSerializer):
    patientId = serializers.CharField(source="patient_id", read_only=True)
    queuePosition = serializers.IntegerField(source="queue_position")
    waitTime = serializers.IntegerField(source="estimated_wait_minutes")

    class Meta:
        model = ConsultationQueue
        fields = ["id", "patientId", "queuePosition", "waitTime"]


class AdminMedicalReportSerializer(CamelCaseSerializerMixin, serializers.ModelSerializer):
    reportId = serializers.CharField(source="report_id")
    patientId = serializers.CharField(source="patient_id", read_only=True)
    patientName = serializers.CharField(source="patient.name", read_only=True)
    doctorName = serializers.CharField(source="doctor.name", read_only=True, allow_null=True)
    hashValue = serializers.CharField(source="hash_value")
    generatedAt = serializers.DateTimeField(source="generated_at", read_only=True)

    class Meta:
        model = MedicalReport
        fields = [
            "id",
            "reportId",
            "patientId",
            "patientName",
            "doctorName",
            "diagnosis",
            "notes",
            "hashValue",
            "generatedAt",
        ]


class AdminOrganDiagnosticSerializer(CamelCaseSerializerMixin, serializers.ModelSerializer):
    patientId = serializers.CharField(source="patient_id")
    organId = serializers.CharField(source="organ_id")

    class Meta:
        model = OrganDiagnostic
        fields = ["id", "patientId", "organId", "data"]


class AdminSystemConfigSerializer(CamelCaseSerializerMixin, serializers.ModelSerializer):
    secureNode = serializers.CharField(source="secure_node")
    uplinkData = serializers.JSONField(source="uplink_data")

    class Meta:
        model = SystemConfig
        fields = ["id", "secureNode", "uplinkData"]
