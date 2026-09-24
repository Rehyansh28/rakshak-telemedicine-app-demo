from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Doctor, EmergencyAlert, MedicalStaff, Patient, VitalSummary

URL = "/api/hub/ingest/"


def make_patient(soldier_id="SLD-001", heart_rate=75):
    return Patient.objects.create(
        soldier_id=soldier_id, name="Soldier Test", rank="Sepoy", regiment="Test", status="stable",
        altitude=1000, heart_rate=heart_rate, spo2=98, temp=36.5, fatigue=10, stress=12,
        location="Test post", last_update_label="Just now",
    )


def summary(t, hr=72, connected=True, soldier="SLD-001", **extra):
    data = {
        "soldierId": soldier, "dev": "node-01", "time": t.isoformat(), "connected": connected,
        "hr": hr, "ecgSignal": "ok", "leadsOff": False, "posture": "upright", "lyingSide": None,
        "activity": "still",
    }
    data.update(extra)
    return data


def alert(t, key="fall", level="critical", resolved=False, soldier="SLD-001"):
    return {
        "soldierId": soldier, "dev": "node-01", "key": key, "level": level, "title": f"Test {key}",
        "message": "Test message", "time": t.isoformat(), "resolved": resolved,
    }


class HubIngestTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.hub_user = User.objects.create_user(username="hub-node", password="pw")
        MedicalStaff.objects.create(user=self.hub_user, name="Sensor hub", rank="-", post="Hub")
        self.patient = make_patient()
        self.now = timezone.now()

    def post(self, body, user="hub"):
        if user == "hub":
            self.client.force_authenticate(self.hub_user)
        elif user is not None:
            self.client.force_authenticate(user)
        return self.client.post(URL, body, format="json")

    def test_requires_medical_staff(self):
        self.assertIn(self.client.post(URL, {}, format="json").status_code, (401, 403))
        doctor_user = User.objects.create_user(username="doc", password="pw")
        Doctor.objects.create(user=doctor_user, name="Doc", rank="Capt", unit="U")
        self.assertEqual(self.post({}, user=doctor_user).status_code, 403)

    def test_hub_can_log_in_with_staff_login(self):
        res = self.client.post("/api/auth/staff/login/", {"username": "hub-node", "password": "pw"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {res.data['token']}")
        self.assertEqual(self.client.post(URL, {"summaries": []}, format="json").status_code, 201)

    def test_summaries_are_saved_and_update_patient(self):
        res = self.post({"summaries": [summary(self.now - timedelta(seconds=1), hr=70), summary(self.now, hr=81)]})
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["summaries"], 2)
        self.assertEqual(VitalSummary.objects.count(), 2)
        self.patient.refresh_from_db()
        self.assertEqual(self.patient.heart_rate, 81)  # newest summary wins
        self.assertEqual(self.patient.last_update_label, "LIVE (sensor)")

    def test_unknown_hr_does_not_overwrite_patient(self):
        self.post({"summaries": [summary(self.now, hr=None, ecgSignal="flat")]})
        self.patient.refresh_from_db()
        self.assertEqual(self.patient.heart_rate, 75)
        self.assertIsNone(VitalSummary.objects.get().heart_rate)

    def test_hr_comes_from_newest_summary_that_has_one(self):
        self.post({"summaries": [
            summary(self.now - timedelta(seconds=2), hr=66),
            summary(self.now - timedelta(seconds=1), hr=77),
            summary(self.now, hr=None, connected=False),
        ]})
        self.patient.refresh_from_db()
        self.assertEqual((self.patient.heart_rate, self.patient.last_update_label), (77, "Sensor offline"))

    def test_disconnected_summary_marks_offline(self):
        self.post({"summaries": [summary(self.now, hr=None, connected=False)]})
        self.patient.refresh_from_db()
        self.assertEqual(self.patient.last_update_label, "Sensor offline")

    def test_alert_created_and_resolved(self):
        self.post({"alerts": [alert(self.now, key="leads_off", level="warning")]})
        a = EmergencyAlert.objects.get()
        self.assertEqual((a.source, a.hub_key, a.alert_type, a.resolved_at), ("hub", "leads_off", "warning", None))
        self.post({"alerts": [alert(self.now + timedelta(seconds=5), key="leads_off", resolved=True)]})
        a.refresh_from_db()
        self.assertIsNotNone(a.resolved_at)
        self.assertEqual(EmergencyAlert.objects.count(), 1)  # "resolved" does not add a new alert

    def test_hub_restart_closes_old_open_alerts_but_not_falls(self):
        self.post({"alerts": [alert(self.now, key="no_movement"), alert(self.now, key="fall")]})
        res = self.post({"resolveOpenAlerts": ["SLD-001"]})
        self.assertEqual(res.data["alertsResolved"], 1)
        self.assertIsNotNone(EmergencyAlert.objects.get(hub_key="no_movement").resolved_at)
        self.assertIsNone(EmergencyAlert.objects.get(hub_key="fall").resolved_at)

    def test_manual_alerts_are_never_touched(self):
        manual = EmergencyAlert.objects.create(
            patient=self.patient, alert_type="critical", title="Manual", message="m", time_label="1 min ago"
        )
        self.post({"resolveOpenAlerts": ["SLD-001"], "alerts": [alert(self.now, key="fall", resolved=True)]})
        manual.refresh_from_db()
        self.assertIsNone(manual.resolved_at)

    def test_unknown_soldier_is_reported_not_fatal(self):
        res = self.post({"summaries": [summary(self.now, soldier="NOPE")], "alerts": [alert(self.now, soldier="NOPE")]})
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["unknownSoldiers"], ["NOPE"])
        self.assertEqual(VitalSummary.objects.count() + EmergencyAlert.objects.count(), 0)

    def test_bad_input_is_rejected(self):
        self.assertEqual(self.post({"alerts": [dict(alert(self.now), level="panic")]}).status_code, 400)
        self.assertEqual(self.post({"summaries": [{"soldierId": "SLD-001"}]}).status_code, 400)
        self.assertEqual(EmergencyAlert.objects.count() + VitalSummary.objects.count(), 0)

    def test_emergency_alerts_list_shows_new_fields_and_keeps_old_ones(self):
        EmergencyAlert.objects.create(
            patient=self.patient, alert_type="info", title="Old", message="m", time_label="2 min ago"
        )
        self.post({"alerts": [alert(self.now)]})
        data = self.client.get("/api/emergency-alerts/").json()
        self.assertEqual([a["title"] for a in data], ["Old", "Test fall"])
        old, new = data
        for key in ("id", "type", "title", "patient", "soldierId", "message", "time"):
            self.assertIn(key, old)
        self.assertEqual((old["source"], old["createdAt"]), (None, None))
        self.assertEqual(new["source"], "hub")
        self.assertIsNotNone(new["createdAt"])
        self.assertIsNone(new["resolvedAt"])


