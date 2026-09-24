"""Load hub settings from config.ini.

Every setting has a default below, so a missing line in config.ini is fine.
The type of each default (int / float / bool / str) is also the type we read.
"""
from __future__ import annotations

import configparser
from types import SimpleNamespace

DEFAULTS = {
    "serial": {
        "port": "auto",
        "baud": 921600,
        "reconnect_interval_s": 2.0,
    },
    "timeouts": {
        "disconnect_after_s": 3.0,
        "stale_after_s": 2.0,
    },
    "ecg": {
        "leads_off_alert_after_s": 3.0,
        "hr_min_valid": 25.0,
        "hr_max_valid": 250.0,
    },
    "imu": {
        "calibrate_seconds": 3.0,
        "calibrate_max_accel_std_g": 0.03,
        "calibrate_timeout_s": 20.0,
        "chest_normal_axis": "+z",
        "gravity_filter_s": 0.5,
        "upright_max_deg": 35.0,
        "lying_min_deg": 60.0,
        "posture_hold_s": 1.0,
        "activity_window_s": 1.5,
        "moving_accel_std_g": 0.05,
        "moving_gyro_dps": 25.0,
        "fall_impact_g": 2.0,
        "fall_require_freefall": False,
        "freefall_g": 0.5,
        "freefall_window_s": 1.0,
        "fall_confirm_s": 2.0,
        "fall_cooldown_s": 30.0,
        "no_movement_alert_after_s": 30.0,
        "no_movement_only_when_lying": True,
    },
    "hub": {
        "summary_interval_s": 1.0,
    },
}


class ConfigError(Exception):
    pass


def load_config(path=None):
    """Return settings as ``cfg.<section>.<name>`` plus ``cfg.devices`` (dev -> soldier ID)."""
    parser = configparser.ConfigParser(inline_comment_prefixes=("#", ";"))
    parser.optionxform = str  # keep the case of device names
    if path:
        if not parser.read(path, encoding="utf-8"):
            raise ConfigError(f"Config file not found: {path}")

    sections = {}
    for section, defaults in DEFAULTS.items():
        values = {}
        for name, default in defaults.items():
            if not parser.has_option(section, name):
                values[name] = default
                continue
            try:
                if isinstance(default, bool):
                    values[name] = parser.getboolean(section, name)
                elif isinstance(default, int):
                    values[name] = parser.getint(section, name)
                elif isinstance(default, float):
                    values[name] = parser.getfloat(section, name)
                else:
                    values[name] = parser.get(section, name).strip()
            except ValueError:
                raise ConfigError(
                    f"[{section}] {name} = {parser.get(section, name)!r} is not a valid "
                    f"{type(default).__name__}"
                ) from None
        sections[section] = SimpleNamespace(**values)

    devices = {}
    if parser.has_section("devices"):
        devices = {dev: soldier.strip() for dev, soldier in parser.items("devices") if soldier.strip()}

    return SimpleNamespace(devices=devices, **sections)
