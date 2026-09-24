"""Turn one text line from the ESP32 into a message dict (or None if it is broken)."""
from __future__ import annotations

import json
import math
import re

ESP_IDF_LOG = re.compile(r"^[EWIDV] \(\d+\) ")
BOOT_TEXT = ("ets ", "rst:", "boot:", "load:", "entry ", "configsip", "clk_drv", "mode:", "ho ", "SPIWP")


def parse_line(line):
    """Return the message as a dict, or None for anything that is not a valid message.

    Broken lines are normal (e.g. boot text right after the ESP32 resets, or a
    half line when we connect in the middle of a message), so we never raise here.
    """
    line = line.strip()
    if not (line.startswith("{") and line.endswith("}")):
        return None
    try:
        msg = json.loads(line)
    except ValueError:
        return None
    if not isinstance(msg, dict) or not isinstance(msg.get("type"), str):
        return None
    return msg


def describe_ignored(line):
    """Short label for a line that is not a valid message (shown to the user)."""
    text = line.strip()
    if not text:
        return "empty line"
    if ESP_IDF_LOG.match(text):
        return "ESP-IDF log message"
    if text.startswith(BOOT_TEXT):
        return "ESP32 boot text"
    if text.startswith("{") or text.endswith("}") or '"type"' in text:
        return "cut / broken message"
    return "other text"


class BadMessage(Exception):
    """A line was valid JSON but its content does not make sense."""


def number(value, name):
    """Return value as float, or raise BadMessage (bools and NaN are rejected)."""
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise BadMessage(f"{name} is not a number: {value!r}")
    return float(value)


def optional_number(value):
    """Return value as float, or None when it is null / not a usable number."""
    try:
        return number(value, "")
    except BadMessage:
        return None
