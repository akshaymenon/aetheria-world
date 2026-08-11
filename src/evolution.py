#!/usr/bin/env python3
"""
AETHERIA Evolution Engine
Autonomous world evolution - runs via cron to evolve the world over time.
"""

import json
import random
import os
from datetime import datetime
from world_engine import World, BIOMES, LOCATION_TYPES

class WorldEvolution:
    def __init__(self, world_path="/root/projects/aetheria/data/world.json"):
        self.world_path = world_path
        self.world = None
        self.changes = []
        
    def load(self):
        """Load the current world state."""
        self.world = World.load(self.world_path)
        print(f"Loaded world (age: {self.world.world_age})")
        
    def save(self):
        """Save the evolved world state."""
        self.world.save(self.world_path)
        # Also update web data
        web_path = "/root/projects/aetheria/web/data/world.json"
        os.makedirs(os.path.dirname(web_path), exist_ok=True)
        import shutil
        shutil.copy(self.world_path, web_path)
        print(f"World saved and copied to web directory")
        
    def evolve(self):
        """Run one evolution cycle."""
        self.load()
        self.changes = []
        
        self.world.world_age += 1
        
        # Random events that can happen
        events = [
            self.evolve_discoveries,
            self.evolve_locations,
            self.evolve_characters,
            self.evolve_world_events,
            self.evolve_weather,
            self.evolve_relationships,
        ]
        
        # Run 2-4 random evolution functions
        selected = random.sample(events, random.randint(2, 4))
        for event_func in selected:
            try:
                event_func()
            except Exception as e:
                print(f"Evolution event failed: {e}")
        
        self.save()
        return self.changes
    
    def evolve_discoveries(self):
        """Discover new areas of the world."""
        # Find frontier tiles (discovered adjacent to undiscovered)
        frontier = []
        for y in range(self.world.size):
            for x in range(self.world.size):
                if self.world.tiles[y][x]["discovered"]:
                    # Check neighbors
                    for dx, dy in [(-1,0), (1,0), (0,-1), (0,1)]:
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < self.world.size and 0 <= ny < self.world.size:
                            if not self.world.tiles[ny][nx]["discovered"]:
                                frontier.append((nx, ny))
        
        if frontier:
            # Discover 1-3 new areas
            for _ in range(random.randint(1, 3)):
                if not frontier:
                    break
                cx, cy = random.choice(frontier)
                radius = random.randint(2, 5)
                discovered = 0
                for dy in range(-radius, radius + 1):
                    for dx in range(-radius, radius + 1):
                        if dx*dx + dy*dy <= radius*radius:
                            x, y = cx + dx, cy + dy
                            if 0 <= x < self.world.size and 0 <= y < self.world.size:
                                if not self.world.tiles[y][x]["discovered"]:
                                    self.world.tiles[y][x]["discovered"] = True
                                    self.world.discovered.add((x, y))
                                    discovered += 1
                
                if discovered > 0:
                    self.changes.append(f"Discovered {discovered} new tiles near ({cx}, {cy})")
    
    def evolve_locations(self):
        """Add secrets, inhabitants, or lore to existing locations."""
        if not self.world.locations:
            return
            
        # Pick a few locations to evolve
        locations = random.sample(self.world.locations, min(3, len(self.world.locations)))
        
        secrets_pool = [
            "An ancient rune glows faintly in the darkness.",
            "Whispers speak of treasure hidden deep within.",
            "A ghostly figure has been sighted at midnight.",
            "Strange symbols cover the walls, pulsing with energy.",
            "The locals speak of a curse that befell this place.",
            "A hidden passage was recently uncovered.",
            "The wind here carries voices from another time.",
            "Something ancient stirs in the depths below.",
        ]
        
        lore_pool = [
            "Built in the Age of Stars, before the Great Silence.",
            "Once home to a civilization that mastered crystal magic.",
            "The site of a legendary battle between light and shadow.",
            "Said to be where the first spell was ever cast.",
            "Abandoned when the rivers turned to ash.",
            "A pilgrimage site for those seeking the Truth.",
        ]
        
        for loc in locations:
            if random.random() > 0.5:
                # Add a secret
                secret = random.choice(secrets_pool)
                if "secrets" not in loc:
                    loc["secrets"] = []
                if secret not in loc["secrets"]:
                    loc["secrets"].append(secret)
                    self.changes.append(f"{loc['name']}: New secret uncovered")
            
            if random.random() > 0.6:
                # Add lore
                lore = random.choice(lore_pool)
                if "lore" not in loc:
                    loc["lore"] = []
                if lore not in loc["lore"]:
                    loc["lore"].append(lore)
                    self.changes.append(f"{loc['name']}: New lore discovered")
    
    def evolve_characters(self):
        """Evolve characters - level up, move, gain backstory."""
        if not self.world.characters:
            return
            
        characters = random.sample(self.world.characters, min(5, len(self.world.characters)))
        
        backstories = [
            "Lost their family in the Shattering and wanders seeking purpose.",
            "Was once a great hero but now seeks a quiet life.",
            "Trained under a master who vanished without a trace.",
            "Carries a mysterious artifact they don't understand.",
            "Was born under a blood moon and bears its mark.",
            "Fled from a great city after uncovering a terrible secret.",
            "Grew up in the wilds, raised by creatures of the forest.",
            "Seeks revenge against a shadow that took everything.",
        ]
        
        for char in characters:
            action = random.random()
            
            if action < 0.3:
                # Level up
                char["level"] = min(20, char["level"] + 1)
                self.changes.append(f"{char['name']} reached level {char['level']}")
                
            elif action < 0.5:
                # Move to new location
                if self.world.locations:
                    new_loc = random.choice(self.world.locations)
                    char["location_id"] = new_loc["id"]
                    char["x"] = new_loc["x"]
                    char["y"] = new_loc["y"]
                    self.changes.append(f"{char['name']} traveled to {new_loc['name']}")
                    
            elif action < 0.7:
                # Gain backstory
                if not char.get("backstory"):
                    char["backstory"] = random.choice(backstories)
                    self.changes.append(f"{char['name']}'s past revealed")
    
    def evolve_world_events(self):
        """Add new world events to history."""
        event_types = [
            ("The Storm", "A great storm swept across the land, reshaping coastlines."),
            ("The Bloom", "Flowers of impossible colors sprouted across the plains."),
            ("The Tremor", "The earth shook, opening new caverns and sealing old paths."),
            ("The Visitation", "Strange lights were seen in the sky for three nights."),
            ("The Plague", "A sickness swept through, leaving only the strong."),
            ("The Harvest", "An unusually bountiful season brought prosperity."),
            ("The Migration", "Great beasts moved across the land in unprecedented numbers."),
            ("The Eclipse", "The sun vanished for a day, and omens were read in the darkness."),
        ]
        
        if random.random() > 0.5:
            name, desc = random.choice(event_types)
            event = {
                "id": f"evt_{len(self.world.events)}",
                "name": name,
                "age": self.world.world_age,
                "description": desc,
                "affected_locations": [],
                "type": "event",
            }
            self.world.events.append(event)
            self.changes.append(f"World Event: {name}")
    
    def evolve_weather(self):
        """Change weather/season patterns."""
        seasons = ["Spring", "Summer", "Autumn", "Winter"]
        weather = ["Clear", "Rainy", "Stormy", "Foggy", "Snowy"]
        
        # Just a placeholder - could affect tile rendering
        season = random.choice(seasons)
        current_weather = random.choice(weather)
        self.changes.append(f"The world enters {season} season ({current_weather})")
    
    def evolve_relationships(self):
        """Create relationships between characters."""
        if len(self.world.characters) < 2:
            return
            
        char1 = random.choice(self.world.characters)
        char2 = random.choice(self.world.characters)
        
        if char1["id"] == char2["id"]:
            return
            
        relationship_types = ["friend", "rival", "mentor", "student", "ally", "enemy"]
        rel_type = random.choice(relationship_types)
        
        if "relationships" not in char1:
            char1["relationships"] = []
            
        char1["relationships"].append({
            "with": char2["id"],
            "type": rel_type,
        })
        
        self.changes.append(f"{char1['name']} and {char2['name']} are now {rel_type}s")


def run_evolution():
    """Main entry point for cron job."""
    print(f"\n{'='*50}")
    print(f"AETHERIA Evolution Cycle")
    print(f"Time: {datetime.now().isoformat()}")
    print(f"{'='*50}\n")
    
    engine = WorldEvolution()
    changes = engine.evolve()
    
    print(f"\n{'='*50}")
    print(f"Changes this cycle:")
    for change in changes:
        print(f"  • {change}")
    print(f"{'='*50}\n")
    
    return changes


if __name__ == "__main__":
    run_evolution()
