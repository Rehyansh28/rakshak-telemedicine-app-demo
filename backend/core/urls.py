from django.urls import path

from . import views

urlpatterns = [
    path("auth/login/", views.LoginView.as_view(), name="auth-login"),
    path("auth/superadmin/login/", views.SuperAdminLoginView.as_view(), name="auth-superadmin-login"),

    path("admin/doctors/", views.AdminDoctorListCreateView.as_view(), name="admin-doctor-list-create"),
    path("admin/doctors/<int:doctor_id>/", views.AdminDoctorDetailView.as_view(), name="admin-doctor-detail"),
    path("admin/patients/", views.AdminPatientListCreateView.as_view(), name="admin-patient-list-create"),
    path("admin/patients/<str:soldier_id>/", views.AdminPatientDetailView.as_view(), name="admin-patient-detail"),
    path("doctor/me/", views.DoctorMeView.as_view(), name="doctor-me"),
    path("config/", views.ConfigView.as_view(), name="config"),
    path("patients/", views.PatientListView.as_view(), name="patient-list"),
    path("patients/<str:soldier_id>/", views.PatientDetailView.as_view(), name="patient-detail"),
    path("patients/<str:soldier_id>/organs/", views.PatientOrgansView.as_view(), name="patient-organs"),
    path(
        "patients/<str:soldier_id>/ai-insights/",
        views.PatientAIInsightsView.as_view(),
        name="patient-ai-insights",
    ),
    path(
        "patients/<str:soldier_id>/medical-report/",
        views.PatientMedicalReportView.as_view(),
        name="patient-medical-report",
    ),
    path(
        "patients/<str:soldier_id>/sensor-steps/",
        views.PatientSensorStepsView.as_view(),
        name="patient-sensor-steps",
    ),
    path(
        "patients/<str:soldier_id>/vitals/jitter/",
        views.PatientVitalsJitterView.as_view(),
        name="patient-vitals-jitter",
    ),
    path("emergency-alerts/", views.EmergencyAlertsView.as_view(), name="emergency-alerts"),
    path("ai-recommendations/", views.AIRecommendationsView.as_view(), name="ai-recommendations"),
    path("activity/", views.ActivityView.as_view(), name="activity"),
    path("dashboard/stats/", views.DashboardStatsView.as_view(), name="dashboard-stats"),
    path("queue/<str:soldier_id>/", views.QueueView.as_view(), name="queue"),
]
