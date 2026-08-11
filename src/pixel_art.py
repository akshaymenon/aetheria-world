#!/usr/bin/env python3
"""
AETHERIA Pixel Art Generator
Generates beautiful pixel-art tiles and assets for the world.
"""

import json
import random
import os
from PIL import Image, ImageDraw, ImageFilter
from world_engine import BIOMES, WORLD_SIZE, TILE_SIZE

# Pixel art color palettes for each biome
def get_biome_palette(biome_key):
    """Get a rich color palette for a biome."""
    base = BIOMES[biome_key]["color"]
    alt = BIOMES[biome_key]["alt_color"]
    
    palettes = {
        "ocean_deep": ["#0a1628", "#0d1f38", "#122a45", "#081020", "#153050"],
        "ocean": ["#1e3a5f", "#2a4f7c", "#356699", "#1a3355", "#3d75b5"],
        "beach": ["#e6d5a7", "#d4c494", "#f0e0b8", "#c9b885", "#fff8dc"],
        "plains": ["#5a8f3c", "#4a7a30", "#6ba34a", "#3d6628", "#7db85a"],
        "forest": ["#2d5a1e", "#234716", "#386e25", "#1e3d14", "#42802d"],
        "forest_deep": ["#1a3a0f", "#142e0b", "#204714", "#112a09", "#255418"],
        "mountain": ["#6b6b6b", "#5a5a5a", "#7a7a7a", "#4d4d4d", "#8a8a8a"],
        "mountain_peak": ["#8a8a8a", "#7a7a7a", "#9a9a9a", "#6b6b6b", "#aaaaaa"],
        "snow": ["#e8f0f5", "#d5e0e8", "#f5f8fa", "#c5d5e0", "#ffffff"],
        "desert": ["#c4a35a", "#b8944a", "#d4b46a", "#a8843a", "#e8cc7a"],
        "swamp": ["#3d4a2a", "#323d22", "#485830", "#2e381f", "#53663a"],
        "volcanic": ["#4a1a1a", "#3d1515", "#5a2020", "#331010", "#6b2a2a"],
        "jungle": ["#1a5c1a", "#154a15", "#1f6e1f", "#123a12", "#258025"],
        "crystal": ["#7a5a9e", "#6b4d8a", "#8a6ab0", "#5d4080", "#9a7ac0"],
    }
    
    return palettes.get(biome_key, [base, alt, base, alt, base])

