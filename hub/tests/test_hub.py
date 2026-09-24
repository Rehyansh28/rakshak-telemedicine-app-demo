"""Tests for the hub (no hardware needed). Run from the hub/ folder:

    python -m unittest discover -s tests -v
"""
import os
import sys
import tempfile
import unittest

HUB_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, HUB_DIR)

from rakshak_hub.config import load_config  # noqa: E402
from rakshak_hub.core import Hub  # noqa: E402
from rakshak_hub.fake_esp32 import generate, write_recording  # noqa: E402
from rakshak_hub.handlers.base import SeqTracker  # noqa: E402
from rakshak_hub.protocol import describe_ignored, parse_line  # noqa: E402
from rakshak_hub.sources import read_recording  # noqa: E402

CONFIG = os.path.join(HUB_DIR, "config.ini")


class Collect:
    """A sink that remembers everything the hub sends out."""

    def __init__(self):
        self.alerts = []
        self.summaries = []
        self.ignored = []

    def on_ignored_line(self, line):
        self.ignored.append(line)

    def on_alert(self, alert):
        # Use the hub's clock: alerts from timeouts happen on a tick between two lines.
        tick = self.hub._last_tick
        self.alerts.append((self.t if tick is None else tick, alert))

    def on_summary(self, summaries, hub):
        for s in summaries:
            self.summaries.append((self.t, s))

    def raised(self, key):
        return [t for t, a in self.alerts if a.key == key and not a.resolved]


def run_scenario(name, cfg=None):
    cfg = cfg or load_config(CONFIG)
    sink = Collect()
    sink.t = 0.0
    hub = Hub(cfg, [sink], log=lambda text: None)
    sink.hub = hub
    t = 0.0
    for t, line in generate(name):
        sink.t = t
        hub.advance(t)
        hub.feed(line, t)
    for _ in range(60):  # 6 s after the end
        t += 0.1
        sink.t = t
        hub.tick(t)
    return hub, sink


def imu_at(sink, when):
    """IMU summary closest after time `when`."""
    return next(s["imu"] for t, s in sink.summaries if t >= when and "imu" in s)


class ProtocolTests(unittest.TestCase):
    def test_broken_lines_are_ignored(self):
        for line in ["", "ets Jul 29 2019", '{"type":"ecg","dev":', "[1,2,3]", '{"dev":"x"}', '{"type":5}', "{}"]:
            self.assertIsNone(parse_line(line), line)

    def test_valid_line(self):
        msg = parse_line(' {"type":"ecg","dev":"node-01","seq":1}\r\n')
        self.assertEqual(msg["type"], "ecg")

    def test_seq_gaps_and_restart(self):
        seq = SeqTracker()
        self.assertEqual([seq.update(n) for n in (5, 6, 9, 10)], [0, 0, 2, 0])
        self.assertEqual(seq.lost, 2)
        self.assertEqual(seq.update(0), -1)  # ESP32 restarted
        self.assertEqual(seq.restarts, 1)


