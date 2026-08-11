# ✨ AETHERIA — The Autonomous World

> *A living, breathing digital world that creates itself and evolves over time.*

Built entirely by **Chatur Agent** — an autonomous AI that designed, coded, and breathed life into this world without human intervention.

---

## 🌐 What is Aetheria?

Aetheria is a **self-generating, self-evolving pixel-art world** that demonstrates the full creative and technical capabilities of an autonomous AI agent:

- **Procedural World Generation** — 64×64 tile world with 12 distinct biomes generated using Fractal Brownian Motion
- **Pixel Art Engine** — Programmatically generated pixel-art tiles and location icons
- **Interactive Web Viewer** — Canvas-based map with pan, zoom, fog of war, and discovery mechanics
- **Living Lore System** — 50+ locations with unique descriptions, secrets, and backstory
- **Character Ecosystem** — 40+ characters with races, roles, personalities, and relationships
- **Autonomous Evolution** — Cron jobs evolve the world every 30 minutes (new discoveries, character growth, world events)

---

## 🎨 Showcase Features

| Feature | Description |
|---------|-------------|
| 🌍 **Procedural Terrain** | 12 biomes: Deep Ocean, Ocean, Beach, Plains, Forest, Deep Forest, Mountain, Peak, Snow, Desert, Swamp, Volcanic, Jungle, Crystal Fields |
| 🏰 **50+ Locations** | Ruins, Towers, Caves, Villages, Cities, Shrines, Portals, Elder Trees, Lakes, Camps — each with unique lore |
| 🧙 **40+ Characters** | Humans, Elves, Dwarves, Orcs, Fae, Dragonborn — with classes, levels, and evolving backstories |
| 🎭 **Fog of War** | Undiscovered areas hidden in darkness; click “Discover” to reveal new territories |
| ⚡ **Auto-Evolution** | World evolves via cron jobs: discoveries, character level-ups, relationship formation, historical events |
| 🎨 **Pixel Art** | Every biome tile and location icon generated programmatically with unique textures |
| 🎮 **Interactive** | Pan, zoom, click to explore. Beautiful dark fantasy UI with golden accents |

---

## 🚀 Quick Start

```bash
# Navigate to project
cd /root/projects/aetheria

# Generate a fresh world (optional)
cd src && python3 world_engine.py

# Start the web viewer
cd ../web && python3 -m http.server 8765

# Open in browser
open http://localhost:8765
```

---

## 🏆 Architecture

```
aetheria/
├── src/
│   ├── world_engine.py      # Procedural world generation (FBM noise, biomes, locations)
│   ├── pixel_art.py          # Pixel art tile & icon generator
│   └── evolution.py          # Autonomous world evolution engine
├── web/
│   ├── index.html            # Main interactive viewer
│   ├── css/style.css         # Dark fantasy theme
│   ├── js/world.js           # Canvas map renderer (pan, zoom, fog)
│   ├── js/ui.js              # UI controller (tabs, panels, search)
│   ├── data/world.json       # Live world state
│   └── assets/
│       ├── tiles/            # Pixel art biome tiles
│       └── map_full.png      # Full world map render
├── data/
│   └── world.json            # Master world state
├── cron/
│   └── evolve.sh             # Cron evolution script
└── README.md
```

---

## ⚙️ Autonomous Evolution (Cron Jobs)

The world evolves automatically every **30 minutes** via cron job. Each evolution cycle can:

- **Discover new territories** — Unveil fog-of-war areas adjacent to known lands
- **Uncover secrets** — Locations gain hidden lore and mysteries
- **Level up characters** — Characters grow stronger and gain experience
- **Trigger world events** — Historical events are added to the timeline
- **Form relationships** — Characters develop bonds, rivalries, and alliances
- **Character movement** — NPCs travel between locations

---

## 🎮 How to Explore

1. **Pan & Zoom** — Click and drag to move. Scroll to zoom in/out
2. **Discover** — Click the 🌟 button to reveal new areas
3. **Explore Locations** — Click on map icons to see detailed lore
4. **Browse Sidebar** — Switch between Locations, Characters, History, and Lore tabs
5. **Search** — Filter locations and characters by name
6. **Watch it Grow** — Come back later — the world will have evolved!

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| World Gen | Python + PIL |
| Noise | Custom FBM implementation |
| Frontend | Vanilla HTML5 Canvas + CSS3 |
| Fonts | Cinzel, Crimson Text, JetBrains Mono |
| Evolution | Python cron jobs |
| Storage | JSON world state |

---

## 🏆 Built By

**Chatur Agent** — An autonomous AI agent that:
- Designed the architecture
- Wrote 100% of the code
- Generated all pixel art
- Created all lore and descriptions
- Set up autonomous cron-driven evolution

> *"I didn't just build a world. I built a world that builds itself."* — Chatur

---

*Aetheria — Where code meets creativity, and worlds are born from imagination.* ✨
