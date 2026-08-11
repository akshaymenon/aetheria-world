/**
 * AETHERIA World Map Renderer
 * Interactive canvas-based map with pan, zoom, fog of war, and discovery.
 */

class WorldMap {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error('[Aetheria] Canvas element not found:', canvasId);
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        
        // World data
        this.worldData = null;
        this.tileCache = {};
        this.locationIcons = {};
        
        // View state
        this.scale = 2;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        // Selection
        this.selectedTile = null;
        this.hoveredTile = null;
        
        // Animation
        this.discoverAnim = [];
        this.lastFrame = 0;
        
        this.init();
    }
    
    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        if (!this.canvas) return;
        
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));
        this.canvas.addEventListener('click', (e) => this.onClick(e));
        this.canvas.addEventListener('mouseleave', () => this.onMouseLeave());
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
        this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));
        
        // Start render loop
        this.animate();
    }
    
    resize() {
        if (!this.canvas) return;
        const container = this.canvas.parentElement;
        if (!container) return;
        const w = container.clientWidth || 800;
        const h = container.clientHeight || 600;
        this.canvas.width = w;
        this.canvas.height = h;
        this.render();
    }
    
    async loadWorld(data) {
        this.worldData = data;
        
        // Pre-generate tile colors
        this.generateTileCache();
        
        // Ensure canvas has dimensions before calculating offsets
        if (this.canvas.width === 0 || this.canvas.height === 0) {
            console.warn('[Aetheria] Canvas has zero dimensions, retrying...');
            requestAnimationFrame(() => this.loadWorld(data));
            return;
        }
        
        // Center on starting position
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const worldCenterX = (data.size * TILE_SIZE * this.scale) / 2;
        const worldCenterY = (data.size * TILE_SIZE * this.scale) / 2;
        this.offsetX = centerX - worldCenterX;
        this.offsetY = centerY - worldCenterY;
        
        this.render();
        console.log('[Aetheria] Map loaded and centered');
    }
    
    generateTileCache() {
        const biomeColors = {
            ocean_deep: ['#0a1628', '#0d1f38', '#122a45'],
            ocean: ['#1e3a5f', '#2a4f7c', '#356699'],
            beach: ['#e6d5a7', '#d4c494', '#f0e0b8'],
            plains: ['#5a8f3c', '#4a7a30', '#6ba34a'],
            forest: ['#2d5a1e', '#234716', '#386e25'],
            forest_deep: ['#1a3a0f', '#142e0b', '#204714'],
            mountain: ['#6b6b6b', '#5a5a5a', '#7a7a7a'],
            mountain_peak: ['#8a8a8a', '#7a7a7a', '#9a9a9a'],
            snow: ['#e8f0f5', '#d5e0e8', '#f5f8fa'],
            desert: ['#c4a35a', '#b8944a', '#d4b46a'],
            swamp: ['#3d4a2a', '#323d22', '#485830'],
            volcanic: ['#4a1a1a', '#3d1515', '#5a2020'],
            jungle: ['#1a5c1a', '#154a15', '#1f6e1f'],
            crystal: ['#7a5a9e', '#6b4d8a', '#8a6ab0'],
        };
        
        for (const [biome, colors] of Object.entries(biomeColors)) {
            this.tileCache[biome] = colors;
        }
    }
    
    // Coordinate conversions
    screenToWorld(screenX, screenY) {
        const x = (screenX - this.offsetX) / this.scale;
        const y = (screenY - this.offsetY) / this.scale;
        return { x, y };
    }
    
    worldToScreen(worldX, worldY) {
        const x = worldX * this.scale + this.offsetX;
        const y = worldY * this.scale + this.offsetY;
        return { x, y };
    }
    
    getTileAt(screenX, screenY) {
        if (!this.worldData) return null;
        const world = this.screenToWorld(screenX, screenY);
        const tileX = Math.floor(world.x / TILE_SIZE);
        const tileY = Math.floor(world.y / TILE_SIZE);
        
        if (tileX < 0 || tileX >= this.worldData.size || tileY < 0 || tileY >= this.worldData.size) {
            return null;
        }
        
        return {
            x: tileX,
            y: tileY,
            data: this.worldData.tiles[tileY][tileX]
        };
    }
    
    // Event handlers
    onMouseDown(e) {
        this.isDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.canvas.style.cursor = 'grabbing';
    }
    
    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (this.isDragging) {
            const dx = e.clientX - this.lastMouseX;
            const dy = e.clientY - this.lastMouseY;
            this.offsetX += dx;
            this.offsetY += dy;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        } else {
            // Hover
            const tile = this.getTileAt(x, y);
            if (tile && tile.data.discovered) {
                this.hoveredTile = tile;
                this.showTooltip(x, y, tile);
            } else {
                this.hoveredTile = null;
                this.hideTooltip();
            }
        }
        
        // Update coords display
        const tile = this.getTileAt(x, y);
        if (tile) {
            document.getElementById('coords-display').textContent = `${tile.x}, ${tile.y}`;
        }
    }
    
    onMouseUp(e) {
        this.isDragging = false;
        this.canvas.style.cursor = 'grab';
    }
    
    onWheel(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const worldBefore = this.screenToWorld(mouseX, mouseY);
        
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.5, Math.min(8, this.scale * zoomFactor));
        
        this.scale = newScale;
        
        const worldAfter = this.screenToWorld(mouseX, mouseY);
        this.offsetX += (worldAfter.x - worldBefore.x) * this.scale;
        this.offsetY += (worldAfter.y - worldBefore.y) * this.scale;
    }
    
    onClick(e) {
        if (Math.abs(e.clientX - this.lastMouseX) > 5 || Math.abs(e.clientY - this.lastMouseY) > 5) {
            return; // Was dragging, not clicking
        }
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const tile = this.getTileAt(x, y);
        if (tile) {
            this.selectedTile = tile;
            
            // Check if there's a location here
            const location = this.worldData.locations.find(l => l.x === tile.x && l.y === tile.y);
            if (location && tile.data.discovered) {
                showLocationDetail(location);
            } else {
                showTileDetail(tile);
            }
        }
    }
    
    onMouseLeave() {
        this.hoveredTile = null;
        this.hideTooltip();
    }
    
    // Touch events
    onTouchStart(e) {
        if (e.touches.length === 1) {
            this.isDragging = true;
            this.lastMouseX = e.touches[0].clientX;
            this.lastMouseY = e.touches[0].clientY;
        }
    }
    
    onTouchMove(e) {
        e.preventDefault();
        if (e.touches.length === 1 && this.isDragging) {
            const dx = e.touches[0].clientX - this.lastMouseX;
            const dy = e.touches[0].clientY - this.lastMouseY;
            this.offsetX += dx;
            this.offsetY += dy;
            this.lastMouseX = e.touches[0].clientX;
            this.lastMouseY = e.touches[0].clientY;
        }
    }
    
    onTouchEnd(e) {
        this.isDragging = false;
    }
    
    // Tooltip
    showTooltip(x, y, tile) {
        const tooltip = document.getElementById('map-tooltip');
        const location = this.worldData.locations.find(l => l.x === tile.x && l.y === tile.y);
        
        let content = '';
        if (location) {
            content = `
                <div class="map-tooltip-title">${location.icon} ${location.name}</div>
                <div class="map-tooltip-meta">${location.type} • ${tile.data.biome.replace('_', ' ')}</div>
                <div class="map-tooltip-desc">${location.description.substring(0, 100)}...</div>
            `;
        } else {
            const biomeNames = {
                ocean_deep: 'Deep Ocean', ocean: 'Ocean', beach: 'Beach',
                plains: 'Plains', forest: 'Forest', forest_deep: 'Deep Forest',
                mountain: 'Mountain', mountain_peak: 'Mountain Peak',
                snow: 'Snow', desert: 'Desert', swamp: 'Swamp',
                volcanic: 'Volcanic', jungle: 'Jungle', crystal: 'Crystal Fields'
            };
            content = `
                <div class="map-tooltip-title">${biomeNames[tile.data.biome] || tile.data.biome}</div>
                <div class="map-tooltip-meta">${tile.x}, ${tile.y}</div>
            `;
        }
        
        tooltip.innerHTML = content;
        tooltip.style.left = Math.min(x + 15, this.canvas.width - 260) + 'px';
        tooltip.style.top = Math.min(y + 15, this.canvas.height - 100) + 'px';
        tooltip.classList.add('visible');
    }
    
    hideTooltip() {
        document.getElementById('map-tooltip').classList.remove('visible');
    }
    
    // Discovery
    discoverArea(centerX, centerY, radius = 6) {
        if (!this.worldData) return;
        
        let discovered = 0;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx * dx + dy * dy <= radius * radius) {
                    const x = centerX + dx;
                    const y = centerY + dy;
                    if (x >= 0 && x < this.worldData.size && y >= 0 && y < this.worldData.size) {
                        if (!this.worldData.tiles[y][x].discovered) {
                            this.worldData.tiles[y][x].discovered = true;
                            discovered++;
                            
                            // Add animation
                            const screen = this.worldToScreen(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2);
                            this.discoverAnim.push({
                                x: screen.x,
                                y: screen.y,
                                time: 0,
                                maxTime: 30
                            });
                        }
                    }
                }
            }
        }
        
        // Update stats
        updateWorldStats(this.worldData);
        
        return discovered;
    }
    
    randomDiscovery() {
        if (!this.worldData) return;
        
        // Find undiscovered tiles adjacent to discovered ones
        const candidates = [];
        for (let y = 0; y < this.worldData.size; y++) {
            for (let x = 0; x < this.worldData.size; x++) {
                if (!this.worldData.tiles[y][x].discovered) {
                    // Check if adjacent to discovered
                    const adjacent = [
                        [x-1, y], [x+1, y], [x, y-1], [x, y+1]
                    ];
                    for (const [ax, ay] of adjacent) {
                        if (ax >= 0 && ax < this.worldData.size && ay >= 0 && ay < this.worldData.size) {
                            if (this.worldData.tiles[ay][ax].discovered) {
                                candidates.push({x, y});
                                break;
                            }
                        }
                    }
                }
            }
        }
        
        if (candidates.length > 0) {
            const center = candidates[Math.floor(Math.random() * candidates.length)];
            return this.discoverArea(center.x, center.y, 3 + Math.floor(Math.random() * 4));
        }
        
        return 0;
    }
    
    // Rendering
    render() {
        if (!this.worldData) return;
        
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        // Clear
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, w, h);
        
        // Calculate visible range
        const topLeft = this.screenToWorld(0, 0);
        const bottomRight = this.screenToWorld(w, h);
        
        const startX = Math.max(0, Math.floor(topLeft.x / TILE_SIZE) - 1);
        const startY = Math.max(0, Math.floor(topLeft.y / TILE_SIZE) - 1);
        const endX = Math.min(this.worldData.size, Math.floor(bottomRight.x / TILE_SIZE) + 2);
        const endY = Math.min(this.worldData.size, Math.floor(bottomRight.y / TILE_SIZE) + 2);
        
        // Render tiles
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const tile = this.worldData.tiles[y][x];
                const screen = this.worldToScreen(x * TILE_SIZE, y * TILE_SIZE);
                const size = TILE_SIZE * this.scale;
                
                if (!tile.discovered) {
                    // Fog of war
                    ctx.fillStyle = '#0f0f15';
                    ctx.fillRect(screen.x, screen.y, size, size);
                    
                    // Subtle grid
                    ctx.strokeStyle = '#1a1a25';
                    ctx.lineWidth = 0.5;
                    ctx.strokeRect(screen.x, screen.y, size, size);
                } else {
                    // Biome tile
                    const colors = this.tileCache[tile.biome];
                    const colorIdx = (x + y * 7) % colors.length;
                    ctx.fillStyle = colors[colorIdx];
                    ctx.fillRect(screen.x, screen.y, size, size);
                    
                    // Add subtle texture variation
                    if (this.scale > 2) {
                        ctx.fillStyle = colors[(colorIdx + 1) % colors.length];
                        ctx.globalAlpha = 0.3;
                        const seed = x * 374761393 + y * 668265263;
                        const nx = (seed % 4) * (size / 4);
                        const ny = ((seed >> 2) % 4) * (size / 4);
                        ctx.fillRect(screen.x + nx, screen.y + ny, size / 4, size / 4);
                        ctx.globalAlpha = 1;
                    }
                }
                
                // Highlight hovered tile
                if (this.hoveredTile && this.hoveredTile.x === x && this.hoveredTile.y === y && tile.discovered) {
                    ctx.strokeStyle = 'rgba(201, 168, 76, 0.6)';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(screen.x, screen.y, size, size);
                }
                
                // Highlight selected tile
                if (this.selectedTile && this.selectedTile.x === x && this.selectedTile.y === y && tile.discovered) {
                    ctx.strokeStyle = 'rgba(201, 168, 76, 0.9)';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(screen.x, screen.y, size, size);
                    
                    // Glow effect
                    ctx.shadowColor = 'rgba(201, 168, 76, 0.5)';
                    ctx.shadowBlur = 10;
                    ctx.strokeRect(screen.x, screen.y, size, size);
                    ctx.shadowBlur = 0;
                }
            }
        }
        
        // Render locations
        for (const loc of this.worldData.locations) {
            const tile = this.worldData.tiles[loc.y][loc.x];
            if (!tile.discovered && !tile.discovered) continue;
            
            const screen = this.worldToScreen(loc.x * TILE_SIZE, loc.y * TILE_SIZE);
            const size = TILE_SIZE * this.scale;
            
            // Location glow
            if (this.scale > 1) {
                ctx.shadowColor = 'rgba(201, 168, 76, 0.4)';
                ctx.shadowBlur = 8;
            }
            
            // Draw location icon
            ctx.font = `${Math.max(8, size * 0.8)}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(loc.icon, screen.x + size / 2, screen.y + size / 2);
            
            ctx.shadowBlur = 0;
            
            // Location name at higher zoom
            if (this.scale > 3) {
                ctx.fillStyle = '#e8e4dc';
                ctx.font = `${Math.max(8, size * 0.25)}px 'Cinzel', serif`;
                ctx.textAlign = 'center';
                ctx.fillText(loc.name, screen.x + size / 2, screen.y + size + 10);
            }
        }
        
        // Render discovery animations
        this.renderDiscoverAnimations(ctx);
        
        // Render grid overlay at certain zoom levels
        if (this.scale > 4) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 0.5;
            for (let x = startX; x <= endX; x++) {
                const screen = this.worldToScreen(x * TILE_SIZE, 0);
                ctx.beginPath();
                ctx.moveTo(screen.x, 0);
                ctx.lineTo(screen.x, h);
                ctx.stroke();
            }
            for (let y = startY; y <= endY; y++) {
                const screen = this.worldToScreen(0, y * TILE_SIZE);
                ctx.beginPath();
                ctx.moveTo(0, screen.y);
                ctx.lineTo(w, screen.y);
                ctx.stroke();
            }
        }
    }
    
    renderDiscoverAnimations(ctx) {
        for (let i = this.discoverAnim.length - 1; i >= 0; i--) {
            const anim = this.discoverAnim[i];
            anim.time++;
            
            const progress = anim.time / anim.maxTime;
            const radius = 20 * (1 - progress);
            const alpha = 1 - progress;
            
            ctx.beginPath();
            ctx.arc(anim.x, anim.y, radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(201, 168, 76, ${alpha})`;
            ctx.lineWidth = 2;
            ctx.stroke();
            
            if (anim.time >= anim.maxTime) {
                this.discoverAnim.splice(i, 1);
            }
        }
    }
    
    animate() {
        this.render();
        requestAnimationFrame(() => this.animate());
    }
    
    // Controls
    zoomIn() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const worldBefore = this.screenToWorld(centerX, centerY);
        this.scale = Math.min(8, this.scale * 1.3);
        const worldAfter = this.screenToWorld(centerX, centerY);
        this.offsetX += (worldAfter.x - worldBefore.x) * this.scale;
        this.offsetY += (worldAfter.y - worldBefore.y) * this.scale;
    }
    
    zoomOut() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const worldBefore = this.screenToWorld(centerX, centerY);
        this.scale = Math.max(0.5, this.scale / 1.3);
        const worldAfter = this.screenToWorld(centerX, centerY);
        this.offsetX += (worldAfter.x - worldBefore.x) * this.scale;
        this.offsetY += (worldAfter.y - worldBefore.y) * this.scale;
    }
    
    resetView() {
        this.scale = 2;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const worldCenterX = (this.worldData.size * TILE_SIZE * this.scale) / 2;
        const worldCenterY = (this.worldData.size * TILE_SIZE * this.scale) / 2;
        this.offsetX = centerX - worldCenterX;
        this.offsetY = centerY - worldCenterY;
    }
}

// Global state (single source of truth — declared here, assigned in ui.js)
const TILE_SIZE = 16;
let worldMap;
let worldData;
