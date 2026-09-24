"""Handler for {"type":"imu"} - 10 samples [ax,ay,az,gx,gy,gz,pitch,roll] at 100 Hz."""
from __future__ import annotations

from ..imu_analysis import ImuAnalyzer
from ..protocol import BadMessage, number
from .base import SensorHandler, register

FIELDS = ["ax", "ay", "az", "gx", "gy", "gz", "pitch", "roll"]


@register
class ImuHandler(SensorHandler):
    msg_type = "imu"
    label = "IMU"

    def __init__(self, device, config):
        super().__init__(device, config)
        self.analyzer = ImuAnalyzer(config.imu)
        self.fs = None

    def calibrate(self):
        self.analyzer.start_calibration()

    def on_message(self, msg, now):
        samples = msg.get("samples")
        if not isinstance(samples, list) or not samples or len(samples) > 1000:
            raise BadMessage("imu samples missing")
        fs = number(msg.get("fs", 100), "fs")
        if fs <= 0:
            raise BadMessage("imu fs must be > 0")
        t0 = number(msg.get("t0"), "t0") / 1000.0

        # The status message says the order of the fields; fall back to the documented order.
        fields = self.device.info.get("imu_fields") or FIELDS
        try:
            index = [fields.index(name) for name in FIELDS]
        except ValueError:
            index = list(range(len(FIELDS)))

        rows = []
        for i, sample in enumerate(samples):
            if not isinstance(sample, list) or len(sample) < len(FIELDS):
                raise BadMessage("imu sample has too few values")
            values = [number(sample[j], "imu value") for j in index]
            rows.append((t0 + i / fs, *values))

        if self.seq.update(msg.get("seq", 0)) < 0:
            self.device.log("IMU sequence restarted (ESP32 reset or replay loop)")
        self.fs = fs
        self.analyzer.add_samples(rows)
        self.count(now, len(rows))

    def tick(self, now):
        super().tick(now)
        alerts = self.device.alerts
        for kind, details in self.analyzer.pop_events():
            if kind == "fall":
                alerts.fire(
                    "fall",
                    "critical",
                    "Possible fall detected",
                    f"Hard impact ({details['peak_g']} g) followed by lying down.",
                )
            elif kind == "calibrated":
                self.device.log(
                    f"Calibrated: upright = {details['up']} (gravity {details['g']} g). "
                    "Type c + Enter to calibrate again."
                )
            elif kind == "calibration_slow":
                self.device.log("Still waiting to calibrate: the person must stand still for a few seconds.")

        wait = self.config.imu.no_movement_alert_after_s
        still_for = self.analyzer.no_movement_for()
        if still_for >= wait:
            where = " while lying down" if self.config.imu.no_movement_only_when_lying else ""
            alerts.raise_(
                "no_movement",
                "critical",
                "No movement",
                f"No movement for more than {wait:g} s{where} - possibly unconscious.",
            )
        elif still_for == 0:
            alerts.clear("no_movement")

    def summary(self, now):
        data = super().summary(now)
        data["fs"] = self.fs
        data.update(self.analyzer.summary())
        return data