class Phase1ScenarioTests(unittest.TestCase):
    """15 s standing, 15 s walking, 15 s lying on back, 15 s lying on side."""

    @classmethod
    def setUpClass(cls):
        cls.hub, cls.sink = run_scenario("phase1")

    def test_rates_and_counts(self):
        device = self.hub.devices["node-01"]
        self.assertEqual(device.soldier_id, "IA-SLD-1923")
        ecg, imu = device.handlers["ecg"], device.handlers["imu"]
        self.assertEqual((ecg.messages, ecg.samples, ecg.seq.lost), (600, 15000, 0))
        self.assertEqual((imu.messages, imu.samples, imu.seq.lost), (600, 6000, 0))
        s = next(s for t, s in self.sink.summaries if t >= 20)
        self.assertAlmostEqual(s["ecg"]["sampleRate"], 250, delta=10)
        self.assertAlmostEqual(s["imu"]["sampleRate"], 100, delta=5)

    def test_calibrates_while_standing(self):
        self.assertTrue(self.hub.devices["node-01"].handlers["imu"].analyzer.calibrated)
        self.assertLess(next(t for t, s in self.sink.summaries if s.get("imu", {}).get("calibrated")), 10)

    def test_posture_and_activity(self):
        self.assertEqual((imu_at(self.sink, 10)["posture"], imu_at(self.sink, 10)["activity"]), ("upright", "still"))
        self.assertEqual((imu_at(self.sink, 25)["posture"], imu_at(self.sink, 25)["activity"]), ("upright", "moving"))
        back = imu_at(self.sink, 40)
        self.assertEqual((back["posture"], back["lyingSide"], back["activity"]), ("lying", "back", "still"))
        side = imu_at(self.sink, 55)
        self.assertEqual((side["posture"], side["lyingSide"]), ("lying", "side"))

    def test_heart_rate(self):
        hr = next(s["ecg"]["hr"] for t, s in self.sink.summaries if t >= 10)
        self.assertAlmostEqual(hr, 72, delta=3)

    def test_no_false_alerts(self):
        keys = {a.key for t, a in self.sink.alerts if t < 60}
        self.assertEqual(keys, set())  # no fall, no leads-off, 15 s lying < 30 s no-movement limit

    def test_disconnect_when_data_stops(self):
        self.assertEqual(len(self.sink.raised("disconnected")), 1)


class DemoScenarioTests(unittest.TestCase):
    """Fall, lying still, electrodes off, USB gap, broken lines, unknown sensor type."""

    @classmethod
    def setUpClass(cls):
        cls.hub, cls.sink = run_scenario("demo")

    def test_fall_detected_once(self):
        falls = self.sink.raised("fall")
        self.assertEqual(len(falls), 1)
        self.assertTrue(16 < falls[0] < 21)

    def test_no_movement_after_30s_lying_still(self):
        times = self.sink.raised("no_movement")
        self.assertEqual(len(times), 1)
        self.assertTrue(45 < times[0] < 56)

    def test_electrodes_off_after_debounce(self):
        times = self.sink.raised("leads_off")
        self.assertEqual(len(times), 1)
        # electrodes come off at 29 s; alert after 3 s
        self.assertTrue(31.5 < times[0] < 33.5)
        hr_while_off = next(s["ecg"]["hr"] for t, s in self.sink.summaries if 31 < t < 34)
        self.assertIsNone(hr_while_off)

    def test_usb_gap_gives_disconnected_then_recovers(self):
        disconnects = self.sink.raised("disconnected")
        self.assertTrue(any(64 < t < 66 for t in disconnects), disconnects)
        resolved = [t for t, a in self.sink.alerts if a.key == "disconnected" and a.resolved]
        self.assertTrue(any(66 <= t < 67 for t in resolved))
        # A whole-sensor gap must not also give "ECG/IMU data stopped" alerts.
        self.assertEqual(self.sink.raised("ecg_stale") + self.sink.raised("imu_stale"), [])

    def test_bad_input_is_counted_not_fatal(self):
        device = self.hub.devices["node-01"]
        self.assertGreater(self.hub.ignored_lines, 0)
        self.assertGreater(device.bad_messages, 0)
        self.assertEqual(device.unknown_types["spo2"], 1)
        self.assertEqual(device.handlers["ecg"].seq.lost, 43)  # 3 dropped + 4 s gap


