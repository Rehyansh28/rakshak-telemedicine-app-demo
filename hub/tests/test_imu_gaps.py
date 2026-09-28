"""IMU dropouts (loose I2C wires): the real problem seen in recordings/real_90s.txt."""
import os
import sys
import unittest

HUB_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, HUB_DIR)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from rakshak_hub.config import load_config  # noqa: E402
from rakshak_hub.core import Hub  # noqa: E402
from rakshak_hub.fake_esp32 import generate  # noqa: E402
from rakshak_hub.sources import read_recording  # noqa: E402
from test_hub import CONFIG, Collect  # noqa: E402

REAL_90S = os.path.join(HUB_DIR, "recordings", "real_90s.txt")


def run(lines, recording=None):
    sink = Collect()
    sink.t = 0.0
    hub = Hub(load_config(CONFIG), [sink], log=lambda text: None)
    sink.hub = hub
    hub.recording = recording
    t = 0.0
    for t, line in lines:
        sink.t = t
        hub.advance(t)
        hub.feed(line, t)
    return hub, sink


def without_imu(lines, gaps):
    """Drop IMU messages inside the (start, end) windows, like the loose wires did."""
    for t, line in lines:
        if '"type":"imu"' in line and any(a <= t < b for a, b in gaps):
            continue
        yield t, line


def imu_at(sink, when):
    return next(s["imu"] for t, s in sink.summaries if t >= when and "imu" in s)


class SyntheticGapTests(unittest.TestCase):
    def test_posture_kept_as_last_known_and_one_alert_per_dropout(self):
        # phase1: 0-15 standing, 15-30 walking, 30-45 on the back, 45-60 on the side.
        # One dropout 35-52 s with a short 0.5 s burst of data in the middle.
        hub, sink = run(without_imu(generate("phase1"), [(35, 43), (43.5, 52)]))
        during = imu_at(sink, 40)
        self.assertEqual((during["posture"], during["lyingSide"]), ("lying", "back"))  # last known
        self.assertTrue(during["postureStale"])
        self.assertIsNone(during["activity"])
        after = imu_at(sink, 56)
        self.assertFalse(after["postureStale"])
        self.assertEqual((after["posture"], after["lyingSide"]), ("lying", "side"))
        self.assertEqual(len(sink.raised("imu_stale")), 1)  # the burst did not split it into two
        self.assertEqual(sink.raised("fall"), [])

    def test_gap_never_counts_as_no_movement(self):
        # On the back from 30 s: 20 s still, a 15 s gap, then 13 s still = only 33 s with data
        # "still" if the gap were counted; the alert needs 30 s of *continuous* data.
        lines = [(t, line) for t, line in generate("phase1") if t < 45]
        lying = [(t, line) for t, line in generate("phase1") if 30 <= t < 45]
        # extend the lying part: repeat it shifted in time (device time t0 shifted too)
        import json

        extra = []
        for shift in (15, 30):
            for t, line in lying:
                msg = json.loads(line)
                if "t0" in msg:
                    msg["t0"] += shift * 1000
                if "seq" in msg:
                    msg["seq"] += shift * 10
                if "uptime_ms" in msg:
                    msg["uptime_ms"] += shift * 1000
                extra.append((t + shift, json.dumps(msg)))
        stream = list(without_imu(lines + extra, [(52, 67)]))
        hub, sink = run(stream)
        self.assertEqual(sink.raised("no_movement"), [])
        self.assertEqual(sink.raised("fall"), [])

    def test_no_movement_alert_is_not_resolved_by_a_gap(self):
        _, sink = run(without_imu(generate("demo"), [(52, 55)]))  # gap while the alert is active
        resolved = [t for t, a in sink.alerts if a.key == "no_movement" and a.resolved]
        self.assertTrue(all(t > 55 for t in resolved), resolved)


@unittest.skipUnless(os.path.exists(REAL_90S), "real recording not present")
class RealRecordingTests(unittest.TestCase):
    """recordings/real_90s.txt: good ECG, IMU missing ~46 s in two long dropouts."""

    @classmethod
    def setUpClass(cls):
        cls.hub, cls.sink = run(read_recording(REAL_90S), recording="real_90s.txt")

    def test_one_alert_per_dropout_and_no_false_alerts(self):
        self.assertEqual(len(self.sink.raised("imu_stale")), 2)
        for key in ("fall", "no_movement", "leads_off", "ecg_signal", "ecg_stale"):
            self.assertEqual(self.sink.raised(key), [], key)
        self.assertTrue(all(a.replay for _, a in self.sink.alerts))

    def test_posture_where_data_exists_and_last_known_in_gaps(self):
        self.assertEqual(imu_at(self.sink, 15)["posture"], "upright")
        self.assertEqual(imu_at(self.sink, 25)["activity"], "moving")  # marching
        on_back = imu_at(self.sink, 62)
        self.assertEqual((on_back["posture"], on_back["lyingSide"]), ("lying", "back"))  # +z confirmed
        gap = imu_at(self.sink, 80)
        self.assertTrue(gap["postureStale"])
        self.assertEqual(gap["posture"], "lying")  # last known, not "unknown" / "calibrating"
        postures = [s["imu"]["posture"] for t, s in self.sink.summaries if t > 5 and "imu" in s]
        self.assertNotIn("unknown", postures)

    def test_heart_rate_shown_nearly_all_the_time(self):
        hrs = [s["ecg"]["hr"] for t, s in self.sink.summaries if 6 < t < 89 and "ecg" in s]
        self.assertGreater(sum(h is not None for h in hrs) / len(hrs), 0.95)
        self.assertTrue(all(60 <= h <= 140 for h in hrs if h is not None))


if __name__ == "__main__":
    unittest.main()
