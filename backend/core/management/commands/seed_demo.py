from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone

from core.models import (
    ActivityLog,
    AIInsight,
    AIRecommendation,
    ConsultationQueue,
    Doctor,
    MedicalStaff,
    EmergencyAlert,
    MedicalReport,
    OrganDiagnostic,
    Patient,
    ReportOrgan,
    ReportTimelineEvent,
    SensorStep,
    SystemConfig,
)

PATIENTS = [
    {
        "soldier_id": "IA-SLD-2847",
        "name": "Nk. Rajesh Kumar",
        "rank": "Naik",
        "regiment": "14 Rajput",
        "status": "critical",
        "altitude": 14200,
        "heart_rate": 118,
        "spo2": 89,
        "temp": 37.8,
        "fatigue": 78,
        "stress": 72,
        "location": "Siachen Forward Post",
        "last_update_label": "2 min ago",
    },
    {
        "soldier_id": "IA-SLD-1923",
        "name": "Hav. Vikram Singh",
        "rank": "Havildar",
        "regiment": "9 Para SF",
        "status": "monitoring",
        "altitude": 11800,
        "heart_rate": 72,
        "spo2": 97,
        "temp": 36.4,
        "fatigue": 42,
        "stress": 35,
        "location": "Leh Sector HQ",
        "last_update_label": "5 min ago",
    },
    {
        "soldier_id": "IA-SLD-3102",
        "name": "Sep. Amit Sharma",
        "rank": "Sepoy",
        "regiment": "5 Gorkha Rifles",
        "status": "stable",
        "altitude": 9800,
        "heart_rate": 68,
        "spo2": 99,
        "temp": 36.2,
        "fatigue": 28,
        "stress": 22,
        "location": "Dras Medical Camp",
        "last_update_label": "12 min ago",
    },
    {
        "soldier_id": "IA-SLD-4451",
        "name": "Lt. Priya Nair",
        "rank": "Lieutenant",
        "regiment": "Army Medical Corps",
        "status": "consultation",
        "altitude": 10500,
        "heart_rate": 76,
        "spo2": 96,
        "temp": 36.6,
        "fatigue": 55,
        "stress": 48,
        "location": "Kargil Relay Station",
        "last_update_label": "LIVE",
    },
]

ORGAN_DATA = {
    "heart": {
        "label": "Cardiac System",
        "bpm": 72,
        "rhythm": "Sinus Rhythm",
        "sound": "S1/S2 Normal",
        "risk": "Moderate",
        "ecg_points": [20, 25, 80, 30, 22, 28, 75, 32, 24, 26, 78, 28, 21, 27, 82, 31],
    },
    "lungs": {"label": "Pulmonary", "spo2": 98, "capacity": "4.2L", "risk": "Low"},
    "brain": {"label": "Neural Stress", "score": 68, "cortisol": "Elevated", "risk": "Moderate"},
    "chest": {"label": "Thoracic", "o2": 98, "pressure": "Normal", "risk": "Low"},
    "arms": {"label": "Peripheral BP", "systolic": 120, "diastolic": 80, "risk": "Low"},
    "legs": {"label": "Circulation", "perfusion": "Good", "edema": "None", "risk": "Low"},
    "nose": {"label": "Respiration", "rate": 16, "pattern": "Regular", "risk": "Low"},
}

AI_INSIGHTS = {
    "fatigue_prediction": 78,
    "altitude_sickness_risk": 85,
    "cardiac_risk": 62,
    "stress_score": 72,
    "readiness": 45,
    "trends": {
        "heartRate": [
            {"t": "00:00", "v": 68},
            {"t": "04:00", "v": 72},
            {"t": "08:00", "v": 85},
            {"t": "12:00", "v": 98},
            {"t": "16:00", "v": 110},
            {"t": "20:00", "v": 118},
        ],
        "spo2": [
            {"t": "00:00", "v": 97},
            {"t": "04:00", "v": 96},
            {"t": "08:00", "v": 94},
            {"t": "12:00", "v": 92},
            {"t": "16:00", "v": 90},
            {"t": "20:00", "v": 89},
        ],
        "stress": [
            {"t": "Mon", "v": 45},
            {"t": "Tue", "v": 52},
            {"t": "Wed", "v": 58},
            {"t": "Thu", "v": 65},
            {"t": "Fri", "v": 72},
        ],
    },
}

