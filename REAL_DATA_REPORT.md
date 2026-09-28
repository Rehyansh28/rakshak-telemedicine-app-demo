# Rakshak - what the real sensor data showed

*Student prototype, EXPERIMENTAL - not a medical device.*

## What we tested
A soldier-worn node (ESP32 + AD8232 ECG + M5Stack MPU6886 motion sensor on the chest)
streamed data over USB to our hub software, which feeds the telemedicine web app. Two real
recordings are in `hub/recordings/` (both report ESP32 firmware version 0.1.0):

| File | Recorded | What it is |
|------|----------|------------|
| `real_90s.txt` | 28 Sep 2026 | **The good recording**, after the ECG wiring was fixed: 90 s of standing still, marching on the spot, lying down. The results below are from this file, and it is the one to replay in the app (clearly labelled REPLAY). |
| `real_60s_bad_wiring.txt` | 24 Sep 2026 | **The first test, before the wiring was fixed.** Kept to show what bad wiring looks like - see [the first test](#the-first-test-before-the-wiring-was-fixed). |

**Firmware:** ESP32 firmware source is not in the repo - the original 0.1.0 sketch was lost. The board still runs it; `real_90s.txt` was recorded with it. It will be rewritten (0.1.2, with the I2C/IMU/ADC fixes), flashed and tested in the next hardware session.

## Results

| Part | Result |
|------|--------|
| **ECG** | Worked the whole time: 100 % of the data arrived (250 samples/s), electrodes on, clipping in only 13 of 899 chunks (under 1.5 %, during movement). |
| **Heart rate** | Plausible and checked: ~100-110 bpm standing/marching, ~75-85 bpm lying. We counted the beats ourselves from the raw ECG and got the same values as the device (within a few bpm). |
| **Motion sensor (IMU)** | Perfect while still, but **only 49 % of the data arrived**. Two long dropouts (23 s and 22 s) happened while the wearer moved or lay down; the device counted over 4,000 read errors. |
| **Posture** | Correct wherever motion data existed: upright (tilt 2-6°), marching detected as "moving", lying on the back (tilt 83-88°). No false fall or "no movement" alerts. |

## The first test, before the wiring was fixed
`real_60s_bad_wiring.txt` (60 s) is what the hub saw with a loose ECG-board power/ground wire:
- **ECG flat or clipping:** the samples arrived (100 %), but 390 of 599 chunks hit the ends of
  the range (0 or 4095), and for about 10 s the signal was stuck at 0. No heartbeat can be
  seen. The ESP32 still reported a heart rate now and then (35-74 bpm) - those numbers were
  **not real**. This is why the hub now checks the signal itself and hides the heart rate
  ("ECG signal poor") when the signal is flat, stuck or clipping.
- **Junk lines:** the file starts with 395 copies of the cut-off end of one motion message
  (the hub ignores and counts them).
- **Motion sensor:** 98 % of the data arrived, but the device already counted 361-503 read
  errors - the first sign of the loose IMU wires described below.

## What went wrong, and why
The motion sensor is connected to the ESP32 by **loose male-female jumper wires pushed into
a Grove socket**. Its data travels on a two-wire bus (I2C). When the wearer moves, the
wires wiggle, the connection breaks, and every reading fails until the contact comes back.
The ECG uses different wires and was not affected in `real_90s.txt`. (The first test showed a
flat ECG from a loose ECG-board power wire; that was fixed before `real_90s.txt`.)

## How the software handles it now
- A dropout gives **one** clear alert, "Motion sensor data missing (loose IMU wires?)".
- During a dropout the app shows the **last known posture, marked as "last known"** with
  how long data has been missing - it never guesses and never shows old data as current.
- No fall or "no movement" alert can be caused by missing data.
- Recorded data is always labelled **REPLAY**, never "live".

## How to fix it
**Now (no soldering, no new parts):** use a proper Grove cable instead of jumper wires;
tape or hot-glue the connectors to the board and strain-relieve the cable; keep the IMU
cable short and fixed to the chest strap; check the hub's "IMU read errors" counter before
each session.

**Long term:** put the IMU and ESP32 on one soldered board or PCB (no loose connectors);
use locking connectors; add a firmware watchdog that re-initialises the I2C bus after
errors; consider an IMU on the ESP32 module itself (e.g. M5Stack devices with built-in IMU);
and send data wirelessly so the wearer is not tied to a laptop by USB (also better for
electrical safety).
