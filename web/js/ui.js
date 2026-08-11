/**
 * AETHERIA UI Controller
 * Handles all UI interactions, data loading, and panel management.
 */

// Global state
let worldData = null;
let worldMap = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Aetheria] Starting up...');
    
    // Safety timer: auto-show app after 5 seconds no matter what
    const safetyTimer = setTimeout(() => {
        console.warn('[Aetheria] Safety timer triggered — forcing app visible');
        showApp();
    }, 5000);
    
    try {
        // Step 1: Fetch world data (with timeout)
        updateLoadingText('Loading world data...');
        worldData = await fetchWorldData();
        console.log('[Aetheria] World loaded:', worldData.size + 'x' + worldData.size, 'seed:', worldData.seed);
        
        // Step 2: Show app
        showApp();
        clearTimeout(safetyTimer);
        
        // Step 3: Small delay for layout to settle
        await new Promise(r => setTimeout(r, 50));
        
        // Step 4: Initialize map (container now has real dimensions)
        console.log('[Aetheria] Initializing map...');
        worldMap = new WorldMap('world-map');
        worldMap.loadWorld(worldData);
        
        // Step 5: Build UI
        console.log('[Aetheria] Building UI...');
        initializeUI();
        
        // Entrance animations
        const header = document.querySelector('.main-header');
        const sidebar = document.querySelector('.sidebar');
        const mapContainer = document.querySelector('.map-container');
        if (header) header.style.animation = 'fadeInUp 0.5s ease';
        if (sidebar) sidebar.style.animation = 'fadeInUp 0.6s ease';
        if (mapContainer) mapContainer.style.animation = 'fadeInUp 0.7s ease';
        
        console.log('[Aetheria] Ready!');
    } catch (err) {
        clearTimeout(safetyTimer);
        console.error('[Aetheria] FATAL ERROR:', err);
        updateLoadingText('Error: ' + err.message);
        const loadingText = document.querySelector('.loading-text');
        if (loadingText) {
            loadingText.style.color = '#ff6b6b';
            loadingText.innerHTML = '<div style="margin-top:1rem">Something went wrong.<br>Check the browser console (F12) for details.</div>';
        }
    }
});

async function fetchWorldData() {
    // Fetch with 3-second timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    
    try {
        const response = await fetch('data/world.json', { signal: controller.signal });
        clearTimeout(timeout);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return await response.json();
    } catch (e) {
        clearTimeout(timeout);
        if (e.name === 'AbortError') {
            console.warn('[Aetheria] Fetch timed out, using fallback world');
        } else {
            console.warn('[Aetheria] Fetch failed:', e.message);
        }
        return createFallbackWorld();
    }
}

function showApp() {
    const loadingScreen = document.getElementById('loading-screen');
    const app = document.getElementById('app');
    if (loadingScreen) loadingScreen.style.display = 'none';
    if (app) {
        app.classList.remove('hidden');
        app.style.display = 'flex';
        app.style.opacity = '1';
    }
}

function updateLoadingText(text) {
    const el = document.querySelector('.loading-text');
    if (el) el.textContent = text;
}

function createFallbackWorld() {
    const size = 32;
    const tiles = [];
    for (let y = 0; y < size; y++) {
        const row = [];
        for (let x = 0; x < size; x++) {
            const biomes = ['plains', 'forest', 'mountain', 'ocean', 'desert'];
            row.push({
                x, y,
                biome: biomes[Math.floor(Math.random() * biomes.length)],
                discovered: Math.random() > 0.7,
                location: null
            });
        }
        tiles.push(row);
    }
    
    return {
        seed: 42,
        size,
        world_age: 0,
        created_at: new Date().toISOString(),
        tiles,
        locations: [
            { id: 'loc_0', name: 'Ancient Ruins', type: 'ruins', icon: '🏛️', x: 10, y: 10, biome: 'plains', description: 'Crumbling stones whisper tales of ages past.', discovered: true },
            { id: 'loc_1', name: 'Crystal Tower', type: 'tower', icon: '🗼', x: 20, y: 15, biome: 'mountain', description: 'A spire of ancient power.', discovered: false }
        ],
        characters: [],
        events: [],
        discovered_count: 100
    };
}

function initializeUI() {
    // Update stats
    updateWorldStats(worldData);
    
    // Setup tabs
    setupTabs();
    
    // Populate lists
    populateLocations();
    populateCharacters();
    populateTimeline();
    populateLore();
    
    // Setup search
    setupSearch();
    
    // Setup map controls
    setupMapControls();
    
    // Setup detail panel
    setupDetailPanel();
    
    // Setup help modal
    setupHelpModal();
    
    // Setup footer
    document.getElementById('seed-display').textContent = `Seed: ${worldData.seed}`;
    document.getElementById('last-updated').textContent = `Created: ${new Date(worldData.created_at).toLocaleDateString()}`;
}

