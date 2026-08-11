#!/usr/bin/env python3
"""
AETHERIA World Engine
Procedural world generation with biomes, locations, and lore.
"""

import json
import random
import math
import os
from datetime import datetime

# Lazy import PIL - only needed for image generation
Image = None
ImageDraw = None

def _ensure_pil():
    global Image, ImageDraw
    if Image is None:
        from PIL import Image as _Image, ImageDraw as _ImageDraw
        Image = _Image
        ImageDraw = _ImageDraw

# World configuration
WORLD_SIZE = 64  # 64x64 tiles
CHUNK_SIZE = 16
TILE_SIZE = 16  # pixels

# Biome definitions with color palettes
BIOMES = {
    "ocean_deep": {
        "color": "#0a1628",
        "alt_color": "#0d1f38",
        "name": "Deep Ocean",
        "description": "The abyssal depths where ancient things sleep.",
        "danger": 3,
        "resources": ["pearl", "coral", "abyssal_ore"],
        "walkable": False,
    },
    "ocean": {
        "color": "#1e3a5f",
        "alt_color": "#2a4f7c",
        "name": "Ocean",
        "description": "Vast waters stretching to the horizon.",
        "danger": 1,
        "resources": ["fish", "salt", "seaweed"],
        "walkable": False,
    },
    "beach": {
        "color": "#e6d5a7",
        "alt_color": "#d4c494",
        "name": "Beach",
        "description": "Sandy shores where land meets sea.",
        "danger": 0,
        "resources": ["shell", "sand", "driftwood"],
        "walkable": True,
    },
    "plains": {
        "color": "#5a8f3c",
        "alt_color": "#4a7a30",
        "name": "Plains",
        "description": "Rolling grasslands under open skies.",
        "danger": 0,
        "resources": ["wheat", "herbs", "wild_game"],
        "walkable": True,
    },
    "forest": {
        "color": "#2d5a1e",
        "alt_color": "#234716",
        "name": "Forest",
        "description": "Ancient woods filled with whispering trees.",
        "danger": 1,
        "resources": ["wood", "mushrooms", "forest_herbs"],
        "walkable": True,
    },
    "forest_deep": {
        "color": "#1a3a0f",
        "alt_color": "#142e0b",
        "name": "Deep Forest",
        "description": "The heart of the woodland, where few dare venture.",
        "danger": 2,
        "resources": ["ancient_wood", "rare_herbs", "mystic_mushrooms"],
        "walkable": True,
    },
    "mountain": {
        "color": "#6b6b6b",
        "alt_color": "#5a5a5a",
        "name": "Mountain",
        "description": "Craggy peaks touching the clouds.",
        "danger": 2,
        "resources": ["stone", "iron", "gems"],
        "walkable": True,
    },
    "mountain_peak": {
        "color": "#8a8a8a",
        "alt_color": "#7a7a7a",
        "name": "Mountain Peak",
        "description": "The highest points, where eagles nest.",
        "danger": 3,
        "resources": ["crystal", "gold", "rare_gems"],
        "walkable": True,
    },
    "snow": {
        "color": "#e8f0f5",
        "alt_color": "#d5e0e8",
        "name": "Snow",
        "description": "Frozen tundra where ice rules eternal.",
        "danger": 2,
        "resources": ["ice", "furs", "winter_herbs"],
        "walkable": True,
    },
    "desert": {
        "color": "#c4a35a",
        "alt_color": "#b8944a",
        "name": "Desert",
        "description": "Scorching sands hiding secrets beneath.",
        "danger": 2,
        "resources": ["sand", "cactus", "fossils"],
        "walkable": True,
    },
    "swamp": {
        "color": "#3d4a2a",
        "alt_color": "#323d22",
        "name": "Swamp",
        "description": "Murmuring wetlands where mist clings low.",
        "danger": 2,
        "resources": ["reeds", "bog_iron", "strange_herbs"],
        "walkable": True,
    },
    "volcanic": {
        "color": "#4a1a1a",
        "alt_color": "#3d1515",
        "name": "Volcanic",
        "description": "Smoldering lands of fire and ash.",
        "danger": 4,
        "resources": ["obsidian", "sulfur", "fire_crystal"],
        "walkable": True,
    },
    "jungle": {
        "color": "#1a5c1a",
        "alt_color": "#154a15",
        "name": "Jungle",
        "description": "Dense tropical growth teeming with life.",
        "danger": 2,
        "resources": ["exotic_fruit", "hardwood", "medicines"],
        "walkable": True,
    },
    "crystal": {
        "color": "#7a5a9e",
        "alt_color": "#6b4d8a",
        "name": "Crystal Fields",
        "description": "Shimmering plains of otherworldly crystal.",
        "danger": 2,
        "resources": ["mana_crystal", "prism", "star_shard"],
        "walkable": True,
    },
}

