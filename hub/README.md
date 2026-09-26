# Rakshak hub

> **EXPERIMENTAL student prototype - not a medical device.** Heart rate, posture,
> activity and alerts are not medically validated.

The hub is a small Python program that reads the ESP32 (ECG + IMU) over USB and
works out heart rate, electrodes on/off, posture (upright / leaning / lying),
activity (still / moving), falls and "no movement for a long time".

```
ESP32 --USB (921600 baud)--> hub (this folder) --+--> live stream (/live): ECG graph, HR, posture, alerts --> React app
                                                  +--> Django (/api/hub/ingest/): 1 summary per second + alerts
```

It is plain Python (only needs `pyserial`), so the same code runs on a laptop and later
on a Raspberry Pi. For the demo day, follow [`../DEMO.md`](../DEMO.md).

## Setup (macOS, one time)

Open **Terminal** (press `Cmd + Space`, type `Terminal`, press Enter), then:

```bash
cd ~/rakshak-sensor/hub          # the hub folder of your copy of the repo
python3 --version                # needs 3.9 or newer
python3 -m venv .venv            # make a private Python for the hub
source .venv/bin/activate        # the prompt now starts with (.venv)
pip install -r requirements.txt
```

Every new Terminal window: `cd ~/rakshak-sensor/hub && source .venv/bin/activate`.

## Commands

Run these from the `hub` folder with `(.venv)` active.

| What | Command |
|------|---------|
| Find the ESP32 port | `python hub.py ports` |
| Live data | `python hub.py run` |
| Live data + save to a file | `python hub.py record --seconds 60` |
| Play a saved file (no hardware needed) | `python hub.py replay recordings/simulated_demo.txt` |
| Replay faster / looping | `python hub.py replay <file> --speed 3 --loop` |
| Only alerts and checks | add `--quiet` right after `hub.py`, e.g. `python hub.py --quiet run` |
| Without Django | add `--no-backend`, e.g. `python hub.py --no-backend replay <file>` |
| Run the tests | `python -m unittest discover -s tests -v` |

While `run` or `record` is running: type `c` then Enter to **calibrate upright**, `q`
then Enter (or `Ctrl + C`) to stop.

**Calibration:** when the hub starts, the person wearing the sensor should **stand up
straight and still for about 3 seconds**. That direction is saved as "upright". Until
then posture shows `CALIBRATING`. If the sensor is moved or re-taped, calibrate again
with `c` + Enter.

## Live view in the web app

