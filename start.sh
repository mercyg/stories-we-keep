#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
command -v ffmpeg >/dev/null || { echo 'Install ffmpeg first (on macOS: brew install ffmpeg).'; exit 1; }
python3 -m venv .venv
.venv/bin/python -m pip install -q -r requirements.txt
printf '\nOpen Stories We Keep at http://localhost:8000\nTranscription downloads its open model on first use. Start Ollama separately for translation.\n\n'
exec .venv/bin/python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