# Location types
LOCATION_TYPES = {
    "ruins": {"icon": "🏛️", "name_prefix": ["Ancient", "Forgotten", "Crumbling"], "name_suffix": ["Ruins", "Remnants", "Relics"]},
    "tower": {"icon": "🗼", "name_prefix": ["Wizard's", "Watcher's", "Crystal"], "name_suffix": ["Tower", "Spire", "Pinnacle"]},
    "cave": {"icon": "🕳️", "name_prefix": ["Deep", "Echoing", "Shadow"], "name_suffix": ["Cave", "Cavern", "Grotto"]},
    "village": {"icon": "🏘️", "name_prefix": ["Quiet", "Busy", "Humble"], "name_suffix": ["Village", "Hamlet", "Settlement"]},
    "city": {"icon": "🏰", "name_prefix": ["Grand", "Ancient", "Shimmering"], "name_suffix": ["City", "Metropolis", "Citadel"]},
    "shrine": {"icon": "⛩️", "name_prefix": ["Sacred", "Hidden", "Eternal"], "name_suffix": ["Shrine", "Sanctum", "Temple"]},
    "portal": {"icon": "🌀", "name_prefix": ["Whispering", "Unstable", "Eldritch"], "name_suffix": ["Portal", "Gate", "Rift"]},
    "tree": {"icon": "🌳", "name_prefix": ["World", "Elder", "Whispering"], "name_suffix": ["Tree", "Oak", "Wood"]},
    "lake": {"icon": "💧", "name_prefix": ["Mirror", "Still", "Moon"], "name_suffix": ["Lake", "Pool", "Waters"]},
    "camp": {"icon": "⛺", "name_prefix": ["Traveler's", "Nomad", "Wanderer's"], "name_suffix": ["Camp", "Rest", "Haven"]},
}

# Simple noise function for procedural generation
def simple_noise(x, y, seed=42):
    """Simple deterministic noise function."""
    n = int(x * 374761393 + y * 668265263 + seed * 1274126177)
    n = (n ^ (n >> 13)) * 1274126177
    n = n ^ (n >> 16)
    return (n & 0x7fffffff) / 0x7fffffff

def smooth_noise(x, y, seed=42):
    """Smoothed noise using bilinear interpolation."""
    ix, iy = int(x), int(y)
    fx, fy = x - ix, y - iy
    
    n00 = simple_noise(ix, iy, seed)
    n10 = simple_noise(ix + 1, iy, seed)
    n01 = simple_noise(ix, iy + 1, seed)
    n11 = simple_noise(ix + 1, iy + 1, seed)
    
    return (n00 * (1 - fx) * (1 - fy) +
            n10 * fx * (1 - fy) +
            n01 * (1 - fx) * fy +
            n11 * fx * fy)

def fbm(x, y, octaves=4, persistence=0.5, lacunarity=2.0, seed=42):
    """Fractal Brownian Motion for natural-looking terrain."""
    value = 0.0
    amplitude = 1.0
    frequency = 1.0
    max_value = 0.0
    
    for _ in range(octaves):
        value += amplitude * smooth_noise(x * frequency, y * frequency, seed)
        max_value += amplitude
        amplitude *= persistence
        frequency *= lacunarity
    
    return value / max_value

