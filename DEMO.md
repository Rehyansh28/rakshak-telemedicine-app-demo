# Rakshak demo runbook (macOS)

> **EXPERIMENTAL student prototype - not a medical device.** Real sensor values are tagged
> EXPERIMENTAL, recorded data REPLAY, dummy values SIMULATED. Say this to the audience.

> ⚡ **Electrical safety: battery only while electrodes are on a person.** The ECG connects
> the wearer to the Mac through the USB cable. While the electrodes are on, the Mac must run
> on **battery** with **nothing mains-powered plugged into it**: no charger, no HDMI/USB-C cable
> to a projector or monitor, no powered USB hub, no Ethernet. To show the screen to an
> audience, use wireless screen sharing (AirPlay) or let the audience look at the laptop.

Everything runs on one Mac, in the project folder `~/rakshak-sensor`, in **4 Terminal
windows** plus one browser:

| Window | Runs | Address |
|--------|------|---------|
| 1 | Django backend | http://127.0.0.1:8555 |
| 2 | React frontend (Vite) | **http://127.0.0.1:5555** ← open this in the browser |
| 3 | Hub (reads the ESP32) | streams to the app at `/live` |
| 4 | Spare: backups, commands, `caffeinate` | |

Open Terminal with `Cmd + Space` → "Terminal"; a new window with `Cmd + N`.

---

## 0. One-time setup

Do this once on the demo Mac. Skip any step that is already done.

**0.1 Get the code** (a separate folder; your old project folder is not touched)
```bash
cd ~
git clone -b claude/rakshak-real-sensor-data-phbaso https://github.com/Rehyansh28/rakshak-telemedicine-app-demo.git rakshak-sensor
```
If macOS asks to install "command line developer tools", click **Install**, then run it again.

**0.2 Database: back up the old one and copy it in** (the original stays untouched)
```bash
find ~ -path "*backend/db.sqlite3" -not -path "*/rakshak-sensor/*" 2>/dev/null
```
This prints the path of your existing database, e.g. `/Users/you/.../backend/db.sqlite3`.
Put that path in both lines (keep the quotes):
```bash
cp "/Users/you/.../backend/db.sqlite3" ~/Desktop/db-backup-original.sqlite3
cp "/Users/you/.../backend/db.sqlite3" ~/rakshak-sensor/backend/db.sqlite3
```
(No existing database? Skip this; `migrate` below creates an empty one. Only on an
**empty** database may you run `python manage.py seed_demo` - it wipes data.)

**0.3 Backend** (needs Python **3.12 or newer**, because of Django 6)
```bash
cd ~/rakshak-sensor/backend
python3 --version
```
If it says less than 3.12, install Python 3.12 from https://www.python.org/downloads/macos/
and use `python3.12` instead of `python3` in the next line.
```bash
python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt
python manage.py migrate
deactivate
```
`migrate` only adds new tables/columns (up to `0007_vitalsummary_replay`); it never deletes data.

**0.4 Frontend**
```bash
cd ~/rakshak-sensor/frontend && npm install && cp .env.example .env
```
`.env` must contain `VITE_API_BASE_URL=/api` (that is what `.env.example` has).

**0.5 Hub**
```bash
cd ~/rakshak-sensor/hub
python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
deactivate
```

**0.6 Create the hub's login in Super Admin**
1. Start Window 1 and Window 2 as in section 2.
2. Open http://127.0.0.1:5555/superadminuser and sign in.
3. **Medical Staff → Add New**: Name `Sensor hub`, Rank `-`, Field Post / Unit
   `Hub laptop`, Username `hub-node`, a password → **Save**.

**0.7 Put that login in the hub's `.env`** (stays on this Mac, never in git)
```bash
cd ~/rakshak-sensor/hub && cp .env.example .env && open -e .env
```
Set `HUB_PASSWORD=` to the password from 0.6, save, close.

**0.8 Check the soldier.** `hub/config.ini`, section `[devices]`: `node-01 = IA-SLD-1923`
must be a soldier ID that exists (Super Admin → Soldiers). Change it there if needed.

**0.9 (Only if you will commit recordings from this Mac)** tell git who you are:
```bash
git config --global user.name "Your Name" && git config --global user.email "you@example.com"
```

