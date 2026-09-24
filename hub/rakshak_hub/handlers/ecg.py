"""Handler for {"type":"ecg"} - 25 raw ADC samples (0-4095) at 250 Hz, 10 times a second."""
from __future__ import annotations

from ..protocol import BadMessage, number, optional_number
from .base import SensorHandler, register

ADC_MAX = 4095
# A valid heart rate from the ESP32 is kept this long, then shown as unknown.
BPM_MAX_AGE_S = 5.0


@register
class EcgHandler(SensorHandler):
    msg_type = "ecg"
    label = "ECG"

    def __init__(self, device, config):
        super().__init__(device, config)
        self.fs = None
        self.bpm = None
        self.bpm_at = None
        self.leads_off = None
        self.leads_off_since = None
        # Raw signal range since the last summary (to spot a flat or clipped signal).
        self.raw_min = None
        self.raw_max = None

    def on_message(self, msg, now):
        samples = msg.get("samples")
        if not isinstance(samples, list) or not samples or len(samples) > 1000:
            raise BadMessage("ecg samples missing")
        values = [number(v, "ecg sample") for v in samples]
        if min(values) < 0 or max(values) > ADC_MAX:
            raise BadMessage("ecg sample outside 0-4095")
        self.fs = number(msg.get("fs", 250), "fs")
        self.seq.update(msg.get("seq", 0))

        leads_off = msg.get("leads_off") is True
        self.leads_off = leads_off
        if leads_off:
            if self.leads_off_since is None:
                self.leads_off_since = now
        else:
            self.leads_off_since = None

        bpm = optional_number(msg.get("bpm"))
        ecg_cfg = self.config.ecg
        if bpm is not None and not leads_off and ecg_cfg.hr_min_valid <= bpm <= ecg_cfg.hr_max_valid:
            self.bpm, self.bpm_at = bpm, now

        low, high = min(values), max(values)
        self.raw_min = low if self.raw_min is None else min(self.raw_min, low)
        self.raw_max = high if self.raw_max is None else max(self.raw_max, high)
        self.count(now, len(values))

    def heart_rate(self, now):
        """Latest valid heart rate, or None when unknown / too old / electrodes off."""
        if self.bpm is None or self.leads_off or now - self.bpm_at > BPM_MAX_AGE_S:
            return None
        return self.bpm

    def tick(self, now):
        super().tick(now)
        wait = self.config.ecg.leads_off_alert_after_s
        if self.leads_off_since is not None and now - self.leads_off_since >= wait:
            self.device.alerts.raise_(
                "leads_off",
                "warning",
                "ECG electrodes off",
                "An ECG electrode seems to be off the skin. Check the pads and wires.",
            )
        elif self.leads_off_since is None:
            self.device.alerts.clear("leads_off")

    def summary(self, now):
        data = super().summary(now)
        hr = self.heart_rate(now)
        data.update(
            {
                "hr": None if hr is None else round(hr),
                "leadsOff": self.leads_off,
                "fs": self.fs,
                "rawMin": self.raw_min,
                "rawMax": self.raw_max,
            }
        )
        self.raw_min = self.raw_max = None
        return data
