#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo "Installing Python dependencies..."
pip3 install -r requirements.txt -q

echo "Starting RepoRanger backend on http://localhost:8000"
python3 main.py
