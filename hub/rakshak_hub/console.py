"""Prints what the hub sees, in plain words, plus automatic "does the data look right" checks."""
from __future__ import annotations

from datetime import datetime

CHECK_EVERY = 10  # summaries (about seconds)


def _fmt(value, spec, missing="--"):
    return missing if value is None else format(value, spec)


def data_checks(s):
    """Return a list of problems found in one device summary (empty = looks fine)."""
    problems = []
    ecg, imu = s.get("ecg"), s.get("imu")
    if ecg is None:
        problems.append("no ECG messages received")
    else:
        if ecg["fs"] and abs(ecg["sampleRate"] - ecg["fs"]) > 0.1 * ecg["fs"]:
            problems.append(f"ECG gives {ecg['sampleRate']:.0f} samples/s, expected {ecg['fs']:.0f}")
        if ecg["rawMin"] is not None and not ecg["leadsOff"]:
            if ecg["rawMax"] - ecg["rawMin"] < 20:
                problems.append("ECG signal is flat (check electrodes / wiring)")
            if ecg["rawMin"] <= 0 or ecg["rawMax"] >= 4095:
                problems.append("ECG signal hits 0 or 4095 (clipping: check electrodes / wiring)")
    if imu is None:
        problems.append("no IMU messages received")
    else:
        if imu["fs"] and abs(imu["sampleRate"] - imu["fs"]) > 0.1 * imu["fs"]:
            problems.append(f"IMU gives {imu['sampleRate']:.0f} samples/s, expected {imu['fs']:.0f}")
        if imu["activity"] == "still" and imu["accelG"] is not None and not 0.8 <= imu["accelG"] <= 1.2:
            problems.append(
                f"IMU total acceleration at rest is {imu['accelG']} g, expected about 1 g (units wrong?)"
            )
    status = s.get("status")
    if status and status.get("imuOk") is False:
        problems.append("ESP32 says the IMU is not OK")
    if s["badMessages"]:
        problems.append(f"{s['badMessages']} messages had bad content so far")
    return problems


class ConsoleSink:
    def __init__(self, quiet=False, verbose=False, log=print):
        self.quiet = quiet
        self.verbose = verbose
        self.log = log
        self.count = 0

    def on_ignored_line(self, line):
        if self.verbose:
            self.log(f"  (ignored line: {line[:100]!r})")

    def on_alert(self, alert):
        when = alert.time.strftime("%H:%M:%S")
        who = f"{alert.dev} [{alert.soldier_id or 'no soldier'}]"
        if alert.resolved:
            self.log(f"{when} {who}  OK again: {alert.title}")
        else:
            self.log(f"{when} {who}  *** ALERT ({alert.level.upper()}): {alert.title} - {alert.message}")

    def on_summary(self, summaries, hub):
        self.count += 1
        when = datetime.now().strftime("%H:%M:%S")
        if not summaries:
            if self.count % 5 == 1:
                self.log(f"{when} waiting for data from the ESP32... (serial: {hub.source_status or '-'})")
            return
        for s in summaries:
            if not self.quiet:
                self.log(self.format(when, s, hub))
            if self.count % CHECK_EVERY == 0 and s["connected"]:
                problems = data_checks(s)
                if problems:
                    for p in problems:
                        self.log(f"         CHECK WARNING: {p}")
                else:
                    self.log("         CHECK: data looks OK (rates, ECG range, IMU ~1 g at rest)")

    @staticmethod
    def format(when, s, hub):
        head = f"{when} {s['dev']} [{s['soldierId'] or 'no soldier'}]"
        if not s["connected"]:
            return f"{head}  DISCONNECTED (no data for {s['lastSeenAgoS']} s, serial: {hub.source_status or '-'})"
        pad = " " * len(head)
        lines = []
        ecg = s.get("ecg")
        if ecg:
            electrodes = "OFF!" if ecg["leadsOff"] else "on"
            raw = "--" if ecg["rawMin"] is None else f"{ecg['rawMin']:.0f}-{ecg['rawMax']:.0f}"
            lines.append(
                f"ECG {ecg['msgRate']:4.1f} msg/s {ecg['sampleRate']:5.0f} samples/s | "
                f"HR {_fmt(ecg['hr'], '3d', ' --')} bpm | electrodes {electrodes:4} | raw {raw} | lost {ecg['lost']}"
            )
        imu = s.get("imu")
        if imu:
            if imu["calibrating"]:
                posture = "CALIBRATING (stand still)"
            else:
                posture = imu["posture"].upper()
                if imu["lyingSide"]:
                    posture += f" ({imu['lyingSide']})"
            activity = imu["activity"] or "--"
            if activity == "still" and imu["stillForS"]:
                activity += f" {imu['stillForS']} s"
            lines.append(
                f"IMU {imu['msgRate']:4.1f} msg/s {imu['sampleRate']:5.0f} samples/s | "
                f"pitch {_fmt(imu['pitch'], '6.1f')} roll {_fmt(imu['roll'], '6.1f')} | "
                f"|a| {_fmt(imu['accelG'], '.2f')} g (peak {imu['peakG']:.2f}) tilt {_fmt(imu['tiltDeg'], '3d')} | "
                f"{posture}, {activity} | lost {imu['lost']}"
            )
        if not lines:
            lines.append("(connected, waiting for ECG / IMU messages)")
        return "\n".join([f"{head}  {lines[0]}"] + [f"{pad}  {line}" for line in lines[1:]])
