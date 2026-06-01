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
    ReportOrgan,
    ReportTimelineEvent,
    SensorStep,
    SystemConfig,
)
from .utils import keys_to_camel


class CamelCaseSerializerMixin:
    def to_representation(self, instance):
        return keys_to_camel(super().to_representation(instance))


class PatientSerializer(CamelCaseSerializerMixin, serializers.ModelSerializer):
    id = serializers.CharField(source="soldier_id")
    heartRate = serializers.IntegerField(source="heart_rate")
    lastUpdate = serializers.CharField(source="last_update_label")

    class Meta:
        model = Patient
        fields = [
            "id",
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
        ]


class PatientDetailSerializer(PatientSerializer):
    respiration = serializers.IntegerField()
    bpSystolic = serializers.IntegerField(source="bp_systolic")
    bpDiastolic = serializers.IntegerField(source="bp_diastolic")

    class Meta(PatientSerializer.Meta):
        fields = PatientSerializer.Meta.fields + ["respiration", "bpSystolic", "bpDiastolic"]


class DoctorSerializer(CamelCaseSerializerMixin, serializers.ModelSerializer):
    avatar = serializers.URLField(source="avatar_url")

    class Meta:
        model = Doctor
        fields = ["name", "rank", "unit", "avatar"]


class AdminUserSummarySerializer(CamelCaseSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "is_staff", "is_superuser", "is_active"]


class AdminDoctorSerializer(CamelCaseSerializerMixin, serializers.ModelSerializer):
    user = AdminUserSummarySerializer(read_only=True)
    userId = serializers.IntegerField(source="user_id", read_only=True)

    class Meta:
        model = Doctor
        fields = ["id", "userId", "user", "name", "rank", "unit", "avatar_url"]


class AdminPatientSerializer(CamelCaseSerializerMixin, serializers.ModelSerializer):
    id = serializers.CharField(source="soldier_id")
    user = AdminUserSummarySerializer(read_only=True)
    userId = serializers.IntegerField(source="user_id", read_only=True)

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
            "heart_rate",
            "spo2",
            "temp",
            "fatigue",
            "stress",
            "location",
            "last_update_label",
            "respiration",
            "bp_systolic",
            "bp_diastolic",
        ]


class EmergencyAlertSerializer(CamelCaseSerializerMixin, serializers.ModelSerializer):
    type = serializers.CharField(source="alert_type")
    patient = serializers.CharField(source="patient.name")
    soldierId = serializers.CharField(source="patient_id")
    time = serializers.CharField(source="time_label")

    class Meta:
        model = EmergencyAlert
        fields = ["id", "type", "title", "patient", "soldierId", "message", "time"]


class AIRecommendationSerializer(CamelCaseSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = AIRecommendation
        fields = ["id", "text"]


class ActivityLogSerializer(CamelCaseSerializerMixin, serializers.ModelSerializer):
    patient = serializers.CharField(source="patient_name")
    time = serializers.CharField(source="time_label")

    class Meta:
        model = ActivityLog
        fields = ["id", "action", "patient", "time"]


class SensorStepSerializer(CamelCaseSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = SensorStep
        fields = ["id", "label", "icon", "status"]


class AIInsightSerializer(CamelCaseSerializerMixin, serializers.ModelSerializer):
    fatiguePrediction = serializers.IntegerField(source="fatigue_prediction")
    altitudeSicknessRisk = serializers.IntegerField(source="altitude_sickness_risk")
    cardiacRisk = serializers.IntegerField(source="cardiac_risk")
    stressScore = serializers.IntegerField(source="stress_score")

    class Meta:
        model = AIInsight
        fields = [
            "fatiguePrediction",
            "altitudeSicknessRisk",
            "cardiacRisk",
            "stressScore",
            "readiness",
            "trends",
        ]


class ReportOrganSerializer(CamelCaseSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = ReportOrgan
        fields = ["name", "status", "value"]


class ReportTimelineSerializer(CamelCaseSerializerMixin, serializers.ModelSerializer):
    time = serializers.CharField(source="time_label")

    class Meta:
        model = ReportTimelineEvent
        fields = ["time", "event"]


class MedicalReportSerializer(CamelCaseSerializerMixin, serializers.ModelSerializer):
    reportId = serializers.CharField(source="report_id")
    generatedAt = serializers.DateTimeField(source="generated_at")
    patient = PatientSerializer(read_only=True)
    doctor = DoctorSerializer(read_only=True)
    organs = ReportOrganSerializer(many=True, read_only=True)
    timeline = ReportTimelineSerializer(many=True, read_only=True)
    hash = serializers.CharField(source="hash_value")

    class Meta:
        model = MedicalReport
        fields = [
            "reportId",
            "generatedAt",
            "patient",
            "doctor",
            "diagnosis",
            "organs",
            "timeline",
            "notes",
            "hash",
        ]


class ConsultationQueueSerializer(CamelCaseSerializerMixin, serializers.ModelSerializer):
    queuePosition = serializers.IntegerField(source="queue_position")
    waitTime = serializers.IntegerField(source="estimated_wait_minutes")

    class Meta:
        model = ConsultationQueue
        fields = ["queuePosition", "waitTime"]


class SystemConfigSerializer(CamelCaseSerializerMixin, serializers.ModelSerializer):
    secureNode = serializers.CharField(source="secure_node")
    uplinkData = serializers.JSONField(source="uplink_data")

    class Meta:
        model = SystemConfig
        fields = ["secureNode", "uplinkData"]