def hex_to_rgb(hex_color):
    """Convert hex color to RGB tuple."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def vary_color(rgb, variance=20):
    """Slightly vary a color for texture."""
    return tuple(max(0, min(255, c + random.randint(-variance, variance))) for c in rgb)

def generate_tile_texture(biome_key, size=TILE_SIZE):
    """Generate a pixel-art tile texture for a biome."""
    palette = get_biome_palette(biome_key)
    img = Image.new('RGB', (size, size))
    pixels = img.load()
    
    base_rgb = hex_to_rgb(palette[0])
    
    for y in range(size):
        for x in range(size):
            # Base color with noise
            color = vary_color(base_rgb, 15)
            
            # Add detail based on position
            noise = random.random()
            if noise > 0.7:
                color = vary_color(hex_to_rgb(random.choice(palette[1:])), 10)
            elif noise > 0.9:
                color = vary_color(hex_to_rgb(palette[-1]), 20)
            
            pixels[x, y] = color
    
    # Add biome-specific details
    img = add_biome_details(img, biome_key, size)
    
    return img

def add_biome_details(img, biome_key, size):
    """Add biome-specific pixel art details."""
    draw = ImageDraw.Draw(img)
    pixels = img.load()
    
    if biome_key == "forest" or biome_key == "forest_deep":
        # Add small tree silhouettes
        for _ in range(random.randint(2, 4)):
            tx = random.randint(2, size - 4)
            ty = random.randint(2, size - 6)
            tree_color = hex_to_rgb("#1a3d0f") if biome_key == "forest_deep" else hex_to_rgb("#2d6b1a")
            # Tree trunk
            for dy in range(3):
                pixels[tx, ty + dy] = tree_color
            # Tree top
            for dx in range(-1, 2):
                for dy in range(-1, 1):
                    px, py = tx + dx, ty + dy - 1
                    if 0 <= px < size and 0 <= py < size:
                        pixels[px, py] = vary_color(tree_color, 10)
    
    elif biome_key == "mountain" or biome_key == "mountain_peak":
        # Add rocky outcrops
        for _ in range(random.randint(1, 3)):
            mx = random.randint(3, size - 4)
            my = random.randint(3, size - 4)
            rock_color = hex_to_rgb("#4a4a4a") if biome_key == "mountain" else hex_to_rgb("#aaaaaa")
            for dx in range(-2, 3):
                for dy in range(-2, 3):
                    if abs(dx) + abs(dy) <= 2:
                        px, py = mx + dx, my + dy
                        if 0 <= px < size and 0 <= py < size:
                            pixels[px, py] = vary_color(rock_color, 15)
    
    elif biome_key == "ocean" or biome_key == "ocean_deep":
        # Add wave highlights
        for wx in range(0, size, 3):
            wy = random.randint(2, size - 3)
            highlight = hex_to_rgb("#4a7aaa") if biome_key == "ocean" else hex_to_rgb("#1a3a5a")
            for dx in range(2):
                px = wx + dx
                if 0 <= px < size:
                    pixels[px, wy] = highlight
    
    elif biome_key == "desert":
        # Add dune lines
        for y in range(2, size, 4):
            for x in range(size):
                if random.random() > 0.3:
                    dune_color = hex_to_rgb("#d4b46a")
                    pixels[x, y] = vary_color(dune_color, 10)
    
    elif biome_key == "snow":
        # Add snow sparkle
        for _ in range(random.randint(3, 6)):
            sx, sy = random.randint(0, size - 1), random.randint(0, size - 1)
            pixels[sx, sy] = hex_to_rgb("#ffffff")
    
    elif biome_key == "crystal":
        # Add crystal formations
        for _ in range(random.randint(2, 4)):
            cx = random.randint(2, size - 3)
            cy = random.randint(2, size - 5)
            crystal_color = hex_to_rgb("#a080cc")
            for dy in range(4):
                px = cx
                py = cy + dy
                if 0 <= px < size and 0 <= py < size:
                    pixels[px, py] = vary_color(crystal_color, 20)
            # Crystal tip
            for dx in range(-1, 2):
                px = cx + dx
                py = cy - 1
                if 0 <= px < size and 0 <= py < size:
                    pixels[px, py] = vary_color(crystal_color, 15)
    
    elif biome_key == "volcanic":
        # Add lava cracks
        for _ in range(random.randint(1, 3)):
            lx = random.randint(0, size - 1)
            for ly in range(size):
                if random.random() > 0.5:
                    lava_color = hex_to_rgb("#cc5522")
                    pixels[lx, ly] = vary_color(lava_color, 30)
                    if lx + 1 < size:
                        pixels[lx + 1, ly] = vary_color(lava_color, 20)
    
    elif biome_key == "jungle":
        # Add dense vegetation
        for _ in range(random.randint(3, 5)):
            jx = random.randint(1, size - 2)
            jy = random.randint(1, size - 2)
            leaf_color = hex_to_rgb("#1f7a1f")
            for dx in range(-1, 2):
                for dy in range(-1, 2):
                    px, py = jx + dx, jy + dy
                    if 0 <= px < size and 0 <= py < size and random.random() > 0.3:
                        pixels[px, py] = vary_color(leaf_color, 15)
    
    elif biome_key == "swamp":
        # Add murky pools
        for _ in range(random.randint(1, 3)):
            sx = random.randint(2, size - 3)
            sy = random.randint(2, size - 3)
            murk_color = hex_to_rgb("#2a3320")
            for dx in range(-1, 2):
                for dy in range(-1, 2):
                    px, py = sx + dx, sy + dy
                    if 0 <= px < size and 0 <= py < size:
                        pixels[px, py] = vary_color(murk_color, 10)
    
    return img

def generate_location_icon(loc_type, size=24):
    """Generate a pixel-art icon for a location type."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    pixels = img.load()
    
    center = size // 2
    
    if loc_type == "ruins":
        # Gray broken pillars
        color = (140, 140, 140, 255)
        for x in range(4, 8):
            for y in range(6, 18):
                pixels[x, y] = color
        for x in range(10, 14):
            for y in range(4, 16):
                pixels[x, y] = color
        for x in range(16, 20):
            for y in range(8, 18):
                pixels[x, y] = color
        # Broken tops
        pixels[4, 6] = (0, 0, 0, 0)
        pixels[5, 5] = (0, 0, 0, 0)
        pixels[16, 8] = (0, 0, 0, 0)
        pixels[17, 7] = (0, 0, 0, 0)
    
    elif loc_type == "tower":
        # Tall structure
        color = (100, 100, 150, 255)
        light = (150, 150, 200, 255)
        for y in range(4, 20):
            for x in range(center - 2, center + 3):
                pixels[x, y] = color
        # Top
        for y in range(2, 6):
            for x in range(center - 3, center + 4):
                pixels[x, y] = color
        # Light
        pixels[center, 3] = (255, 255, 200, 255)
        pixels[center - 1, 4] = light
        pixels[center + 1, 4] = light
    
    elif loc_type == "cave":
        # Dark entrance
        for y in range(4, 20):
            for x in range(4, 20):
                pixels[x, y] = (60, 50, 40, 255)
        # Entrance hole
        for y in range(8, 18):
            for x in range(8, 16):
                pixels[x, y] = (20, 15, 10, 255)
        # Glow
        pixels[10, 12] = (255, 150, 50, 200)
        pixels[11, 13] = (255, 150, 50, 150)
    
    elif loc_type == "village":
        # Small houses
        colors = [(180, 140, 100, 255), (160, 120, 80, 255)]
        houses = [(6, 8), (14, 6), (10, 14)]
        for i, (hx, hy) in enumerate(houses):
            c = colors[i % len(colors)]
            # House body
            for y in range(hy, hy + 6):
                for x in range(hx, hx + 6):
                    pixels[x, y] = c
            # Roof
            for rx in range(hx - 1, hx + 7):
                pixels[rx, hy - 1] = (140, 60, 40, 255)
                if hx <= rx < hx + 6:
                    pixels[rx, hy - 2] = (140, 60, 40, 255)
    
    elif loc_type == "city":
        # Larger structures
        color = (150, 150, 170, 255)
        for y in range(4, 20):
            for x in range(6, 10):
                pixels[x, y] = color
        for y in range(2, 20):
            for x in range(12, 16):
                pixels[x, y] = color
        for y in range(6, 20):
            for x in range(18, 20):
                pixels[x, y] = color
        # Tallest top
        for x in range(12, 16):
            pixels[x, 1] = (180, 180, 200, 255)
    
    elif loc_type == "shrine":
        # Sacred structure
        color = (200, 180, 100, 255)
        for y in range(8, 20):
            for x in range(center - 1, center + 2):
                pixels[x, y] = color
        # Top ornament
        for y in range(4, 8):
            for x in range(center - 2, center + 3):
                pixels[x, y] = color
        pixels[center, 2] = (255, 220, 50, 255)
        pixels[center, 3] = (255, 240, 100, 255)
    
    elif loc_type == "portal":
        # Swirling portal
        for y in range(size):
            for x in range(size):
                dx, dy = x - center, y - center
                dist = (dx * dx + dy * dy) ** 0.5
                if dist < 9:
                    if dist < 3:
                        pixels[x, y] = (255, 255, 255, 255)
                    elif dist < 6:
                        pixels[x, y] = (150, 100, 255, 255)
                    else:
                        pixels[x, y] = (100, 50, 200, 255)
        # Swirl effect
        for angle in range(0, 360, 30):
            import math
            rad = math.radians(angle)
            for r in range(3, 9):
                px = int(center + r * math.cos(rad))
                py = int(center + r * math.sin(rad))
                if 0 <= px < size and 0 <= py < size:
                    pixels[px, py] = (200, 150, 255, 255)
    
    elif loc_type == "tree":
        # Big tree
        trunk = (120, 80, 40, 255)
        leaves = [(40, 120, 40, 255), (50, 140, 50, 255), (30, 100, 30, 255)]
        # Trunk
        for y in range(10, 20):
            for x in range(center - 1, center + 2):
                pixels[x, y] = trunk
        # Canopy layers
        for ly, leaf_c in enumerate(leaves):
            y_base = 4 + ly * 3
            width = 5 - ly
            for y in range(y_base, y_base + 3):
                for x in range(center - width, center + width + 1):
                    if 0 <= x < size:
                        pixels[x, y] = leaf_c
    
    elif loc_type == "lake":
        # Water body
        for y in range(size):
            for x in range(size):
                dx, dy = x - center, y - center
                dist = (dx * dx + dy * dy) ** 0.5
                if dist < 8:
                    if dist < 4:
                        pixels[x, y] = (80, 150, 200, 255)
                    else:
                        pixels[x, y] = (60, 130, 180, 255)
        # Sparkle
        pixels[center - 2, center - 2] = (200, 230, 255, 255)
        pixels[center + 3, center + 1] = (180, 220, 255, 200)
    
    elif loc_type == "camp":
        # Tent and fire
        tent_color = (160, 140, 100, 255)
        # Tent
        for y in range(8, 16):
            width = (y - 8) // 2
            for x in range(center - 4 + width, center + 5 - width):
                pixels[x, y] = tent_color
        # Fire
        for y in range(18, 20):
            for x in range(center + 4, center + 7):
                pixels[x, y] = (255, 100, 30, 255)
        pixels[center + 5, 17] = (255, 150, 50, 255)
        pixels[center + 5, 16] = (255, 200, 100, 200)
    
    return img

