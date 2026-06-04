from .models import SensorStep

DEFAULT_SENSOR_STEPS = [
    {"label": "ECG Patch", "icon": "heart", "status": "pending"},
    {"label": "SpO2 Sensor", "icon": "droplets", "status": "pending"},
    {"label": "Temp Probe", "icon": "thermometer", "status": "pending"},
    {"label": "STRAT-LINK", "icon": "shield", "status": "pending"},
]


def bootstrap_patient_session(patient):
    """Default sensor steps for staff-led bio-suit setup."""
    for i, step in enumerate(DEFAULT_SENSOR_STEPS, start=1):
        SensorStep.objects.get_or_create(
            patient=patient,
            order=i,
            defaults=step,
        )


def apply_patient_fields(patient, data):
    """Apply camelCase or snake_case patient profile/vitals fields from request data."""
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
            if field in (
                "altitude",
                "heart_rate",
                "spo2",
                "fatigue",
                "stress",
                "respiration",
                "bp_systolic",
                "bp_diastolic",
            ):
                val = int(val)
            elif field == "temp":
                val = float(val)
            setattr(patient, field, val)


def build_patient_create_data(request_data):
    """Build kwargs for Patient.objects.create from staff/admin payload."""
    soldier_id = request_data.get("soldierId") or request_data.get("soldier_id") or ""
    return soldier_id, {
        "soldier_id": soldier_id,
        "name": request_data.get("name", ""),
        "rank": request_data.get("rank", "Soldier"),
        "regiment": request_data.get("regiment", "Unassigned"),
        "status": request_data.get("status", "stable"),
        "altitude": int(request_data.get("altitude", 0) or 0),
        "heart_rate": int(request_data.get("heartRate", request_data.get("heart_rate", 72)) or 72),
        "spo2": int(request_data.get("spo2", 98) or 98),
        "temp": float(request_data.get("temp", 36.8) or 36.8),
        "fatigue": int(request_data.get("fatigue", 0) or 0),
        "stress": int(request_data.get("stress", 0) or 0),
        "location": request_data.get("location", "Field Post"),
        "last_update_label": request_data.get("lastUpdate", "just now") or "just now",
        "respiration": int(request_data.get("respiration", 16) or 16),
        "bp_systolic": int(request_data.get("bpSystolic", 120) or 120),
        "bp_diastolic": int(request_data.get("bpDiastolic", 80) or 80),
    }
