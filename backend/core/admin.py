from django.contrib import admin

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

admin.site.register(SystemConfig)
admin.site.register(Doctor)
admin.site.register(Patient)
admin.site.register(EmergencyAlert)
admin.site.register(AIRecommendation)
admin.site.register(OrganDiagnostic)
admin.site.register(AIInsight)
admin.site.register(MedicalReport)
admin.site.register(ReportOrgan)
admin.site.register(ReportTimelineEvent)
admin.site.register(SensorStep)
admin.site.register(ActivityLog)
admin.site.register(ConsultationQueue)
