"""Message handlers - one module per message ``type`` from the ESP32.

To add a new sensor (for example SpO2):
  1. copy ecg.py to spo2.py, set ``msg_type = "spo2"`` and write ``on_message``;
  2. add ``spo2`` to the import line below.
Messages with a type that has no handler are counted and ignored, never a crash.
"""
from . import ecg, imu, status  # noqa: F401  (importing registers the handlers)
from .base import HANDLERS  # noqa: F401
