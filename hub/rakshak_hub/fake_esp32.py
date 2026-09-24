"""Make fake ESP32 data (same JSON format as the real firmware) for tests and demos.

The fake sensor is "taped on the chest": y axis points to the head, z axis points
out of the chest, x to the side. The ECG is a synthetic heartbeat shape.
This is SIMULATED data - only for testing without hardware.
"""
from __future__ import annotations

import json
import math
import random

ECG_FS = 250
IMU_FS = 100
MSG_PERIOD_S = 0.1

# Gravity reading (what the accelerometer shows) for each posture.
POSES = {
    "upright": (0.0, 1.0, 0.0),
    "back": (0.0, 0.0, 1.0),
    "side": (1.0, 0.0, 0.0),
    "front": (0.0, 0.0, -1.0),
}

# (duration s, pose, activity, heart rate, extra)  activity: still / walk / fall
SCENARIOS = {
    # Matches the planned 60 s real recording.
    "phase1": [
        (15, "upright", "still", 72, {}),
        (15, "upright", "walk", 92, {}),
        (15, "back", "still", 68, {}),
        (15, "side", "still", 66, {}),
    ],
    # Exercises every alert: fall, no movement, electrodes off, disconnect, bad lines.
    "demo": [
        (8, "upright", "still", 74, {"boot_garbage": True}),
        (8, "upright", "walk", 95, {"lose_messages": True}),
        (3, "back", "fall", 110, {}),
        (38, "back", "still", 88, {"leads_off": (10, 16), "unknown_type": True}),
        (4, "upright", "walk", 90, {}),
        (5, "upright", "still", 80, {"usb_gap": True}),
        (6, "upright", "still", 76, {}),
    ],
}


def ecg_shape(phase):
    """One heartbeat (phase 0..1) as a sum of bumps: P wave, QRS spike, T wave."""
    def bump(center, width, height):
        return height * math.exp(-(((phase - center) / width) ** 2))

    return (
        bump(0.18, 0.035, 0.12)  # P
        + bump(0.285, 0.010, -0.12)  # Q
        + bump(0.30, 0.012, 1.0)  # R
        + bump(0.315, 0.012, -0.25)  # S
        + bump(0.55, 0.06, 0.28)  # T
    )


def _blend(a, b, f):
    return tuple(x + (y - x) * f for x, y in zip(a, b))


