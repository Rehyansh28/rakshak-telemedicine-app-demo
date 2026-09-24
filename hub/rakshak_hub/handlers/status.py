"""Handler for {"type":"status"} - sent by the ESP32 every 5 seconds."""
from __future__ import annotations

from ..protocol import optional_number
from .base import SensorHandler, register


@register
class StatusHandler(SensorHandler):
    msg_type = "status"
    label = "Status"
    stream = False

    def __init__(self, device, config):
        super().__init__(device, config)
        self.fw = None
        self.uptime_ms = None
        self.imu_ok = None
        self.imu_errors = None
        self.restarts = 0

    def on_message(self, msg, now):
        uptime = optional_number(msg.get("uptime_ms"))
        if uptime is not None and self.uptime_ms is not None and uptime < self.uptime_ms:
            self.restarts += 1
            self.device.log(f"ESP32 restarted (uptime went from {self.uptime_ms / 1000:.0f} s to {uptime / 1000:.0f} s)")
        self.uptime_ms = uptime
        self.fw = msg.get("fw")

        imu = msg.get("imu") if isinstance(msg.get("imu"), dict) else {}
        self.imu_ok = imu.get("ok") if isinstance(imu.get("ok"), bool) else None
        self.imu_errors = optional_number(imu.get("errors"))
        fields = imu.get("fields")
        if isinstance(fields, list) and all(isinstance(f, str) for f in fields):
            self.device.info["imu_fields"] = fields

        if self.imu_ok is False:
            self.device.alerts.raise_(
                "imu_error", "warning", "Motion sensor error", "The ESP32 reports that the IMU is not working."
            )
        elif self.imu_ok:
            self.device.alerts.clear("imu_error")

    def summary(self, now):
        return {
            "fw": self.fw,
            "uptimeS": None if self.uptime_ms is None else round(self.uptime_ms / 1000),
            "imuOk": self.imu_ok,
            "imuErrors": self.imu_errors,
            "restarts": self.restarts,
        }