def render_world_map(world, output_path, show_all=False):
    """Render the full world map as a large image."""
    tile_size = TILE_SIZE
    width = world.size * tile_size
    height = world.size * tile_size
    
    print(f"Rendering world map: {width}x{height} pixels...")
    
    # Create map image
    map_img = Image.new('RGB', (width, height))
    
    # Generate tile cache
    tile_cache = {}
    for biome_key in BIOMES:
        tile_cache[biome_key] = generate_tile_texture(biome_key, tile_size)
    
    # Render tiles
    for y in range(world.size):
        for x in range(world.size):
            tile = world.tiles[y][x]
            biome = tile["biome"]
            
            if not show_all and not tile["discovered"]:
                # Fog of war
                fog = Image.new('RGB', (tile_size, tile_size), (15, 15, 20))
                map_img.paste(fog, (x * tile_size, y * tile_size))
            else:
                map_img.paste(tile_cache[biome], (x * tile_size, y * tile_size))
    
    # Render locations
    for loc in world.locations:
        if show_all or (loc["x"], loc["y"]) in world.discovered:
            icon = generate_location_icon(loc["type"], 24)
            px = loc["x"] * tile_size - 4
            py = loc["y"] * tile_size - 4
            
            # Paste with transparency
            map_img.paste(icon, (px, py), icon)
    
    # Save
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    map_img.save(output_path, quality=95)
    print(f"Map saved to {output_path}")
    
    return map_img

