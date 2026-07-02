from django.contrib.auth.models import User
from django.db import models


class SystemConfig(models.Model):
    secure_node = models.CharField(max_length=32, default="JOD-01")
    uplink_data = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "System configuration"

    def __str__(self):
        return self.secure_node


class Doctor(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="doctor_profile")
    name = models.CharField(max_length=128)
    rank = models.CharField(max_length=64)
    unit = models.CharField(max_length=128)
    avatar_url = models.URLField(max_length=512, blank=True)

    def __str__(self):
        return self.name


class MedicalStaff(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="medical_staff_profile")
    name = models.CharField(max_length=128)
    rank = models.CharField(max_length=64)
    post = models.CharField(max_length=128)

    def __str__(self):
        return self.name


class Patient(models.Model):
    STATUS_CHOICES = [
        ("critical", "Critical"),
        ("monitoring", "Monitoring"),
        ("stable", "Stable"),
        ("consultation", "Consultation"),
    ]

    soldier_id = models.CharField(max_length=32, primary_key=True)
    name = models.CharField(max_length=128)
    rank = models.CharField(max_length=64)
    regiment = models.CharField(max_length=128)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    altitude = models.IntegerField()
    heart_rate = models.IntegerField()
    spo2 = models.IntegerField()
    temp = models.FloatField()
    fatigue = models.IntegerField()
    stress = models.IntegerField()
    location = models.CharField(max_length=128)
    last_update_label = models.CharField(max_length=32)
    respiration = models.IntegerField(default=16)
    bp_systolic = models.IntegerField(default=120)
    bp_diastolic = models.IntegerField(default=80)
    user = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="patient_profile",
    )

    class Meta:
        ordering = ["soldier_id"]

    def __str__(self):
        return f"{self.name} ({self.soldier_id})"


class EmergencyAlert(models.Model):
    TYPE_CHOICES = [
        ("critical", "Critical"),
        ("warning", "Warning"),
        ("info", "Info"),
    ]

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="alerts")
    alert_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    title = models.CharField(max_length=128)
    message = models.TextField()
    time_label = models.CharField(max_length=32)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.title


class AIRecommendation(models.Model):
    text = models.TextField()
    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, null=True, blank=True, related_name="recommendations"
    )
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return self.text[:50]


class OrganDiagnostic(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="organs")
    organ_id = models.CharField(max_length=32)
    data = models.JSONField()

    class Meta:
        unique_together = [["patient", "organ_id"]]
        ordering = ["organ_id"]

    def __str__(self):
        return f"{self.patient_id} — {self.organ_id}"


class AIInsight(models.Model):
    patient = models.OneToOneField(Patient, on_delete=models.CASCADE, related_name="ai_insight")
    fatigue_prediction = models.IntegerField()
    altitude_sickness_risk = models.IntegerField()
    cardiac_risk = models.IntegerField()
    stress_score = models.IntegerField()
    readiness = models.IntegerField()
    trends = models.JSONField()

    def __str__(self):
        return f"AI insights for {self.patient_id}"


class MedicalReport(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="reports")
    report_id = models.CharField(max_length=64, unique=True)
    diagnosis = models.TextField()
    notes = models.TextField()
    hash_value = models.CharField(max_length=128)
    generated_at = models.DateTimeField(auto_now_add=True)
    doctor = models.ForeignKey(Doctor, on_delete=models.SET_NULL, null=True)

    class Meta:
        ordering = ["-generated_at"]

    def __str__(self):
        return self.report_id


class ReportOrgan(models.Model):
    report = models.ForeignKey(MedicalReport, on_delete=models.CASCADE, related_name="organs")
    name = models.CharField(max_length=64)
    status = models.CharField(max_length=64)
    value = models.CharField(max_length=64)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]


class ReportTimelineEvent(models.Model):
    report = models.ForeignKey(MedicalReport, on_delete=models.CASCADE, related_name="timeline")
    time_label = models.CharField(max_length=16)
    event = models.CharField(max_length=256)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]


class SensorStep(models.Model):
    STATUS_CHOICES = [
        ("connected", "Connected"),
        ("syncing", "Syncing"),
        ("pending", "Pending"),
    ]

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="sensor_steps")
    label = models.CharField(max_length=64)
    icon = models.CharField(max_length=32)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return self.label


class ActivityLog(models.Model):
    action = models.CharField(max_length=128)
    patient_name = models.CharField(max_length=128)
    time_label = models.CharField(max_length=32)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.action


class ConsultationQueue(models.Model):
    patient = models.OneToOneField(Patient, on_delete=models.CASCADE, related_name="queue_entry")
    queue_position = models.PositiveIntegerField()
    estimated_wait_minutes = models.PositiveIntegerField()

    def __str__(self):
        return f"Queue #{self.queue_position} — {self.patient_id}"


class Consultation(models.Model):
    STATUS_CHOICES = [
        ("waiting", "Waiting"),
        ("accepted", "Accepted"),
        ("rejected", "Rejected"),
        ("ended", "Ended"),
    ]

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="consultations")
    doctor = models.ForeignKey(Doctor, on_delete=models.SET_NULL, null=True, blank=True, related_name="consultations")
    room_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="waiting")
    requested_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    duration = models.IntegerField(null=True, blank=True)

    class Meta:
        ordering = ["-requested_at"]

    def __str__(self):
        return f"Consultation {self.id} ({self.status}) - Patient: {self.patient.name}"

