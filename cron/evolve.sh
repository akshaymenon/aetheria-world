#!/bin/bash
# AETHERIA Autonomous Evolution Cron Script

PROJECT_DIR="/root/projects/aetheria"
SRC_DIR="${PROJECT_DIR}/src"
DATA_DIR="${PROJECT_DIR}/data"
LOG_FILE="${DATA_DIR}/evolution.log"

# Ensure directories exist
mkdir -p "$DATA_DIR"

# Run evolution - output goes to stdout for cron capture
cd "$SRC_DIR"
python3 evolution.py
