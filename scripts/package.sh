#!/usr/bin/env sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
python3 "$ROOT/scripts/package.py"
unzip -t "$ROOT/AyuStream_AI_Complete_Project.zip"
