"""Where lines come from: the ESP32 serial port, or a recording file (replay).

Recording file format (plain text, easy to read):
    # comment / header lines start with '#'
    <seconds since start><TAB><one raw line exactly as the ESP32 sent it>
Hub commands typed during a recording (like calibrate) are saved as
    <seconds><TAB>#hub:calibrate
so a replay behaves the same way.
"""
from __future__ import annotations

import errno
import time
from collections import deque
from datetime import datetime

try:
    import serial
    from serial.tools import list_ports
except ImportError:  # replay mode works without pyserial
    serial = None
    list_ports = None

# USB-serial chips used on ESP32 boards (USB vendor IDs).
KNOWN_USB_VIDS = {
    0x10C4: "Silicon Labs CP210x",
    0x1A86: "WCH CH340 / CH9102",
    0x0403: "FTDI",
    0x303A: "Espressif (native USB)",
}
PORT_NAME_HINTS = ("usbserial", "usbmodem", "slab_usbtouart", "wchusbserial", "ttyusb", "ttyacm")
BUSY_ERRNOS = {errno.EBUSY, errno.EAGAIN, getattr(errno, "EWOULDBLOCK", errno.EAGAIN)}
MAX_LINE_BYTES = 64 * 1024

HUB_COMMAND_PREFIX = "#hub:"


def need_pyserial():
    if serial is None:
        raise SystemExit("pyserial is not installed. Run:  pip install -r requirements.txt")


def port_score(port):
    """How much a port looks like an ESP32 (higher = more likely, 0 = no)."""
    name = (port.device or "").lower()
    if "bluetooth" in name or "debug-console" in name:
        return 0
    if port.vid in KNOWN_USB_VIDS:
        return 3
    if any(hint in name for hint in PORT_NAME_HINTS):
        return 2
    return 0


def list_serial_ports():
    need_pyserial()
    return sorted(list_ports.comports(), key=lambda p: (-port_score(p), p.device))


def find_esp32_port():
    ports = [p for p in list_serial_ports() if port_score(p) > 0]
    return ports[0].device if ports else None


class SerialSource:
    """Reads lines from the ESP32. Reconnects by itself when the USB comes back."""

    def __init__(self, port="auto", baud=921600, reconnect_interval_s=2.0, log=print):
        need_pyserial()
        self.port_setting = port
        self.baud = baud
        self.reconnect_interval_s = reconnect_interval_s
        self.log = log
        self.ser = None
        self.port = None
        self.status = "starting"
        self._buf = bytearray()
        self._lines = deque()
        self._drop_partial = True
        self._next_try = 0.0
        self._last_problem = None

    def _problem(self, status, text):
        """Log a problem once (not every retry)."""
        self.status = status
        if text != self._last_problem:
            self._last_problem = text
            self.log(text)

    def _open(self):
        port = find_esp32_port() if self.port_setting == "auto" else self.port_setting
        if port is None:
            self._problem(
                "not_found",
                "ESP32 not found. Is the USB cable plugged in? (Some cables only charge - try another.) "
                "Run 'python hub.py ports' to see all ports. Retrying...",
            )
            return
        ser = serial.Serial()
        ser.port = port
        ser.baudrate = self.baud
        ser.timeout = 0.05
        ser.exclusive = True  # nobody else may use the port while we have it
        try:
            ser.open()
        except (serial.SerialException, OSError) as exc:
            code = getattr(exc, "errno", None)
            text = str(exc)
            if code in BUSY_ERRNOS or "busy" in text.lower() or "access is denied" in text.lower():
                self._problem(
                    "busy",
                    f"The port {port} is BUSY - another program is using it. Close the Arduino IDE "
                    "Serial Monitor / Serial Plotter (or any other serial program). Retrying...",
                )
            elif code == errno.EACCES:
                self._problem(
                    "no_permission",
                    f"No permission to open {port}. On Linux / Raspberry Pi run: "
                    "sudo usermod -aG dialout $USER  (then log out and in). Retrying...",
                )
            elif code == errno.ENOENT:
                self._problem("not_found", f"Port {port} does not exist (unplugged?). Retrying...")
            else:
                self._problem("error", f"Could not open {port}: {text}. Retrying...")
            return
        self.ser, self.port = ser, port
        self._buf.clear()
        self._lines.clear()
        self._drop_partial = True  # the first line is probably cut in half
        self._last_problem = None
        self.status = "connected"
        self.log(f"Connected to {port} at {self.baud} baud.")

    def _lost(self, exc):
        try:
            self.ser.close()
        except Exception:  # noqa: BLE001 - port is already gone
            pass
        self.ser = None
        self._problem("disconnected", f"USB connection lost ({exc}). Waiting for the ESP32 to come back...")
        self._next_try = time.monotonic() + self.reconnect_interval_s

    def read_line(self):
        """Return the next complete line (str), or None if nothing arrived in ~50 ms."""
        if self._lines:
            return self._lines.popleft()
        if self.ser is None:
            now = time.monotonic()
            if now >= self._next_try:
                self._next_try = now + self.reconnect_interval_s
                self._open()
            if self.ser is None:
                time.sleep(0.05)
                return None
        try:
            chunk = self.ser.read(max(1, self.ser.in_waiting))
        except (serial.SerialException, OSError) as exc:
            self._lost(exc)
            return None
        if not chunk:
            return None
        self._buf += chunk
        if b"\n" not in chunk:
            if len(self._buf) > MAX_LINE_BYTES:
                self._buf.clear()  # garbage without newlines; start over
            return None
        *complete, rest = self._buf.split(b"\n")
        self._buf = bytearray(rest)
        if self._drop_partial:
            complete = complete[1:]
            self._drop_partial = False
        for raw in complete:
            self._lines.append(raw.decode("utf-8", errors="replace").rstrip("\r"))
        return self._lines.popleft() if self._lines else None

    def close(self):
        if self.ser is not None:
            self.ser.close()
            self.ser = None


class Recorder:
    """Saves every raw line (with its time) to a file for replay later."""

    def __init__(self, path, note=""):
        self.path = path
        self.file = open(path, "w", encoding="utf-8", newline="\n")
        self.file.write("# rakshak-hub recording v1\n")
        self.file.write(f"# started: {datetime.now().astimezone().isoformat(timespec='seconds')}\n")
        if note:
            self.file.write(f"# {note}\n")
        self.file.write("# format: <seconds since start><TAB><raw line from the ESP32>\n")
        self.lines = 0

    def write(self, t, line):
        self.file.write(f"{t:.3f}\t{line}\n")
        self.lines += 1

    def close(self):
        self.file.close()


def read_recording(path):
    """Yield (seconds, raw line) from a recording file. Skips damaged lines."""
    with open(path, encoding="utf-8", errors="replace") as f:
        for text in f:
            text = text.rstrip("\n")
            if not text or text.startswith("#"):
                continue
            t, sep, line = text.partition("\t")
            if not sep:
                continue
            try:
                yield float(t), line
            except ValueError:
                continue
