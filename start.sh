#!/bin/bash
# AETHERIA — Start the world viewer

echo "✨ Starting AETHERIA: The Autonomous World ✨"
echo ""

# Check if world exists
if [ ! -f "data/world.json" ]; then
    echo "Generating world..."
    cd src && python3 world_engine.py
    cd ..
fi

# Copy latest world data to web
cp data/world.json web/data/world.json

echo "Starting web server on http://localhost:8765"
echo "Press Ctrl+C to stop"
echo ""

cd web && python3 -m http.server 8765
