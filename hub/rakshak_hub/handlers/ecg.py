"""Handler for {"type":"ecg"} - 25 raw ADC samples (0-4095) at 250 Hz, 10 times a second.

Besides the ESP32's own "leads_off" flag, the hub checks the raw signal itself,
because some faults look like "electrodes on" to the ESP32 (e.g. the AD8232
losing power: OUTPUT reads 0 and LO+/LO- read LOW). A good ECG wanders around
the middle of the range (~2000) with beats on top; a bad one is flat, sits near
0 or 4095, or keeps hitting the ends (clipping). While the signal is bad the
ESP32's bpm is ignored, because it may repeat an old value.
"""
from __future__ import annotations

from collections import deque

from ..protocol import BadMessage, number, optional_number
from .base import SensorHandler, register

ADC_MAX = 4095
# A valid heart rate from the ESP32 is kept this long, then shown as unknown.
BPM_MAX_AGE_S = 5.0
# Samples this close to 0 / 4095 count as "hitting the end" (clipped).
CLIP_MARGIN = 2

SIGNAL_TEXT = {
    "ok": "good",
    "flat": "flat - no heartbeat signal (loose AD8232 power / ground wire?)",
    "near_rail": "stuck near 0 or 4095 (loose wire or bad electrode contact?)",
    "clipping": "hitting 0 / 4095 all the time (movement or bad electrode contact?)",
}


def judge_signal(window, cfg, flat_range=None):
    """Return "ok", "flat", "near_rail" or "clipping" for the recent samples."""
    flat_range = cfg.flat_range_counts if flat_range is None else flat_range
    total = sum(n for _, n, _, _, _, _ in window)
    low = min(lo for _, _, lo, _, _, _ in window)
    high = max(hi for _, _, _, hi, _, _ in window)
    near_rail = sum(nr for _, _, _, _, nr, _ in window)
    clipped = sum(c for _, _, _, _, _, c in window)
    if high - low < flat_range:
        return "flat"
    if clipped / total > cfg.max_clipped_fraction:
        return "clipping"
    if near_rail / total > cfg.max_near_rail_fraction:
        return "near_rail"
    return "ok"


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
        # Signal quality over the last few seconds.
        self.window = deque()  # (time, samples, min, max, near-rail count, clipped count)
        self.signal = None  # "ok" / "flat" / "near_rail" / "clipping" / None (not enough data yet)
        self.signal_bad_since = None
        self.signal_ok_since = None
        # Raw signal range since the last summary (for the console).
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

        message_ok = self._update_signal(values, now)
        if leads_off:
            self.signal_bad_since = None  # "electrodes off" explains it; time a bad signal only once they are on

        bpm = optional_number(msg.get("bpm"))
        ecg_cfg = self.config.ecg
        settled = self.signal_ok_since is not None and now - self.signal_ok_since >= ecg_cfg.hr_settle_s
        if (
            bpm is not None
            and not leads_off
            and settled
            and message_ok
            and ecg_cfg.hr_min_valid <= bpm <= ecg_cfg.hr_max_valid
        ):
            self.bpm, self.bpm_at = bpm, now

        low, high = min(values), max(values)
        self.raw_min = low if self.raw_min is None else min(self.raw_min, low)
        self.raw_max = high if self.raw_max is None else max(self.raw_max, high)
        self.count(now, len(values))

    def _update_signal(self, values, now):
        cfg = self.config.ecg
        margin = cfg.rail_margin_counts
        self.window.append((
            now,
            len(values),
            min(values),
            max(values),
            sum(1 for v in values if v <= margin or v >= ADC_MAX - margin),
            sum(1 for v in values if v <= CLIP_MARGIN or v >= ADC_MAX - CLIP_MARGIN),
        ))
        while self.window and self.window[0][0] < now - cfg.signal_window_s:
            self.window.popleft()
        # This message alone (0.1 s) must also look sane before its bpm is used, so a
        # fault is caught at once. Between beats the signal is calm, hence the lower flat limit.
        message_ok = judge_signal([self.window[-1]], cfg, cfg.flat_range_counts / 4) == "ok"
        if now - self.window[0][0] < 0.5 * cfg.signal_window_s:
            return message_ok  # not enough data yet to judge the window
        self.signal = judge_signal(self.window, cfg)
        if self.signal == "ok":
            self.signal_bad_since = None
            if self.signal_ok_since is None:
                self.signal_ok_since = now
        else:
            self.signal_ok_since = None
            if self.signal_bad_since is None and not self.leads_off:
                self.signal_bad_since = now
            self.bpm = None  # never show an old heart rate after the signal went bad
        return message_ok

    def heart_rate(self, now):
        """Latest trustworthy heart rate, or None (unknown / too old / electrodes off / bad signal)."""
        if self.bpm is None or self.leads_off or self.signal != "ok" or now - self.bpm_at > BPM_MAX_AGE_S:
            return None
        return self.bpm

    def tick(self, now):
        super().tick(now)
        cfg = self.config.ecg
        alerts = self.device.alerts
        if self.leads_off_since is not None and now - self.leads_off_since >= cfg.leads_off_alert_after_s:
            alerts.raise_(
                "leads_off",
                "warning",
                "ECG electrodes off",
                "An ECG electrode seems to be off the skin. Check the pads and wires.",
            )
        elif self.leads_off_since is None:
            alerts.clear("leads_off")

        # "Electrodes off" already explains a bad signal, so only one of the two alerts.
        if (
            self.signal_bad_since is not None
            and self.leads_off_since is None
            and now - self.signal_bad_since >= cfg.poor_signal_alert_after_s
        ):
            alerts.raise_(
                "ecg_signal",
                "warning",
                "ECG signal poor",
                f"The ECG signal is {SIGNAL_TEXT[self.signal]}. Heart rate is hidden until it is good again.",
            )
        elif self.signal_bad_since is None or self.leads_off_since is not None:
            alerts.clear("ecg_signal")

    def summary(self, now):
        data = super().summary(now)
        hr = self.heart_rate(now)
        data.update(
            {
                "hr": None if hr is None else round(hr),
                "leadsOff": self.leads_off,
                "signal": self.signal,
                "fs": self.fs,
                "rawMin": self.raw_min,
                "rawMax": self.raw_max,
            }
        )
        self.raw_min = self.raw_max = None
        return data