function updateWorldStats(data) {
    const discovered = data.tiles.flat().filter(t => t.discovered).length;
    document.getElementById('world-age').textContent = data.world_age;
    document.getElementById('discovered-count').textContent = discovered;
    document.getElementById('location-count').textContent = data.locations.length;
    document.getElementById('character-count').textContent = data.characters.length;
}

// ===== Tabs =====
function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Update active content
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(`tab-${tabName}`).classList.add('active');
        });
    });
}

// ===== Locations List =====
function populateLocations() {
    const container = document.getElementById('locations-list');
    container.innerHTML = '';
    
    // Sort: discovered first, then by name
    const sorted = [...worldData.locations].sort((a, b) => {
        const aDisc = worldData.tiles[a.y][a.x].discovered;
        const bDisc = worldData.tiles[b.y][b.x].discovered;
        if (aDisc !== bDisc) return bDisc - aDisc;
        return a.name.localeCompare(b.name);
    });
    
    sorted.forEach(loc => {
        const tile = worldData.tiles[loc.y][loc.x];
        const isDiscovered = tile.discovered;
        
        const item = document.createElement('div');
        item.className = `list-item ${isDiscovered ? 'discovered' : 'undiscovered'}`;
        item.innerHTML = `
            <div class="list-item-header">
                <span class="list-item-icon">${loc.icon}</span>
                <span class="list-item-name">${loc.name}</span>
            </div>
            <div class="list-item-meta">
                <span>${loc.type}</span>
                <span>•</span>
                <span>${loc.biome.replace('_', ' ')}</span>
                <span>•</span>
                <span>${loc.x}, ${loc.y}</span>
            </div>
            <div class="list-item-desc">${isDiscovered ? loc.description : 'Undiscovered...'}</div>
        `;
        
        item.addEventListener('click', () => {
            // Pan to location
            worldMap.selectedTile = { x: loc.x, y: loc.y, data: tile };
            const screen = worldMap.worldToScreen(loc.x * TILE_SIZE, loc.y * TILE_SIZE);
            worldMap.offsetX = worldMap.canvas.width / 2 - screen.x - (TILE_SIZE * worldMap.scale) / 2;
            worldMap.offsetY = worldMap.canvas.height / 2 - screen.y - (TILE_SIZE * worldMap.scale) / 2;
            
            if (isDiscovered) {
                showLocationDetail(loc);
            }
        });
        
        container.appendChild(item);
    });
}

// ===== Characters List =====
function populateCharacters() {
    const container = document.getElementById('characters-list');
    container.innerHTML = '';
    
    worldData.characters.forEach(char => {
        const item = document.createElement('div');
        item.className = 'list-item discovered';
        item.innerHTML = `
            <div class="list-item-header">
                <span class="list-item-icon">🧙</span>
                <span class="list-item-name">${char.name}</span>
            </div>
            <div class="list-item-meta">
                <span>${char.race}</span>
                <span>•</span>
                <span>${char.role}</span>
                <span>•</span>
                <span>Level ${char.level}</span>
            </div>
            <div class="list-item-desc">A ${char.personality} ${char.race.toLowerCase()} ${char.role.toLowerCase()} wandering the world.</div>
        `;
        
        item.addEventListener('click', () => {
            showCharacterDetail(char);
        });
        
        container.appendChild(item);
    });
}

// ===== Timeline =====
function populateTimeline() {
    const container = document.getElementById('timeline');
    container.innerHTML = '';
    
    worldData.events.forEach(evt => {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.innerHTML = `
            <div class="timeline-age">${evt.age} years ago</div>
            <div class="timeline-title">${evt.name}</div>
            <div class="timeline-desc">${evt.description}</div>
        `;
        container.appendChild(item);
    });
}

