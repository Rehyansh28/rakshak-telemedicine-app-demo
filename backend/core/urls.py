from django.urls import path

from . import admin_views, hub_views, views

urlpatterns = [
    path("auth/login/", views.LoginView.as_view(), name="auth-login"),
    path("auth/staff/login/", views.StaffLoginView.as_view(), name="auth-staff-login"),
    path("auth/superadmin/login/", views.SuperAdminLoginView.as_view(), name="auth-superadmin-login"),

    # Super admin — full data management
    path("admin/overview/", admin_views.AdminOverviewView.as_view(), name="admin-overview"),
    path("admin/system-config/", admin_views.AdminSystemConfigView.as_view(), name="admin-system-config"),
    path("admin/doctors/", admin_views.AdminDoctorListCreateView.as_view(), name="admin-doctor-list-create"),
    path("admin/doctors/<int:doctor_id>/", admin_views.AdminDoctorDetailView.as_view(), name="admin-doctor-detail"),
    path(
        "admin/medical-staff/",
        admin_views.AdminMedicalStaffListCreateView.as_view(),
        name="admin-medical-staff-list-create",
    ),
    path(
        "admin/medical-staff/<int:staff_id>/",
        admin_views.AdminMedicalStaffDetailView.as_view(),
        name="admin-medical-staff-detail",
    ),
    path("admin/patients/", admin_views.AdminPatientListCreateView.as_view(), name="admin-patient-list-create"),
    path("admin/patients/<str:soldier_id>/", admin_views.AdminPatientDetailView.as_view(), name="admin-patient-detail"),
    path("admin/activity/", admin_views.AdminActivityListCreateView.as_view(), name="admin-activity-list"),
    path("admin/activity/<int:log_id>/", admin_views.AdminActivityDetailView.as_view(), name="admin-activity-detail"),
    path("admin/alerts/", admin_views.AdminAlertListCreateView.as_view(), name="admin-alert-list"),
    path("admin/alerts/<int:alert_id>/", admin_views.AdminAlertDetailView.as_view(), name="admin-alert-detail"),
    path("admin/recommendations/", admin_views.AdminRecommendationListCreateView.as_view(), name="admin-rec-list"),
    path(
        "admin/recommendations/<int:rec_id>/",
        admin_views.AdminRecommendationDetailView.as_view(),
        name="admin-rec-detail",
    ),
    path("admin/reports/", admin_views.AdminReportListView.as_view(), name="admin-report-list"),
    path("admin/reports/<int:report_id>/", admin_views.AdminReportDetailView.as_view(), name="admin-report-detail"),
    path("admin/queue/", admin_views.AdminQueueListView.as_view(), name="admin-queue-list"),
    path("admin/queue/<int:queue_id>/", admin_views.AdminQueueDetailView.as_view(), name="admin-queue-detail"),
    path("admin/insights/<int:insight_id>/", admin_views.AdminInsightDetailView.as_view(), name="admin-insight-detail"),
    path("admin/sensor-steps/<int:step_id>/", admin_views.AdminSensorStepDetailView.as_view(), name="admin-step-detail"),
    path("admin/organs/<int:organ_id>/", admin_views.AdminOrganDetailView.as_view(), name="admin-organ-detail"),

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
    path("patients/<str:soldier_id>/sensor/", hub_views.PatientSensorView.as_view(), name="patient-sensor"),
    path("hub/ingest/", hub_views.HubIngestView.as_view(), name="hub-ingest"),
    path("emergency-alerts/", views.EmergencyAlertsView.as_view(), name="emergency-alerts"),
    path("ai-recommendations/", views.AIRecommendationsView.as_view(), name="ai-recommendations"),
    path("activity/", views.ActivityView.as_view(), name="activity"),
    path("dashboard/stats/", views.DashboardStatsView.as_view(), name="dashboard-stats"),
    path("queue/<str:soldier_id>/enqueue/", views.QueueEnqueueView.as_view(), name="queue-enqueue"),
    path("queue/<str:soldier_id>/", views.QueueView.as_view(), name="queue"),
    path("call/request/", views.CallRequestView.as_view(), name="call-request"),
    path("call/accept/", views.CallAcceptView.as_view(), name="call-accept"),
    path("call/reject/", views.CallRejectView.as_view(), name="call-reject"),
    path("call/end/", views.CallEndView.as_view(), name="call-end"),
    path("call/status/<str:room_id>/", views.CallStatusView.as_view(), name="call-status"),
    path("call/requests/", views.CallRequestsView.as_view(), name="call-requests"),
]
