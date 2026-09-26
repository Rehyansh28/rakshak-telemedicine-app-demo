"""API for the sensor hub (hub/ folder): per-second summaries and alerts.

EXPERIMENTAL student prototype - sensor values and alerts are not medically validated.
The hub logs in with a Medical Staff account (POST /api/auth/staff/login/) and then
posts to /api/hub/ingest/. The raw ECG waveform is never sent here.
"""
from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import EmergencyAlert, Patient, VitalSummary
from .permissions import IsMedicalStaff
from .serializers import VitalSummarySerializer

# Alert sources made by the hub: "hub" (live sensor) and "hub-replay" (a recording played back).
SENSOR_SOURCES = ("hub", "hub-replay")
# A patient counts as "live" when the latest summary is at most this old.
LIVE_WINDOW = timedelta(seconds=10)
MAX_HISTORY_MINUTES = 60


class SummaryIn(serializers.Serializer):
    soldierId = serializers.CharField(max_length=32)
    dev = serializers.CharField(max_length=64)
    time = serializers.DateTimeField()
    connected = serializers.BooleanField()
    hr = serializers.IntegerField(min_value=0, max_value=400, allow_null=True, required=False)
    ecgSignal = serializers.CharField(max_length=16, allow_null=True, allow_blank=True, required=False)
    leadsOff = serializers.BooleanField(allow_null=True, required=False)
    posture = serializers.CharField(max_length=16, allow_null=True, allow_blank=True, required=False)
    lyingSide = serializers.CharField(max_length=8, allow_null=True, allow_blank=True, required=False)
    activity = serializers.CharField(max_length=8, allow_null=True, allow_blank=True, required=False)
    replay = serializers.BooleanField(default=False)


class AlertIn(serializers.Serializer):
    soldierId = serializers.CharField(max_length=32)
    dev = serializers.CharField(max_length=64)
    key = serializers.CharField(max_length=32)
    level = serializers.ChoiceField(choices=["critical", "warning", "info"])
    title = serializers.CharField(max_length=128)
    message = serializers.CharField(allow_blank=True)
    time = serializers.DateTimeField()
    resolved = serializers.BooleanField(default=False)
    replay = serializers.BooleanField(default=False)


class IngestIn(serializers.Serializer):
    summaries = SummaryIn(many=True, required=False, default=list, max_length=3600)
    alerts = AlertIn(many=True, required=False, default=list, max_length=500)
    # Sent once when the hub starts: close hub alerts still open from an earlier run.
    resolveOpenAlerts = serializers.ListField(
        child=serializers.CharField(max_length=32), required=False, default=list
    )


class HubIngestView(APIView):
    """POST summaries and alerts from the hub. Medical staff login required."""

    permission_classes = [IsMedicalStaff]

    def post(self, request):
        data = IngestIn(data=request.data)
        data.is_valid(raise_exception=True)
        summaries = data.validated_data["summaries"]
        alerts = data.validated_data["alerts"]
        restart_ids = data.validated_data["resolveOpenAlerts"]

        ids = {s["soldierId"] for s in summaries} | {a["soldierId"] for a in alerts} | set(restart_ids)
        patients = Patient.objects.in_bulk(list(ids))
        now = timezone.now()
        created = resolved = 0

        with transaction.atomic():
            if restart_ids:
                resolved += (
                    EmergencyAlert.objects.filter(
                        patient_id__in=[i for i in restart_ids if i in patients],
                        source__in=SENSOR_SOURCES,
                        resolved_at__isnull=True,
                    )
                    .exclude(hub_key="fall")  # a fall is a one-off event, it does not "end"
                    .update(resolved_at=now)
                )

            rows = [
                VitalSummary(
                    patient=patients[s["soldierId"]],
                    device_id=s["dev"],
                    recorded_at=s["time"],
                    connected=s["connected"],
                    heart_rate=s.get("hr"),
                    ecg_signal=s.get("ecgSignal") or "",
                    leads_off=s.get("leadsOff"),
                    posture=s.get("posture") or "",
                    lying_side=s.get("lyingSide") or "",
                    activity=s.get("activity") or "",
                    replay=s["replay"],
                )
                for s in summaries
                if s["soldierId"] in patients
            ]
            VitalSummary.objects.bulk_create(rows)

            # Keep the Patient row (used by the existing pages) up to date: live/offline from the
            # newest summary, heart rate from the newest summary that has one.
            latest, latest_hr = {}, {}
            for row in sorted(rows, key=lambda r: r.recorded_at):
                latest[row.patient_id] = row
                if row.heart_rate is not None:
                    latest_hr[row.patient_id] = row.heart_rate
            for patient_id, row in latest.items():
                patient = patients[patient_id]
                fields = ["last_update_label"]
                if not row.connected:
                    patient.last_update_label = "Sensor offline"
                else:
                    patient.last_update_label = "REPLAY (recorded)" if row.replay else "LIVE (sensor)"
                if patient_id in latest_hr:
                    patient.heart_rate = latest_hr[patient_id]
                    fields.append("heart_rate")
                patient.save(update_fields=fields)

            for a in alerts:
                patient = patients.get(a["soldierId"])
                if patient is None:
                    continue
                if a["resolved"]:
                    resolved += EmergencyAlert.objects.filter(
                        patient=patient, source__in=SENSOR_SOURCES, hub_key=a["key"], resolved_at__isnull=True
                    ).update(resolved_at=a["time"])
                    continue
                EmergencyAlert.objects.create(
                    patient=patient,
                    alert_type=a["level"],
                    title=a["title"],
                    message=a["message"],
                    time_label=timezone.localtime(a["time"]).strftime("%H:%M:%S"),
                    source="hub-replay" if a["replay"] else "hub",
                    hub_key=a["key"],
                    created_at=a["time"],
                )
                created += 1

        return Response(
            {
                "summaries": len(rows),
                "alertsCreated": created,
                "alertsResolved": resolved,
                "unknownSoldiers": sorted(ids - set(patients)),
            },
            status=status.HTTP_201_CREATED,
        )


class PatientSensorView(APIView):
    """GET latest sensor summary + recent history (?minutes=10, max 60) for one patient."""

    permission_classes = [AllowAny]

    def get(self, request, soldier_id):
        if not Patient.objects.filter(soldier_id=soldier_id).exists():
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        try:
            minutes = int(request.query_params.get("minutes", 10))
        except ValueError:
            minutes = 10
        minutes = max(1, min(MAX_HISTORY_MINUTES, minutes))
        now = timezone.now()

        qs = VitalSummary.objects.filter(patient_id=soldier_id)
        latest = qs.first()
        history = qs.filter(recorded_at__gte=now - timedelta(minutes=minutes)).order_by("recorded_at")
        return Response(
            {
                "experimental": True,
                "live": bool(latest and latest.connected and latest.recorded_at >= now - LIVE_WINDOW),
                "replay": bool(latest and latest.replay),
                "latest": VitalSummarySerializer(latest).data if latest else None,
                "history": VitalSummarySerializer(history, many=True).data,
            }
        )


def has_live_sensor(patient):
    """True when the hub sent a summary for this patient in the last minute."""
    return VitalSummary.objects.filter(
        patient=patient, recorded_at__gte=timezone.now() - timedelta(minutes=1)
    ).exists()