// ===== Lore =====
function populateLore() {
    const container = document.getElementById('biome-legend');
    
    const biomeInfo = {
        ocean_deep: { name: 'Deep Ocean', desc: 'The abyssal depths', color: '#0a1628' },
        ocean: { name: 'Ocean', desc: 'Vast waters', color: '#1e3a5f' },
        beach: { name: 'Beach', desc: 'Sandy shores', color: '#e6d5a7' },
        plains: { name: 'Plains', desc: 'Rolling grasslands', color: '#5a8f3c' },
        forest: { name: 'Forest', desc: 'Ancient woods', color: '#2d5a1e' },
        forest_deep: { name: 'Deep Forest', desc: 'The woodland heart', color: '#1a3a0f' },
        mountain: { name: 'Mountain', desc: 'Craggy peaks', color: '#6b6b6b' },
        mountain_peak: { name: 'Peak', desc: 'The highest points', color: '#8a8a8a' },
        snow: { name: 'Snow', desc: 'Frozen tundra', color: '#e8f0f5' },
        desert: { name: 'Desert', desc: 'Scorching sands', color: '#c4a35a' },
        swamp: { name: 'Swamp', desc: 'Murmuring wetlands', color: '#3d4a2a' },
        volcanic: { name: 'Volcanic', desc: 'Lands of fire', color: '#4a1a1a' },
        jungle: { name: 'Jungle', desc: 'Tropical growth', color: '#1a5c1a' },
        crystal: { name: 'Crystal', desc: 'Otherworldly fields', color: '#7a5a9e' },
    };
    
    // Only show biomes that exist in the world
    const presentBiomes = new Set(worldData.tiles.flat().map(t => t.biome));
    
    presentBiomes.forEach(biomeKey => {
        const info = biomeInfo[biomeKey];
        if (!info) return;
        
        const item = document.createElement('div');
        item.className = 'biome-item';
        item.innerHTML = `
            <div class="biome-swatch" style="background: ${info.color}"></div>
            <span class="biome-name">${info.name}</span>
            <span class="biome-desc">${info.desc}</span>
        `;
        container.appendChild(item);
    });
}

// ===== Search =====
function setupSearch() {
    const locSearch = document.getElementById('location-search');
    locSearch.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const items = document.querySelectorAll('#locations-list .list-item');
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(query) ? 'block' : 'none';
        });
    });
    
    const charSearch = document.getElementById('character-search');
    charSearch.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const items = document.querySelectorAll('#characters-list .list-item');
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(query) ? 'block' : 'none';
        });
    });
}

// ===== Map Controls =====
function setupMapControls() {
    document.getElementById('btn-zoom-in').addEventListener('click', () => worldMap.zoomIn());
    document.getElementById('btn-zoom-out').addEventListener('click', () => worldMap.zoomOut());
    document.getElementById('btn-reset').addEventListener('click', () => worldMap.resetView());
    
    document.getElementById('btn-discover').addEventListener('click', () => {
        const discovered = worldMap.randomDiscovery();
        if (discovered > 0) {
            showToast(`🌟 Discovered ${discovered} new tiles!`);
            populateLocations();
            updateWorldStats(worldData);
        } else {
            showToast('✨ All areas have been discovered!');
        }
    });
}

// ===== Detail Panel =====
function setupDetailPanel() {
    document.getElementById('detail-close').addEventListener('click', () => {
        document.getElementById('detail-panel').classList.add('hidden');
    });
}

function showLocationDetail(loc) {
    const panel = document.getElementById('detail-panel');
    const content = document.getElementById('detail-content');
    
    const biomeNames = {
        ocean_deep: 'Deep Ocean', ocean: 'Ocean', beach: 'Beach',
        plains: 'Plains', forest: 'Forest', forest_deep: 'Deep Forest',
        mountain: 'Mountain', mountain_peak: 'Mountain Peak',
        snow: 'Snow', desert: 'Desert', swamp: 'Swamp',
        volcanic: 'Volcanic', jungle: 'Jungle', crystal: 'Crystal Fields'
    };
    
    content.innerHTML = `
        <div class="detail-header">
            <span class="detail-icon">${loc.icon}</span>
            <h2 class="detail-title">${loc.name}</h2>
            <div class="detail-subtitle">${loc.type.toUpperCase()} • ${biomeNames[loc.biome] || loc.biome} • ${loc.x}, ${loc.y}</div>
        </div>
        
        <div class="detail-section">
            <div class="detail-section-title">Description</div>
            <div class="detail-text">${loc.description}</div>
        </div>
        
        <div class="detail-section">
            <div class="detail-section-title">Details</div>
            <div class="detail-tags">
                <span class="detail-tag">Type: ${loc.type}</span>
                <span class="detail-tag">Biome: ${loc.biome}</span>
                <span class="detail-tag ${worldData.tiles[loc.y][loc.x].discovered ? 'safe' : 'danger'}">
                    ${worldData.tiles[loc.y][loc.x].discovered ? '👁️ Discovered' : '🙈 Hidden'}
                </span>
            </div>
        </div>
        
        ${loc.inhabitants && loc.inhabitants.length > 0 ? `
        <div class="detail-section">
            <div class="detail-section-title">Inhabitants</div>
            <div class="detail-text">${loc.inhabitants.join(', ')}</div>
        </div>
        ` : ''}
        
        ${loc.lore && loc.lore.length > 0 ? `
        <div class="detail-section">
            <div class="detail-section-title">Lore</div>
            ${loc.lore.map(l => `<div class="detail-text" style="margin-bottom: 0.5rem; font-style: italic;">"${l}"</div>`).join('')}
        </div>
        ` : ''}
    `;
    
    panel.classList.remove('hidden');
}