class PatientSensorViewTests(TestCase):
    def setUp(self):
        self.patient = make_patient()
        self.client = APIClient()

    def add(self, seconds_ago, heart_rate=70):
        VitalSummary.objects.create(
            patient=self.patient, device_id="node-01",
            recorded_at=timezone.now() - timedelta(seconds=seconds_ago), connected=True, heart_rate=heart_rate,
            ecg_signal="ok", leads_off=False, posture="lying", lying_side="back", activity="still",
        )

    def test_latest_and_history(self):
        self.add(20 * 60)  # too old for the default 10 minute history
        self.add(30, heart_rate=71)
        self.add(2, heart_rate=72)
        data = self.client.get("/api/patients/SLD-001/sensor/").json()
        self.assertTrue(data["live"])
        self.assertTrue(data["experimental"])
        self.assertEqual(data["latest"]["heartRate"], 72)
        self.assertEqual(data["latest"]["posture"], "lying")
        self.assertEqual([h["heartRate"] for h in data["history"]], [71, 72])  # oldest first

    def test_not_live_when_old(self):
        self.add(60)
        self.assertFalse(self.client.get("/api/patients/SLD-001/sensor/").json()["live"])

    def test_no_data_and_unknown_patient(self):
        data = self.client.get("/api/patients/SLD-001/sensor/").json()
        self.assertEqual((data["live"], data["latest"], data["history"]), (False, None, []))
        self.assertEqual(self.client.get("/api/patients/NOPE/sensor/").status_code, 404)


class JitterGuardTests(TestCase):
    def setUp(self):
        self.patient = make_patient(heart_rate=75)
        self.client = APIClient()

    def test_jitter_still_changes_hr_without_sensor(self):
        values = set()
        for _ in range(5):
            values.add(self.client.post("/api/patients/SLD-001/vitals/jitter/").json()["heartRate"])
        self.assertNotEqual(values, {75})

    def test_jitter_never_touches_real_hr(self):
        VitalSummary.objects.create(
            patient=self.patient, device_id="node-01", recorded_at=timezone.now(), connected=True, heart_rate=75
        )
        for _ in range(5):
            self.assertEqual(self.client.post("/api/patients/SLD-001/vitals/jitter/").json()["heartRate"], 75)