class World:
    def __init__(self, size=WORLD_SIZE, seed=None):
        self.size = size
        self.seed = seed or random.randint(1, 1000000)
        self.tiles = []
        self.locations = []
        self.characters = []
        self.events = []
        self.discovered = set()
        self.world_age = 0
        self.created_at = datetime.now().isoformat()
        
    def generate_terrain(self):
        """Generate the base terrain using FBM noise."""
        print(f"Generating {self.size}x{self.size} world with seed {self.seed}...")
        
        # Multiple noise layers for different features
        elevation = [[0 for _ in range(self.size)] for _ in range(self.size)]
        moisture = [[0 for _ in range(self.size)] for _ in range(self.size)]
        temperature = [[0 for _ in range(self.size)] for _ in range(self.size)]
        magic = [[0 for _ in range(self.size)] for _ in range(self.size)]
        
        for y in range(self.size):
            for x in range(self.size):
                nx, ny = x / self.size * 4, y / self.size * 4
                elevation[y][x] = fbm(nx, ny, octaves=6, seed=self.seed)
                moisture[y][x] = fbm(nx + 100, ny + 100, octaves=4, seed=self.seed + 1)
                temperature[y][x] = fbm(nx + 200, ny + 200, octaves=4, seed=self.seed + 2)
                magic[y][x] = fbm(nx + 300, ny + 300, octaves=3, seed=self.seed + 3)
        
        # Assign biomes based on terrain parameters
        self.tiles = [[None for _ in range(self.size)] for _ in range(self.size)]
        
        for y in range(self.size):
            for x in range(self.size):
                e, m, t, mag = elevation[y][x], moisture[y][x], temperature[y][x], magic[y][x]
                
                biome = self._select_biome(e, m, t, mag)
                self.tiles[y][x] = {
                    "x": x,
                    "y": y,
                    "biome": biome,
                    "elevation": e,
                    "moisture": m,
                    "temperature": t,
                    "magic": mag,
                    "discovered": False,
                    "location": None,
                }
        
        print(f"Terrain generated with {len(set(t['biome'] for row in self.tiles for t in row))} biomes")
    
    def _select_biome(self, elevation, moisture, temperature, magic):
        """Select biome based on terrain parameters."""
        # Deep ocean
        if elevation < 0.25:
            if magic > 0.7:
                return "crystal"
            return "ocean_deep" if elevation < 0.15 else "ocean"
        
        # Beach
        if elevation < 0.3:
            return "beach"
        
        # High elevation
        if elevation > 0.75:
            if magic > 0.6:
                return "volcanic"
            if temperature < 0.3:
                return "snow"
            return "mountain_peak" if elevation > 0.85 else "mountain"
        
        # Mid elevation
        if temperature < 0.25:
            return "snow"
        
        if moisture > 0.7:
            if temperature > 0.7:
                return "jungle"
            if elevation > 0.6:
                return "swamp"
            return "forest_deep" if elevation > 0.45 else "forest"
        
        if moisture < 0.25:
            if temperature > 0.6:
                return "desert"
        
        if magic > 0.75 and elevation > 0.5:
            return "crystal"
        
        return "forest" if elevation > 0.4 else "plains"
    
    def generate_locations(self, count=40):
        """Generate interesting locations across the world."""
        print(f"Generating {count} locations...")
        
        walkable_tiles = [
            (x, y) for y in range(self.size) for x in range(self.size)
            if BIOMES[self.tiles[y][x]["biome"]]["walkable"]
        ]
        
        # Prefer certain biomes for certain locations
        for _ in range(count):
            if not walkable_tiles:
                break
                
            x, y = random.choice(walkable_tiles)
            biome = self.tiles[y][x]["biome"]
            
            # Select location type based on biome
            loc_type = self._select_location_type(biome)
            loc_info = LOCATION_TYPES[loc_type]
            
            name = f"{random.choice(loc_info['name_prefix'])} {random.choice(loc_info['name_suffix'])}"
            
            location = {
                "id": f"loc_{len(self.locations)}",
                "name": name,
                "type": loc_type,
                "icon": loc_info["icon"],
                "x": x,
                "y": y,
                "biome": biome,
                "description": self._generate_location_description(name, loc_type, biome),
                "discovered": False,
                "visited": False,
                "secrets": [],
                "inhabitants": [],
                "items": [],
                "lore": [],
            }
            
            self.locations.append(location)
            self.tiles[y][x]["location"] = location["id"]
            walkable_tiles.remove((x, y))
        
        print(f"Generated {len(self.locations)} locations")
    
    def _select_location_type(self, biome):
        """Select appropriate location type for biome."""
        weights = {
            "ocean": ["ruins"],
            "ocean_deep": ["ruins", "portal"],
            "beach": ["camp", "ruins"],
            "plains": ["village", "camp", "shrine", "ruins"],
            "forest": ["shrine", "ruins", "cave", "camp"],
            "forest_deep": ["shrine", "ruins", "cave", "tree"],
            "mountain": ["cave", "ruins", "tower"],
            "mountain_peak": ["tower", "shrine", "portal"],
            "snow": ["cave", "ruins", "camp"],
            "desert": ["ruins", "shrine", "portal"],
            "swamp": ["ruins", "shrine", "cave"],
            "volcanic": ["ruins", "portal", "shrine"],
            "jungle": ["ruins", "shrine", "tree"],
            "crystal": ["portal", "shrine", "tower"],
        }
        
        options = weights.get(biome, ["ruins", "camp"])
        return random.choice(options)
    
    def _generate_location_description(self, name, loc_type, biome):
        """Generate a flavorful description for a location."""
        descriptions = {
            "ruins": [
                f"The remnants of a civilization long forgotten. {name} holds secrets of ages past.",
                f"Crumbling stones whisper tales of glory. {name} stands as a monument to time.",
                f"Once a grand structure, now {name} shelters only shadows and echoes.",
            ],
            "tower": [
                f"{name} pierces the sky, its purpose known only to those who built it.",
                f"Arcane energies swirl around {name}. Something watches from within.",
                f"{name} has stood for a thousand years, its light never extinguished.",
            ],
            "cave": [
                f"The mouth of {name} breathes cold air. Deeper, something glitters.",
                f"{name} echoes with dripping water and ancient silence.",
                f"Legends say {name} connects to the heart of the world itself.",
            ],
            "village": [
                f"Smoke rises gently from {name}. Here, life continues as it has for generations.",
                f"The people of {name} know secrets the cities have forgotten.",
                f"{name} welcomes weary travelers with warm fires and warmer hearts.",
            ],
            "city": [
                f"{name} sprawls across the landscape, a marvel of architecture and ambition.",
                f"In {name}, every street holds a story and every shadow hides a secret.",
                f"The gates of {name} have witnessed empires rise and fall.",
            ],
            "shrine": [
                f"{name} hums with sacred energy. Pilgrims speak of miracles here.",
                f"Ancient prayers still echo through {name}. The divine has not forgotten this place.",
                f"{name} marks where the veil between worlds grows thin.",
            ],
            "portal": [
                f"{name} shimmers with unstable energy. Where does it lead?",
                f"The air around {name} tastes of ozone and possibility.",
                f"{name} pulses with a rhythm like a heartbeat. It is alive, in its way.",
            ],
            "tree": [
                f"{name} has stood since before memory. Its roots touch the world's dreams.",
                f"The leaves of {name} whisper wisdom to those who listen.",
                f"{name} is said to be the first tree, from which all forests grew.",
            ],
            "lake": [
                f"{name} mirrors the sky perfectly. Some say it shows the future.",
                f"The waters of {name} are still, deep, and full of mystery.",
                f"{name} was born from a single tear of the world itself.",
            ],
            "camp": [
                f"{name} offers respite to those who brave the wilds.",
                f"Travelers gather at {name}, sharing tales and warnings.",
                f"{name} is a small comfort in a vast and wondrous world.",
            ],
        }
        
        return random.choice(descriptions.get(loc_type, [f"{name} holds many secrets."]))
    
    def generate_characters(self, count=30):
        """Generate characters that inhabit the world."""
        print(f"Generating {count} characters...")
        
        races = ["Human", "Elf", "Dwarf", "Halfling", "Orc", "Gnome", "Fae", "Dragonborn"]
        roles = ["Warrior", "Mage", "Rogue", "Cleric", "Ranger", "Bard", "Merchant", "Scholar", "Hermit", "Guardian"]
        personalities = ["brave", "cunning", "wise", "mysterious", "cheerful", "grim", "curious", "stoic", "wild", "gentle"]
        
        first_names = ["Aldric", "Lyra", "Thorne", "Mira", "Kael", "Sera", "Bran", "Iris", "Grom", "Nyx", "Orin", "Fae", "Zephyr", "Sol", "Luna", "Ash", "Ember", "Frost", "River", "Stone"]
        
        for _ in range(count):
            loc = random.choice(self.locations) if self.locations else None
            
            character = {
                "id": f"char_{len(self.characters)}",
                "name": random.choice(first_names),
                "race": random.choice(races),
                "role": random.choice(roles),
                "personality": random.choice(personalities),
                "location_id": loc["id"] if loc else None,
                "x": loc["x"] if loc else random.randint(0, self.size - 1),
                "y": loc["y"] if loc else random.randint(0, self.size - 1),
                "level": random.randint(1, 20),
                "backstory": "",
                "quests": [],
                "secrets": [],
                "relationships": [],
            }
            
            self.characters.append(character)
        
        print(f"Generated {len(self.characters)} characters")
    
    def generate_initial_events(self):
        """Generate the world's initial history."""
        print("Generating world history...")
        
        event_types = [
            "The Shattering", "The Great Silence", "The Rising", "The Fall", "The Awakening",
            "The Convergence", "The Divergence", "The Binding", "The Unbinding", "The Crossing"
        ]
        
        for i in range(5):
            event = {
                "id": f"evt_{i}",
                "name": random.choice(event_types),
                "age": random.randint(100, 5000),
                "description": f"An event that shaped the world in ages past.",
                "affected_locations": random.sample([l["id"] for l in self.locations], min(3, len(self.locations))),
                "type": "historical",
            }
            self.events.append(event)
        
        print(f"Generated {len(self.events)} historical events")
    
    def discover_area(self, center_x, center_y, radius=5):
        """Discover tiles around a point."""
        for dy in range(-radius, radius + 1):
            for dx in range(-radius, radius + 1):
                x, y = center_x + dx, center_y + dy
                if 0 <= x < self.size and 0 <= y < self.size:
                    if dx * dx + dy * dy <= radius * radius:
                        self.tiles[y][x]["discovered"] = True
                        self.discovered.add((x, y))
    
    def to_dict(self):
        """Serialize world to dictionary."""
        return {
            "seed": self.seed,
            "size": self.size,
            "world_age": self.world_age,
            "created_at": self.created_at,
            "tiles": self.tiles,
            "locations": self.locations,
            "characters": self.characters,
            "events": self.events,
            "discovered_count": len(self.discovered),
        }
    
    def save(self, path):
        """Save world to JSON file."""
        with open(path, 'w') as f:
            json.dump(self.to_dict(), f, indent=2)
        print(f"World saved to {path}")
    
    @classmethod
    def load(cls, path):
        """Load world from JSON file."""
        with open(path, 'r') as f:
            data = json.load(f)
        
        world = cls(size=data["size"], seed=data["seed"])
        world.world_age = data["world_age"]
        world.created_at = data["created_at"]
        world.tiles = data["tiles"]
        world.locations = data["locations"]
        world.characters = data["characters"]
        world.events = data["events"]
        world.discovered = set((t["x"], t["y"]) for row in world.tiles for t in row if t["discovered"])
        
        return world


def generate_world(seed=None, output_dir="/root/projects/aetheria/data"):
    """Generate a complete Aetheria world."""
    os.makedirs(output_dir, exist_ok=True)
    
    world = World(seed=seed)
    world.generate_terrain()
    world.generate_locations(count=50)
    world.generate_characters(count=40)
    world.generate_initial_events()
    
    # Discover starting area
    world.discover_area(world.size // 2, world.size // 2, radius=8)
    
    # Save world state
    world.save(os.path.join(output_dir, "world.json"))
    
    return world


if __name__ == "__main__":
    world = generate_world()
    print(f"\n✨ AETHERIA World Generated! ✨")
    print(f"Seed: {world.seed}")
    print(f"Size: {world.size}x{world.size}")
    print(f"Locations: {len(world.locations)}")
    print(f"Characters: {len(world.characters)}")
    print(f"Events: {len(world.events)}")
    print(f"Discovered: {len(world.discovered)} tiles")
