"""Rakshak hub - reads the ESP32 sensors and passes the data on.

Run from inside the hub/ folder:
    python hub.py ports                      # find the ESP32 serial port
    python hub.py run                        # live data
    python hub.py record --seconds 60        # live data + save to recordings/
    python hub.py replay recordings/<file>   # play a recording, no hardware needed
"""
from rakshak_hub.app import main

if __name__ == "__main__":
    main()