## 1. The day before: last update, then freeze

After your **last good rehearsal** (Sunday), get the final code **once**:
```bash
cp ~/rakshak-sensor/backend/db.sqlite3 ~/Desktop/db-backup-$(date +%Y%m%d-%H%M).sqlite3
cd ~/rakshak-sensor && git pull
cd backend && source venv/bin/activate && python manage.py migrate && deactivate
```
Then do one full rehearsal with it (sections 2-5) and record the backup file (section 5)
if you do not have one yet.

🧊 **Code freeze: do NOT run `git pull` on demo day.** What worked in the rehearsal is what
you demo.

## 1b. On demo day (30 minutes before)

- [ ] **Charge the Mac fully beforehand.** Then **unplug the charger** (and any projector /
  monitor / powered hub cable) **before the electrodes go on** - see the safety note at the top.
- [ ] **Back up the database** (Window 4):
  ```bash
  cp ~/rakshak-sensor/backend/db.sqlite3 ~/Desktop/db-backup-$(date +%Y%m%d-%H%M).sqlite3
  ```
- [ ] **Clear old sensor alerts** from rehearsals (marks them resolved; nothing is deleted):
  ```bash
  cd ~/rakshak-sensor/backend && source venv/bin/activate && python manage.py resolve_sensor_alerts && deactivate
  ```
- [ ] **Quit the Arduino IDE** completely (`Cmd + Q`). Only one program can use the ESP32.
- [ ] **Hardware:** fresh ECG pads; press in the AD8232 3.3V and GND wires and the IMU's
  Grove jumper wires; tape the IMU flat on the centre of the chest (label facing out).
- [ ] **Plug in the ESP32 and press its RESET (EN) button.**
- [ ] **Keep the Mac awake** on battery (Window 4, leave it running):
  ```bash
  caffeinate -dim
  ```
- [ ] Turn on Do Not Disturb, close other apps, set the browser zoom to 100%.
- [ ] Check `hub/recordings/real_90s.txt` exists (backup plan, section 5).

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

If the hardware fails, play back a real recording instead. In Window 3 press `Ctrl + C`, then:
```bash
python hub.py replay recordings/real_90s.txt --loop
```
The app then shows **REPLAY** everywhere (violet badge "Replay · recorded data", REPLAY
tags, "Replay ECG · recorded, not live"); alerts from it are stored as replay alerts. Tell
the audience it is a recording. Recorded data is never presented as live.

Back to live: `Ctrl + C`, then `python hub.py run`.

**Making `real_90s.txt` (during a rehearsal, once).** With Windows 1 and 2 running and the
hub stopped, electrodes on (Mac on battery!), wearer standing still, in Window 3:
```bash
cd ~/rakshak-sensor/hub && source .venv/bin/activate
python hub.py record --seconds 90 --out recordings/real_90s.txt
```
Follow the clock printed on each line: **0-20 s** stand still · **20-40 s** march on the spot
· **40-65 s** lie flat on the back · **65-90 s** lie on the side. It ends with
`Saved ... lines to recordings/real_90s.txt`. Check it plays back:
```bash
python hub.py --no-backend replay recordings/real_90s.txt
```
You should see `signal good`, a heart rate, UPRIGHT → LYING, and no `CHECK WARNING` about
the ECG. If the ECG was bad, fix the wiring and record again (same command overwrites it).

Commit it so the team (and Claude, for tuning) has it:
```bash
cd ~/rakshak-sensor
git add hub/recordings/real_90s.txt
git commit -m "Add real 90 s recording (stand, march, lie back, lie side)"
git push
```
`git push` may ask you to log in to GitHub. If that is a problem, upload it on the website
instead: open the branch `claude/rakshak-real-sensor-data-phbaso` → folder `hub/recordings`
→ **Add file → Upload files** → drag `real_90s.txt` in → **Commit directly** to that branch.

(No real recording at all? `recordings/simulated_demo.txt` works too, but it is
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

1. **Take the electrodes off the wearer first** - only then plug the charger back in.
2. `Ctrl + C` in Windows 3, 2, 1 (in that order).
3. Back up the database again (the `cp` line in section 1b).