def generate(scenario="phase1", seed=1):
    """Yield (hub time in s, raw line) like a recording file."""
    rng = random.Random(seed)
    segments = SCENARIOS[scenario]
    dev = "node-01"
    uptime0 = 1234  # ms on the ESP32 clock when we start
    gyro_bias = (1.2, -0.8, 0.5)
    ecg_seq = imu_seq = 0
    beat_phase = 0.0
    pose_vec = POSES[segments[0][1]]
    t = 0.0
    last_status = -5.0
    total = sum(seg[0] for seg in segments)

    seg_start = 0.0
    for duration, pose, activity, hr, extra in segments:
        target = POSES[pose]
        start_vec = pose_vec
        if extra.get("boot_garbage"):
            yield t, "ets Jul 29 2019 12:21:46"
            yield t, "rst:0x1 (POWERON_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)"
            yield t, '{"type":"ecg","dev":"node-01","seq":'  # cut in half
        steps = int(round(duration / MSG_PERIOD_S))
        for step in range(steps):
            local = step * MSG_PERIOD_S
            t = seg_start + local
            gap = extra.get("usb_gap") and 1.0 <= local < 5.0
            device_ms = uptime0 + int(t * 1000)

            if t - last_status >= 5.0 and not gap:
                last_status = t
                yield t, json.dumps({
                    "type": "status", "dev": dev, "fw": "0.1.0", "uptime_ms": device_ms,
                    "ecg": {"fs": ECG_FS},
                    "imu": {"ok": True, "fs": IMU_FS, "errors": 0,
                            "fields": ["ax", "ay", "az", "gx", "gy", "gz", "pitch", "roll"]},
                }, separators=(",", ":"))

            # ---- ECG message (25 samples) ----
            leads_off = False
            if "leads_off" in extra:
                lo_start, lo_end = extra["leads_off"]
                leads_off = lo_start <= local < lo_end
            samples = []
            for i in range(ECG_FS // 10):
                ts = t + i / ECG_FS
                beat_phase = (beat_phase + hr / 60.0 / ECG_FS) % 1.0
                if leads_off:
                    samples.append(4095)
                    continue
                wander = 40 * math.sin(2 * math.pi * 0.25 * ts)
                value = 2000 + 750 * ecg_shape(beat_phase) + wander + rng.gauss(0, 6)
                samples.append(int(min(4095, max(0, value))))
            bpm = None if (t < 3 or leads_off) else round(hr + rng.uniform(-1.5, 1.5), 1)
            ecg_msg = {"type": "ecg", "dev": dev, "seq": ecg_seq, "t0": device_ms, "fs": ECG_FS,
                       "leads_off": leads_off, "bpm": bpm, "samples": samples}
            ecg_seq += 1

            # ---- IMU message (10 samples) ----
            imu_samples = []
            for i in range(IMU_FS // 10):
                ts = t + i / IMU_FS
                # Move towards the new pose during the first 1.5 s of a segment.
                f = min(1.0, (ts - seg_start) / 1.5)
                pose_vec = _blend(start_vec, target, f * f * (3 - 2 * f))
                a = list(pose_vec)
                g = [0.0, 0.0, 0.0]
                if activity == "walk" or (0 < f < 1):
                    step_phase = 2 * math.pi * 1.8 * ts
                    a[1] += 0.25 * math.sin(step_phase) + 0.08 * math.sin(2 * step_phase)
                    a[0] += 0.08 * math.sin(step_phase / 2)
                    g = [40 * math.sin(step_phase / 2), 15 * math.sin(step_phase), 25 * math.cos(step_phase / 2)]
                if activity == "fall":
                    local_s = ts - seg_start
                    if 0.2 <= local_s < 0.55:  # free fall
                        a = [x * 0.15 for x in a]
                        g = [150.0, 80.0, -60.0]
                    elif 0.55 <= local_s < 0.62:  # impact
                        a = [0.8, 1.2, 2.9]
                        g = [300.0, -200.0, 100.0]
                breathing = 0.004 * math.sin(2 * math.pi * 0.25 * ts)
                a = [a[0] + rng.gauss(0, 0.004), a[1] + breathing + rng.gauss(0, 0.004), a[2] + rng.gauss(0, 0.004)]
                g = [g[k] + gyro_bias[k] + rng.gauss(0, 0.5) for k in range(3)]
                pitch = math.degrees(math.atan2(-a[0], math.sqrt(a[1] ** 2 + a[2] ** 2)))
                roll = math.degrees(math.atan2(a[1], a[2]))
                imu_samples.append([round(v, 4) for v in a] + [round(v, 2) for v in g]
                                   + [round(pitch, 2), round(roll, 2)])
            imu_msg = {"type": "imu", "dev": dev, "seq": imu_seq, "t0": device_ms, "fs": IMU_FS,
                       "samples": imu_samples}
            imu_seq += 1

            if gap:
                continue  # USB unplugged: the hub receives nothing
            if extra.get("lose_messages") and step in (20, 21, 50):
                continue  # dropped messages -> seq gap
            jitter = rng.uniform(0, 0.004)
            yield t + 0.01 + jitter, json.dumps(ecg_msg, separators=(",", ":"))
            yield t + 0.012 + jitter, json.dumps(imu_msg, separators=(",", ":"))
            if extra.get("unknown_type") and step == 5:
                yield t + 0.02, '{"type":"spo2","dev":"node-01","seq":0,"spo2":97}'
            if step == 30 and scenario == "demo" and t < total:
                yield t + 0.03, '{"type":"imu","dev":"node-01","seq":999999,"samples":"oops"}'
                yield t + 0.03, '{"type":"ecg","dev":"node-01","sam'
        seg_start += duration


def write_recording(path, scenario="phase1", seed=1):
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write("# rakshak-hub recording v1\n")
        f.write(f"# SIMULATED data (fake_esp32.py, scenario '{scenario}') - not a real sensor\n")
        f.write("# format: <seconds since start><TAB><raw line from the ESP32>\n")
        for t, line in generate(scenario, seed):
            f.write(f"{t:.3f}\t{line}\n")
