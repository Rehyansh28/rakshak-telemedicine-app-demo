# Rakshak demo runbook (macOS)

> **EXPERIMENTAL student prototype - not a medical device.** Real sensor values are tagged
> EXPERIMENTAL, recorded data REPLAY, dummy values SIMULATED. Say this to the audience.

Everything runs on one Mac, in the project folder `~/rakshak-sensor`, in **4 Terminal
windows** plus one browser:

| Window | Runs | Address |
|--------|------|---------|
| 1 | Django backend | http://127.0.0.1:8555 |
| 2 | React frontend (Vite) | **http://127.0.0.1:5555** ← open this in the browser |
| 3 | Hub (reads the ESP32) | streams to the app at `/live` |
| 4 | Spare: backups, commands, `caffeinate` | |

Open a new Terminal window with `Cmd + N`.

---

## 1. Before the demo (30 minutes before)

- [ ] **Back up the database** (Window 4):
  ```bash
  cp ~/rakshak-sensor/backend/db.sqlite3 ~/Desktop/db-backup-$(date +%Y%m%d-%H%M).sqlite3
  ```
- [ ] **Get the latest code**, then apply database updates (only adds, never deletes):
  ```bash
  cd ~/rakshak-sensor && git pull
  cd backend && source venv/bin/activate && python manage.py migrate && deactivate
  ```
- [ ] **Clear old sensor alerts** from rehearsals (marks them resolved; nothing is deleted):
  ```bash
  cd ~/rakshak-sensor/backend && source venv/bin/activate && python manage.py resolve_sensor_alerts && deactivate
  ```
- [ ] **Quit the Arduino IDE** completely (`Cmd + Q`). Only one program can use the ESP32.
- [ ] **Hardware:** fresh ECG pads; press in the AD8232 3.3V and GND wires and the IMU's
  Grove jumper wires; tape the IMU flat on the centre of the chest (label facing out).
- [ ] **Plug in the ESP32 and press its RESET (EN) button.**
- [ ] **Keep the Mac awake** and plugged in (Window 4, leave it running):
  ```bash
  caffeinate -dims
  ```
- [ ] Turn on Do Not Disturb, close other apps, set the browser zoom to 100%.

## 2. Start everything - in this order

**Window 1 - backend**
```bash
cd ~/rakshak-sensor/backend && source venv/bin/activate && python manage.py runserver
```
Wait for `Starting ASGI/Daphne ... at http://0.0.0.0:8555/`.

**Window 2 - frontend**
```bash
cd ~/rakshak-sensor/frontend && npm run dev
```
Wait for `Local: http://localhost:5555/`.

**Window 3 - hub** (the wearer stands **up straight and still** while it starts)
```bash
cd ~/rakshak-sensor/hub && source .venv/bin/activate && python hub.py run
```
Check that you see, within about 15 seconds:
- [ ] `Connected to /dev/cu.usbserial-... at 921600 baud.`
- [ ] `ESP32 firmware 0.1.1`
- [ ] **no** `Motion sensor error` (if you see it: press the ESP32 RESET button, wait 10 s)
- [ ] `Calibrated: upright = ...` (if not: wearer stands still, type `c` + Enter)
- [ ] `Backend: connected to http://127.0.0.1:8555/api as 'hub-node'`
- [ ] `Live data for the web app: http://127.0.0.1:8765/live/events`
- [ ] `CHECK: data looks OK` (appears every 10 s), `signal good`, a sensible HR

**Browser** - open http://127.0.0.1:5555/doctor/login, sign in, go to **Command Center**:
- [ ] Badge **LIVE SENSOR** (green), ECG moving, HR is a number
- [ ] Posture shows **Upright**; SpO2 / Temp show **SIMULATED**

For the medic's side use a second browser window: http://127.0.0.1:5555/staff/login →
Soldiers → **Start** on the soldier → Continue → Waiting Room.

## 3. During the demo - things you can show

| Show | How | What appears (after) |
|------|-----|----------------------|
| Live ECG + heart rate | just wear it | ECG graph, HR number |
| Posture | lie down on the back / side | "Lying down (back/side)" (~2 s) |
| No movement (possible unconscious) | lie still | alert "No movement" (30 s) |
| Electrodes off | unclip one ECG lead | badge "Electrodes off", alert (3 s) |
| Sensor disconnected | unplug the USB cable | badge "Sensor disconnected", alert (3 s); plug back in → live again |
| Fall | **do not really fall.** Use the backup recording (section 5) if you want to show it | |

Alerts pop up by themselves (bottom right) and appear under the bell. If the sensor was
moved or re-taped: wearer stands still, type `c` + Enter in Window 3 (re-calibrates).

## 4. If something goes wrong mid-demo

| You see | Do this |
|---------|---------|
| Badge **Hub offline** | Window 3 closed or crashed: run `python hub.py run` again. The page recovers by itself in a few seconds. |
| **Sensor disconnected** | Check the USB cable, plug it back in. The hub reconnects by itself. |
| **Waiting for sensor** | Hub runs but gets no data: press the ESP32 RESET button. |
| Hub says **port ... is BUSY** | Quit the Arduino IDE / Serial Monitor. The hub retries by itself. |
| **Electrodes off** / **ECG signal poor** | Press the pads and the AD8232 wires in; HR returns ~3 s after the signal is good. |
| **Data old** | The ESP32 froze: press its RESET button. |
| **Motion sensor error** / "new IMU read errors" | Push the IMU's Grove jumper wires in, press ESP32 RESET. |
| Posture looks wrong | Wearer stands still, type `c` + Enter in Window 3. |
| Page blank / frozen | `Cmd + R` in the browser; check Windows 1 and 2 are still running. |
| Hub says **Backend not reachable** | Restart Window 1. The hub keeps the data (~15 min) and sends it later. |
| Hardware will not work at all | Use the backup plan below. |

## 5. Backup plan: replay a real recording

If the hardware fails, play back a real recording instead (made earlier with
`python hub.py record`). In Window 3 press `Ctrl + C`, then:
```bash
python hub.py replay recordings/real_90s.txt --loop
```
The app then shows **REPLAY** everywhere (violet badge "Replay · recorded data", REPLAY
tags, "Replay ECG · recorded, not live"); alerts from it are stored as replay alerts. Tell
the audience it is a recording. Recorded data is never presented as live.

Back to live: `Ctrl + C`, then `python hub.py run`.

(Without any real recording, `recordings/simulated_demo.txt` works too, but it is
**simulated** data - say so.)

## 6. Between rehearsals

- Clear sensor alerts (safe, deletes nothing):
  `python manage.py resolve_sensor_alerts` (in Window 1's folder, with the venv active)
- Remove all sensor alerts completely (asks you to type `yes`; seeded and manual alerts
  are kept) - **back up the database first**:
  `python manage.py resolve_sensor_alerts --delete`
  Use this e.g. to remove the junk "Sensor disconnected" alerts that `replay --loop` made
  with hub code older than the loop fix (commit d7a179b, 24 Sep).
- **Never** run `seed_demo` and never delete `db.sqlite3` - both wipe data.

## 7. After the demo

`Ctrl + C` in Windows 3, 2, 1 (in that order), and back up the database again (section 1).