While the hub runs, the React app (`npm run dev`, http://127.0.0.1:5555) shows the live
ECG graph, heart rate, posture and alerts on the Command Center, Live Consultation and
staff Waiting Room pages. The hub streams them at http://127.0.0.1:8765/live/events and
the Vite dev server forwards `/live` there. Quick check while the hub runs:
http://127.0.0.1:8765/live/health .

**Replay is never shown as live.** While `python hub.py replay ...` runs, the app shows a
violet **REPLAY** badge and REPLAY tags instead of "Live sensor", and everything sent to
Django is marked as replay (alerts with source `hub-replay`).

## Sending data to Django

Once per second the hub sends a small summary (heart rate, ECG signal state, electrodes
on/off, posture, activity, connected) to Django, plus every alert (fall, no movement,
electrodes off, ECG signal poor, sensor disconnected...). The raw ECG waveform is
**never** stored in the database.

One-time setup:

1. In Super Admin -> **Medical Staff** -> **Add New**, make an account for the hub, e.g.
   username `hub-node`, name `Sensor hub`, with a password.
2. In the `hub` folder: `cp .env.example .env`, then open `.env` (`open -e .env`) and put
   in that username and password. `.env` stays on your computer (it is not put in git).

Then just start Django and the hub. Use `--no-backend` to run the hub without Django,
e.g. `python hub.py --no-backend replay recordings/simulated_demo.txt`.

Between rehearsals, close all open sensor alerts (nothing is deleted):
`python manage.py resolve_sensor_alerts` in the `backend` folder (see `../DEMO.md`).

## Settings: `config.ini`

All thresholds (fall, no movement, posture angles, timeouts...) are in `config.ini`,
with an explanation above each one. Stop and restart the hub after changing it.

**Which soldier wears the sensor:** the `[devices]` section, e.g.
`node-01 = IA-SLD-1923`. To see the soldier IDs, open Super Admin → Soldiers, or open
http://127.0.0.1:8555/api/patients/ while the backend runs (the `"id"` values).

## Common problems

| Message | What to do |
|---------|------------|
| `The port ... is BUSY` | Close the Arduino IDE Serial Monitor / Serial Plotter (only one program can use the port). The hub retries by itself. |
| `ESP32 not found` | Plug in the USB cable (some cables only charge - try another). Run `python hub.py ports`. |
| `USB connection lost` | Normal when unplugged; the hub reconnects by itself when you plug it back in. |
| `ECG signal poor` / `signal FLAT` | The ECG has no heartbeat signal even though the ESP32 says "electrodes on". Usually a loose AD8232 power (3.3V) or ground wire; press them in firmly. Heart rate shows `--` until the signal is good again. |
| `signal NEAR_RAIL` / `CLIPPING` | Signal stuck near 0 / 4095 or slamming between them: bad electrode contact (use fresh pads) or movement. |
| `new IMU read errors - loose IMU wires?` | The ESP32 could not read the IMU. Push the jumper wires into the Grove socket firmly. |
| `CHECK WARNING: ...` | The data looks wrong (wrong rate, IMU not ~1 g, ...). Tell the team / check wiring. |
| `CHECK: N ignored line(s): ...` | Lines that were not valid messages, with a label and an example. A few are normal (e.g. right after the ESP32 resets). |
| `Backend not reachable` | Django is not running: start it (`python manage.py runserver` in `backend/`). The hub keeps the data (about 15 minutes) and sends it when Django is back. |
| `hub login ... failed` | Check `HUB_USERNAME` / `HUB_PASSWORD` in `hub/.env`, and that the account is under Super Admin -> Medical Staff. |
| `Backend does not know soldier ...` | The soldier ID in `[devices]` of `config.ini` does not exist in the app. |

## Recordings

Files in `recordings/` are plain text: `<seconds><TAB><raw line from the ESP32>`.
`simulated_demo.txt` is **SIMULATED** data (made by `tools/make_fake_recording.py`) that
triggers every alert: fall, no movement, electrodes off, sensor disconnected. To see the
ECG faults found on the real hardware (flat signal, stuck near 0, clipping):
`python tools/make_fake_recording.py --scenario bad_ecg --out recordings/simulated_bad_ecg.txt`

Record your own with `python hub.py record --seconds 90 --out recordings/<name>.txt`;
real recordings are the backup plan for the demo (see `../DEMO.md`).

## Later: Raspberry Pi as the hub

The code is the same. On the Pi: `sudo usermod -aG dialout $USER` (then log in again),
the port is usually `/dev/ttyUSB0`, and set `host = 0.0.0.0` under `[live]` and the
Django address under `[backend] url` (e.g. `http://<laptop-address>:8555/api`). On the
laptop, allow that address in Django and point Vite at the Pi:
`ALLOWED_HOSTS=localhost,127.0.0.1,<laptop-address> python manage.py runserver` and
`VITE_HUB_TARGET=http://<pi-address>:8765 npm run dev`.

## Adding a new sensor type (e.g. SpO2)

Each message `type` has its own small handler in `rakshak_hub/handlers/`. For a new
sensor: copy `handlers/ecg.py` to `handlers/spo2.py`, set `msg_type = "spo2"`, write
`on_message`, and add `spo2` to the import line in `handlers/__init__.py`. Messages with
an unknown type are counted and ignored, never a crash.
