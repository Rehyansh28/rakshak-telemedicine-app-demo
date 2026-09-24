"""Write a SIMULATED recording file (no hardware needed).

    python tools/make_fake_recording.py --scenario demo --out recordings/simulated_demo.txt
    python hub.py replay recordings/simulated_demo.txt
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rakshak_hub.fake_esp32 import SCENARIOS, write_recording  # noqa: E402

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--scenario", choices=sorted(SCENARIOS), default="demo")
    parser.add_argument("--out", required=True)
    parser.add_argument("--seed", type=int, default=1)
    args = parser.parse_args()
    write_recording(args.out, args.scenario, args.seed)
    print(f"Wrote {args.out} (scenario '{args.scenario}', SIMULATED data)")