def generate_minimap(world, output_path, size=256):
    """Generate a small minimap."""
    map_img = render_world_map(world, "/tmp/aetheria_full.png", show_all=True)
    minimap = map_img.resize((size, size), Image.Resampling.NEAREST)
    minimap.save(output_path)
    return minimap

def generate_tileset(output_dir):
    """Generate all tile textures and save them."""
    os.makedirs(output_dir, exist_ok=True)
    
    for biome_key in BIOMES:
        tile = generate_tile_texture(biome_key)
        tile.save(os.path.join(output_dir, f"{biome_key}.png"))
    
    # Generate location icons
    for loc_type in ["ruins", "tower", "cave", "village", "city", "shrine", "portal", "tree", "lake", "camp"]:
        icon = generate_location_icon(loc_type)
        icon.save(os.path.join(output_dir, f"loc_{loc_type}.png"))
    
    print(f"Tileset generated in {output_dir}")


if __name__ == "__main__":
    from world_engine import World
    
    # Test: generate a small world and render it
    world = World(size=32, seed=42)
    world.generate_terrain()
    world.generate_locations(count=10)
    world.discover_area(16, 16, 5)
    
    generate_tileset("/root/projects/aetheria/web/assets/tiles")
    render_world_map(world, "/root/projects/aetheria/web/assets/map_test.png")
    
    print("\n✨ Pixel art generation complete! ✨")