function showCharacterDetail(char) {
    const panel = document.getElementById('detail-panel');
    const content = document.getElementById('detail-content');
    
    const loc = char.location_id ? worldData.locations.find(l => l.id === char.location_id) : null;
    
    content.innerHTML = `
        <div class="detail-header">
            <span class="detail-icon">🧙</span>
            <h2 class="detail-title">${char.name}</h2>
            <div class="detail-subtitle">${char.race} ${char.role} • Level ${char.level}</div>
        </div>
        
        <div class="detail-section">
            <div class="detail-section-title">Personality</div>
            <div class="detail-text">${char.personality.charAt(0).toUpperCase() + char.personality.slice(1)}</div>
        </div>
        
        ${loc ? `
        <div class="detail-section">
            <div class="detail-section-title">Location</div>
            <div class="detail-text">Currently at ${loc.icon} ${loc.name} (${loc.x}, ${loc.y})</div>
        </div>
        ` : ''}
        
        <div class="detail-section">
            <div class="detail-section-title">Stats</div>
            <div class="detail-tags">
                <span class="detail-tag">Level ${char.level}</span>
                <span class="detail-tag">${char.race}</span>
                <span class="detail-tag">${char.role}</span>
            </div>
        </div>
        
        ${char.backstory ? `
        <div class="detail-section">
            <div class="detail-section-title">Backstory</div>
            <div class="detail-text">${char.backstory}</div>
        </div>
        ` : ''}
    `;
    
    panel.classList.remove('hidden');
}

function showTileDetail(tile) {
    const panel = document.getElementById('detail-panel');
    const content = document.getElementById('detail-content');
    
    const biomeNames = {
        ocean_deep: 'Deep Ocean', ocean: 'Ocean', beach: 'Beach',
        plains: 'Plains', forest: 'Forest', forest_deep: 'Deep Forest',
        mountain: 'Mountain', mountain_peak: 'Mountain Peak',
        snow: 'Snow', desert: 'Desert', swamp: 'Swamp',
        volcanic: 'Volcanic', jungle: 'Jungle', crystal: 'Crystal Fields'
    };
    
    const biome = biomeNames[tile.data.biome] || tile.data.biome;
    
    content.innerHTML = `
        <div class="detail-header">
            <span class="detail-icon">🌍</span>
            <h2 class="detail-title">${biome}</h2>
            <div class="detail-subtitle">Tile ${tile.x}, ${tile.y}</div>
        </div>
        
        <div class="detail-section">
            <div class="detail-section-title">Terrain</div>
            <div class="detail-text">
                Elevation: ${(tile.data.elevation * 100).toFixed(1)}%<br>
                Moisture: ${(tile.data.moisture * 100).toFixed(1)}%<br>
                Temperature: ${(tile.data.temperature * 100).toFixed(1)}%<br>
                Magic: ${(tile.data.magic * 100).toFixed(1)}%
            </div>
        </div>
        
        <div class="detail-section">
            <div class="detail-section-title">Status</div>
            <div class="detail-tags">
                <span class="detail-tag ${tile.data.discovered ? 'safe' : 'danger'}">
                    ${tile.data.discovered ? '👁️ Discovered' : '🙈 Undiscovered'}
                </span>
            </div>
        </div>
    `;
    
    panel.classList.remove('hidden');
}

// ===== Help Modal =====
function setupHelpModal() {
    const modal = document.getElementById('help-modal');
    
    document.getElementById('btn-help').addEventListener('click', () => {
        modal.classList.remove('hidden');
    });
    
    document.getElementById('modal-close').addEventListener('click', () => {
        modal.classList.add('hidden');
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
    
    // Close on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            modal.classList.add('hidden');
            document.getElementById('detail-panel').classList.add('hidden');
        }
    });
}

// ===== Toast notifications =====
function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--bg-secondary);
        border: 1px solid var(--accent-gold);
        color: var(--text-accent);
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-family: var(--font-mono);
        font-size: 0.85rem;
        z-index: 1000;
        animation: fadeInUp 0.3s ease;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s';
        setTimeout(() => toast.remove(), 500);
    }, 2500);
}

// ===== Sound toggle (placeholder) =====
document.getElementById('btn-sound').addEventListener('click', () => {
    showToast('🔇 Sound coming soon...');
});