EXTRA_AI_RECOMMENDATIONS = [
    "Immediate O2 supplementation recommended — SpO2 below 90%",
    "Schedule monitored descent within 6 hours per altitude protocol",
    "Administer acetazolamide 250mg — AMS Stage II indicators",
    "Cardiac monitoring — sustained tachycardia pattern detected",
    "Rest cycle: minimum 8 hours before next patrol assignment",
]


class Command(BaseCommand):
    help = "Seed database with demo telemedicine data"

    def handle(self, *args, **options):
        self.stdout.write("Clearing existing data...")
        for model in [
            ReportTimelineEvent,
            ReportOrgan,
            MedicalReport,
            AIInsight,
            OrganDiagnostic,
            SensorStep,
            EmergencyAlert,
            AIRecommendation,
            ActivityLog,
            ConsultationQueue,
            Patient,
            Doctor,
            MedicalStaff,
            SystemConfig,
        ]:
            model.objects.all().delete()

        SystemConfig.objects.create(
            secure_node="JOD-01",
            uplink_data={
                "stratLink": {"label": "STRAT-LINK", "status": "Strong"},
                "satNode": {"label": "SAT-NODE", "status": "Strong"},
                "latency": {"label": "Latency", "status": "42 ms"},
                "bioSuitPower": {"label": "Bio-Suit Power", "status": "87%"},
            },
        )

        user, created = User.objects.get_or_create(
            username="doctor",
            defaults={"email": "doctor@rakshak.mil"},
        )
        if created:
            user.set_password("rakshak2026")
            user.save()

        doctor, _ = Doctor.objects.update_or_create(
            user=user,
            defaults={
                "name": "Col. Dr. Arjun Mehta",
                "rank": "Colonel",
                "unit": "Army Medical Corps",
                "avatar_url": (
                    "https://lh3.googleusercontent.com/aida-public/AB6AXuAGu5kWmnvvYL57JiCxZgBaoPiswIFoiq1OjqJo8nVcpgCcWwxrGWkwk5k-e3mf7O3XxL2wbgT6yYI6vGl5T9-F6w8xW30TCqdFXSxGDCthuDGz5dixKvCCbjjq6sZ4TtdsaHUrfKK8S7sTeNC3iHVe7CDmnwR8CdEGsDCAzpXJZfIGK8w1TM7TiEWJYvWRNgl1Ic031opu6Izn4vegNy65Px5lh0hLqPyzTTNkaVTOczTIQ_8_5Sn5VVMj9XtZsnizBRotC0mnKB0"
                ),
            },
        )

        admin_user, admin_created = User.objects.get_or_create(
            username="superadmin",
            defaults={"email": "superadmin@rakshak.mil", "is_staff": True, "is_superuser": True},
        )
        if admin_created:
            admin_user.set_password("rakshak2026")
            admin_user.save()

        primary_admin, primary_admin_created = User.objects.get_or_create(
            username="admin",
            defaults={"email": "admin@example.com", "is_staff": True, "is_superuser": True},
        )
        primary_admin.email = "admin@example.com"
        primary_admin.is_staff = True
        primary_admin.is_superuser = True
        if primary_admin_created:
            primary_admin.set_password("admin")
            primary_admin.save()

        staff_user, staff_created = User.objects.get_or_create(
            username="fieldmedic",
            defaults={"email": "fieldmedic@rakshak.mil"},
        )
        if staff_created:
            staff_user.set_password("rakshak2026")
            staff_user.save()

        MedicalStaff.objects.update_or_create(
            user=staff_user,
            defaults={
                "name": "Capt. Priya Sharma",
                "rank": "Captain",
                "post": "Field Medical Post — Ladakh",
            },
        )

        patients = {}
        for pdata in PATIENTS:
            patient = Patient.objects.create(**pdata)
            patients[pdata["soldier_id"]] = patient

            for organ_id, data in ORGAN_DATA.items():
                OrganDiagnostic.objects.create(
                    patient=patient, organ_id=organ_id, data=data
                )

            AIInsight.objects.create(patient=patient, **AI_INSIGHTS)

            for i, step in enumerate(
                [
                    {"label": "ECG Patch", "icon": "heart", "status": "connected"},
                    {"label": "SpO2 Sensor", "icon": "droplets", "status": "connected"},
                    {"label": "Temp Probe", "icon": "thermometer", "status": "syncing"},
                    {"label": "STRAT-LINK", "icon": "shield", "status": "pending"},
                ],
                start=1,
            ):
                SensorStep.objects.create(patient=patient, order=i, **step)

        alerts_data = [
            {
                "patient": patients["IA-SLD-2847"],
                "alert_type": "critical",
                "title": "SpO2 Critical Drop",
                "message": "Oxygen saturation dropped to 89% — altitude sickness risk HIGH",
                "time_label": "00:42 ago",
            },
            {
                "patient": patients["IA-SLD-2847"],
                "alert_type": "warning",
                "title": "Elevated Heart Rate",
                "message": "Sustained tachycardia at 118 BPM for 15 minutes",
                "time_label": "03:15 ago",
            },
            {
                "patient": patients["IA-SLD-1923"],
                "alert_type": "info",
                "title": "AI Recommendation",
                "message": "Schedule hydration protocol — fatigue index rising",
                "time_label": "08:22 ago",
            },
        ]
        for alert in alerts_data:
            EmergencyAlert.objects.create(**alert)

        global_recs = [
            "Initiate supplemental O2 protocol for IA-SLD-2847",
            "Monitor cardiac rhythm — irregular pattern detected",
            "Recommend descent to 10,000 ft within 6 hours",
            "Administer acetazolamide per altitude protocol",
        ]
        for i, text in enumerate(global_recs):
            AIRecommendation.objects.create(text=text, order=i)

        for i, text in enumerate(EXTRA_AI_RECOMMENDATIONS):
            AIRecommendation.objects.create(
                text=text, patient=patients["IA-SLD-2847"], order=i + 10
            )

        activities = [
            ("Consultation ended", "Sep. Amit Sharma", "18 min ago"),
            ("Report generated", "Hav. Vikram Singh", "1 hr ago"),
            ("Emergency alert resolved", "Lt. Priya Nair", "2 hr ago"),
        ]
        for action, patient_name, time_label in activities:
            ActivityLog.objects.create(
                action=action, patient_name=patient_name, time_label=time_label
            )

        ConsultationQueue.objects.create(
            patient=patients["IA-SLD-2847"],
            queue_position=2,
            estimated_wait_minutes=4,
        )

        primary = patients["IA-SLD-2847"]
        report = MedicalReport.objects.create(
            patient=primary,
            report_id="RXR-2026-IA-2847",
            diagnosis="Acute Mountain Sickness (AMS) — Stage II",
            notes=(
                "Patient presents with symptoms consistent with high-altitude hypoxia. "
                "Recommend immediate O2 supplementation and monitored descent. "
                "Follow-up in 4 hours."
            ),
            hash_value="SHA-256: a3f8c2...9d4e1b",
            doctor=doctor,
            generated_at=timezone.now(),
        )
        organs = [
            ("Heart", "Tachycardia", "118 BPM"),
            ("Lungs", "Hypoxemia", "SpO2 89%"),
            ("Brain", "Stress Elevated", "Score 72"),
        ]
        for i, (name, status, value) in enumerate(organs):
            ReportOrgan.objects.create(
                report=report, name=name, status=status, value=value, order=i
            )
        timeline = [
            ("14:32", "Sensor sync initiated"),
            ("14:35", "Vitals baseline captured"),
            ("14:41", "AI alert: SpO2 drop detected"),
            ("14:45", "Live consultation started"),
            ("14:52", "AR diagnostic scan complete"),
        ]
        for i, (time_label, event) in enumerate(timeline):
            ReportTimelineEvent.objects.create(
                report=report, time_label=time_label, event=event, order=i
            )

        self.stdout.write(self.style.SUCCESS("Demo data seeded successfully."))
        self.stdout.write("Login: doctor / rakshak2026")
