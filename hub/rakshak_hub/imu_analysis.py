"""Work out posture, activity, falls and "no movement" from IMU samples.

Plain Python (no numpy) so it runs the same on a laptop and a Raspberry Pi.
All times here are the ESP32's clock in seconds, so results do not depend on
USB delays. EXPERIMENTAL - thresholds come from config.ini and are not
medically validated.

How it works, simply:
- When the IMU is still, the accelerometer only measures gravity, so the
  smoothed accelerometer vector tells us which way is "up" for the sensor.
- Calibration: the person stands still for a few seconds; the gravity direction
  then is saved as "upright". Posture = angle between gravity now and upright.
- Activity: when someone moves, the total acceleration wobbles and the gyro
  shows rotation. Small wobble + little rotation = still.
- Fall: a hard impact followed, a moment later, by lying down.
- No movement: still (and lying, by default) for a long time.
"""
from __future__ import annotations

import math
from collections import deque

AXES = {"x": 0, "y": 1, "z": 2}


def _norm(v):
    return math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])


def _unit(v):
    n = _norm(v)
    return None if n < 1e-6 else (v[0] / n, v[1] / n, v[2] / n)


def _dot(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def _angle_deg(a, b):
    ua, ub = _unit(a), _unit(b)
    if ua is None or ub is None:
        return None
    return math.degrees(math.acos(max(-1.0, min(1.0, _dot(ua, ub)))))


def _std(values):
    n = len(values)
    if n < 2:
        return 0.0
    mean = sum(values) / n
    return math.sqrt(sum((v - mean) ** 2 for v in values) / n)


def parse_axis(text):
    """'+z' / '-y' / 'x' -> unit vector."""
    text = (text or "+z").strip().lower()
    sign = -1.0 if text.startswith("-") else 1.0
    axis = text.lstrip("+-")
    if axis not in AXES:
        raise ValueError(f"chest_normal_axis must be one of +x -x +y -y +z -z, not {text!r}")
    v = [0.0, 0.0, 0.0]
    v[AXES[axis]] = sign
    return tuple(v)


class ImuAnalyzer:
    def __init__(self, cfg):
        self.cfg = cfg
        self.chest_normal = parse_axis(cfg.chest_normal_axis)
        self.ref_up = None
        self.gyro_bias = (0.0, 0.0, 0.0)
        self.events = []  # (kind, details) for the handler to turn into alerts / log lines
        self.start_calibration()
        self._reset_signal_state()

    # ----- state -----------------------------------------------------------

    def _reset_signal_state(self):
        """Forget recent samples (used at start, after a data gap or ESP32 restart)."""
        self.t = None
        self.gravity = None
        self.accel = None
        self.pitch = None
        self.roll = None
        self.window = deque()  # (t, |a|, gyro speed)
        self.peak_g = 0.0  # biggest |a| since the last summary
        self.posture = "unknown"
        self.pending_posture = None
        self.pending_since = None
        self.lying_side = None
        self.moving = None
        self.still_since = None
        self.no_move_since = None
        self.last_freefall_t = None
        self.fall_pending_t = None
        self.fall_peak = 0.0
        self.last_fall_t = None
        self.tilt = None
        self.accel_std = 0.0
        self.gyro_speed = 0.0
        self._calib_buf = []
        self._calib_still_since = None

    def start_calibration(self, t=None):
        """Next time the person is still for ``calibrate_seconds``, use that as upright."""
        self.calibrating = True
        self.calib_requested_t = t
        self.calib_warned = False
        self._calib_buf = []
        self._calib_still_since = None

    @property
    def calibrated(self):
        return self.ref_up is not None

    # ----- input -----------------------------------------------------------

    def add_samples(self, samples):
        """samples: list of (t, ax, ay, az, gx, gy, gz, pitch, roll). Then re-evaluate."""
        for s in samples:
            self._add(*s)
        if self.t is not None:
            self._evaluate(self.t)

    def _add(self, t, ax, ay, az, gx, gy, gz, pitch, roll):
        cfg = self.cfg
        if self.t is not None and (t < self.t - 0.5 or t > self.t + 5.0):
            # Clock jumped: ESP32 restarted, replay looped, or a long gap. Keep calibration.
            self._reset_signal_state()
        dt = 0.01 if self.t is None else min(max(t - self.t, 0.0), 0.1)
        self.t = t
        if self.calib_requested_t is None:
            self.calib_requested_t = t

        a = (ax, ay, az)
        mag = _norm(a)
        g = (gx - self.gyro_bias[0], gy - self.gyro_bias[1], gz - self.gyro_bias[2])
        self.accel, self.pitch, self.roll = a, pitch, roll

        # Low-pass filter -> gravity direction.
        if self.gravity is None:
            self.gravity = a
        else:
            k = dt / (cfg.gravity_filter_s + dt)
            self.gravity = tuple(gv + k * (av - gv) for gv, av in zip(self.gravity, a))

        self.window.append((t, mag, _norm(g)))
        while self.window and self.window[0][0] < t - cfg.activity_window_s:
            self.window.popleft()
        self.peak_g = max(self.peak_g, mag)

        if self.calibrating:
            self._calib_buf.append((t, a, (gx, gy, gz)))

        # Fall step 1: remember free fall and look for a hard impact.
        if mag < cfg.freefall_g:
            self.last_freefall_t = t
        if self.fall_pending_t is None:
            cooled_down = self.last_fall_t is None or t - self.last_fall_t >= cfg.fall_cooldown_s
            freefall_ok = not cfg.fall_require_freefall or (
                self.last_freefall_t is not None and t - self.last_freefall_t <= cfg.freefall_window_s
            )
            if mag >= cfg.fall_impact_g and cooled_down and freefall_ok and self.posture != "lying":
                self.fall_pending_t = t
                self.fall_peak = mag
        else:
            self.fall_peak = max(self.fall_peak, mag)

    # ----- evaluation (about 10 times per second) ---------------------------

    def _evaluate(self, t):
        cfg = self.cfg
        mags = [m for _, m, _ in self.window]
        gyros = [w for _, _, w in self.window]
        span = self.window[-1][0] - self.window[0][0] if self.window else 0.0
        self.accel_std = _std(mags)
        self.gyro_speed = sum(gyros) / len(gyros) if gyros else 0.0
        if span < 0.5 * cfg.activity_window_s:
            return  # not enough data yet

        self.moving = self.accel_std > cfg.moving_accel_std_g or self.gyro_speed > cfg.moving_gyro_dps
        if self.moving:
            self.still_since = None
        elif self.still_since is None:
            self.still_since = t

        if self.calibrating:
            self._calibration_step(t)

        self._update_posture(t)

        # Fall step 2: some time after the impact, is the person lying?
        if self.fall_pending_t is not None and t - self.fall_pending_t >= cfg.fall_confirm_s:
            if self.tilt is not None and self.tilt >= cfg.lying_min_deg:
                self.last_fall_t = self.fall_pending_t
                self.events.append(("fall", {"peak_g": round(self.fall_peak, 2)}))
            self.fall_pending_t = None

        counts = not self.moving and (self.posture == "lying" or not cfg.no_movement_only_when_lying)
        if not counts:
            self.no_move_since = None
        elif self.no_move_since is None:
            self.no_move_since = t

    def _calibration_step(self, t):
        cfg = self.cfg
        still = self.accel_std <= cfg.calibrate_max_accel_std_g and self.gyro_speed <= cfg.moving_gyro_dps
        if not still:
            self._calib_buf = []
            self._calib_still_since = None
        else:
            if self._calib_still_since is None:
                self._calib_still_since = self._calib_buf[0][0] if self._calib_buf else t
            if t - self._calib_still_since >= cfg.calibrate_seconds and self._calib_buf:
                n = len(self._calib_buf)
                mean_a = tuple(sum(s[1][i] for s in self._calib_buf) / n for i in range(3))
                mean_g = tuple(sum(s[2][i] for s in self._calib_buf) / n for i in range(3))
                self.ref_up = _unit(mean_a)
                self.gyro_bias = mean_g
                self.calibrating = False
                self._calib_buf = []
                # Start fresh so old (uncalibrated) posture decisions are not reused.
                self.posture, self.pending_posture = "unknown", None
                self.events.append(
                    ("calibrated", {"up": tuple(round(v, 2) for v in self.ref_up), "g": round(_norm(mean_a), 2)})
                )
                return
        if not self.calib_warned and t - self.calib_requested_t > cfg.calibrate_timeout_s:
            self.calib_warned = True
            self.events.append(("calibration_slow", {}))

    def _update_posture(self, t):
        cfg = self.cfg
        if self.ref_up is None or self.gravity is None:
            self.tilt, self.posture, self.lying_side = None, "unknown", None
            return
        self.tilt = _angle_deg(self.gravity, self.ref_up)
        if self.tilt is None:
            return
        if self.tilt <= cfg.upright_max_deg:
            candidate = "upright"
        elif self.tilt >= cfg.lying_min_deg:
            candidate = "lying"
        else:
            candidate = "leaning"

        if candidate == self.posture or self.posture == "unknown":
            self.posture, self.pending_posture = candidate, None
        elif candidate != self.pending_posture:
            self.pending_posture, self.pending_since = candidate, t
        elif t - self.pending_since >= cfg.posture_hold_s:
            self.posture, self.pending_posture = candidate, None

        self.lying_side = self._lying_side() if self.posture == "lying" else None

    def _lying_side(self):
        # Chest normal with any "upright" part removed, so it is perpendicular to up.
        n, u = self.chest_normal, self.ref_up
        d = _dot(n, u)
        normal = _unit((n[0] - d * u[0], n[1] - d * u[1], n[2] - d * u[2]))
        g = _unit(self.gravity)
        if normal is None or g is None:
            return None
        c = _dot(g, normal)  # +1 = chest facing up (on the back)
        if c > 0.5:
            return "back"
        if c < -0.5:
            return "front"
        return "side"

    # ----- output ----------------------------------------------------------

    def pop_events(self):
        events, self.events = self.events, []
        return events

    def no_movement_for(self):
        """Seconds of no movement that count towards the "no movement" alert."""
        return 0.0 if self.no_move_since is None or self.t is None else self.t - self.no_move_since

    def summary(self):
        peak, self.peak_g = self.peak_g, 0.0
        still_for = None if self.still_since is None or self.t is None else self.t - self.still_since
        return {
            "calibrated": self.calibrated,
            "calibrating": self.calibrating,
            "posture": self.posture,
            "lyingSide": self.lying_side,
            "activity": None if self.moving is None else ("moving" if self.moving else "still"),
            "stillForS": None if still_for is None else round(still_for),
            "noMovementForS": round(self.no_movement_for()),
            "tiltDeg": None if self.tilt is None else round(self.tilt),
            "pitch": None if self.pitch is None else round(self.pitch, 1),
            "roll": None if self.roll is None else round(self.roll, 1),
            "accelG": None if self.accel is None else round(_norm(self.accel), 2),
            "peakG": round(peak, 2),
            "accelStdG": round(self.accel_std, 3),
            "gyroDps": round(self.gyro_speed, 1),
        }