class BadEcgScenarioTests(unittest.TestCase):
    """ECG faults seen on the real hardware while the ESP32 says "electrodes on"."""

    @classmethod
    def setUpClass(cls):
        cls.hub, cls.sink = run_scenario("bad_ecg")

    def ecg(self, start, end):
        return [s["ecg"] for t, s in self.sink.summaries if start <= t < end and "ecg" in s]

    def test_stale_bpm_is_never_shown(self):
        # The fake ESP32 sends bpm 51.1 during every fault; it must never reach the screen.
        self.assertNotIn(51, [e["hr"] for e in self.ecg(0, 70)])

    def test_flat_signal_hides_hr_and_alerts(self):
        self.assertTrue(all(e["signal"] == "flat" and e["hr"] is None for e in self.ecg(13, 20)))
        alerts = [(t, a) for t, a in self.sink.alerts if a.key == "ecg_signal" and not a.resolved]
        self.assertTrue(14 < alerts[0][0] < 16)
        self.assertIn("flat", alerts[0][1].message)

    def test_near_rail_and_clipping_are_bad(self):
        self.assertTrue(all(e["signal"] == "near_rail" for e in self.ecg(31, 36)))
        self.assertTrue(all(e["signal"] == "clipping" for e in self.ecg(38, 42)))
        self.assertTrue(all(e["hr"] is None for e in self.ecg(30, 42)))

    def test_hr_comes_back_after_good_signal(self):
        self.assertTrue(all(e["signal"] == "ok" and e["hr"] is not None for e in self.ecg(24, 28)))
        self.assertTrue(all(e["hr"] is not None for e in self.ecg(48, 50)))

    def test_leads_off_gives_only_the_leads_off_alert(self):
        leads_off = self.sink.raised("leads_off")
        self.assertEqual(len(leads_off), 1)
        signal_alerts = self.sink.raised("ecg_signal")
        self.assertEqual(len(signal_alerts), 2)  # flat, then near-rail/clipping - none around leads-off
        self.assertFalse(any(48 < t < 62 for t in signal_alerts))

    def test_junk_lines_are_labelled(self):
        self.assertEqual(set(self.hub.ignored_kinds), {"cut / broken message"})
        self.assertTrue(self.hub.ignored_examples["cut / broken message"].endswith("]]}"))


class IgnoredLineLabelTests(unittest.TestCase):
    def test_labels(self):
        self.assertEqual(describe_ignored("E (1234) i2c: i2c driver install error"), "ESP-IDF log message")
        self.assertEqual(describe_ignored("rst:0x1 (POWERON_RESET),boot:0x13"), "ESP32 boot text")
        self.assertEqual(describe_ignored('{"type":"ecg","dev":'), "cut / broken message")
        self.assertEqual(describe_ignored("0.044,0.899,1.86,65.66]]}"), "cut / broken message")
        self.assertEqual(describe_ignored("hello"), "other text")


class LoopReplayTests(unittest.TestCase):
    def test_looping_replay_does_not_flap_disconnected(self):
        """Regression: with --loop, later loops once ticked ahead of the data (disconnect flapping)."""
        import subprocess
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "short.txt")
            with open(path, "w") as f:
                for t, line in generate("phase1"):
                    if t < 6:
                        f.write(f"{t:.3f}\t{line}\n")
            proc = subprocess.Popen(
                [sys.executable, "hub.py", "--no-backend", "--quiet", "replay", path, "--loop", "--speed", "4"],
                cwd=HUB_DIR, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
                env=dict(os.environ, PYTHONUNBUFFERED="1"),
            )
            try:
                out, _ = proc.communicate(timeout=5)  # ~3 loops of 6 s at 4x speed
            except subprocess.TimeoutExpired:
                proc.kill()
                out, _ = proc.communicate()
        self.assertGreaterEqual(out.count("looping back"), 2, out[-500:])
        self.assertNotIn("Sensor disconnected", out)


class RecordingFileTests(unittest.TestCase):
    def test_write_and_read_back(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "rec.txt")
            write_recording(path, "phase1")
            lines = list(read_recording(path))
        expected = list(generate("phase1"))
        self.assertEqual([line for _, line in lines], [line for _, line in expected])
        self.assertTrue(all(abs(a[0] - b[0]) < 0.001 for a, b in zip(lines, expected)))

    def test_unknown_device_is_reported(self):
        cfg = load_config(CONFIG)
        cfg.devices = {}
        logs = []
        hub = Hub(cfg, [], log=logs.append)
        hub.tick(0.0)
        hub.feed('{"type":"status","dev":"node-99"}', 0.0)
        self.assertIn("not linked to a soldier", logs[0])


if __name__ == "__main__":
    unittest.main()
