(function () {
  'use strict';

  const STORAGE_KEY = 'cityOfHabits_v1';
  const LEGACY_KEY = 'habitLoopStudy_v1';
  const STATE_VERSION = 1;

  const DISTRICTS = [
    { id: 'hearth', name: 'Hearth', desc: 'Rest, sleep, and home rituals', base: '#c9b8a8', accent: '#8a7a6a' },
    { id: 'civic', name: 'Civic', desc: 'Body, health, and energy', base: '#9cb0a0', accent: '#6b8e6b' },
    { id: 'market', name: 'Market', desc: 'Work, admin, and errands', base: '#b8c4d0', accent: '#6a7d8e' },
    { id: 'foundry', name: 'Foundry', desc: 'Making, craft, and repair', base: '#d4bfa0', accent: '#a88a54' },
    { id: 'observatory', name: 'Observatory', desc: 'Learning, reading, and mind', base: '#b8a8c8', accent: '#7a6a8a' },
    { id: 'grove', name: 'Grove', desc: 'Nature, outdoors, and movement', base: '#a8c8a8', accent: '#6b8e6b' },
    { id: 'harbor', name: 'Harbor', desc: 'Connection, care, and community', base: '#a8c0c8', accent: '#5a7a85' }
  ];

  const DISTRICT_IDS = new Set(DISTRICTS.map(d => d.id));

  const CADENCES = [
    { id: 'daily', label: 'Every day' },
    { id: 'weekdays', label: 'Weekdays' },
    { id: 'weekends', label: 'Weekends' },
    { id: 'weekly', label: 'Once a week' }
  ];

  const CADENCE_IDS = new Set(CADENCES.map(c => c.id));
  const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const WEEKLY_CHOICES = [
    { id: 'keep', label: 'Keep going', desc: 'This size feels right.' },
    { id: 'smaller', label: 'Make it smaller', desc: 'Lower the minimum for now.' },
    { id: 'cue', label: 'Change the cue', desc: 'Try a different reminder.' },
    { id: 'pause', label: 'Pause', desc: 'Set it aside without shame.' }
  ];

  const WEEKLY_CHOICE_IDS = new Set(WEEKLY_CHOICES.map(c => c.id));
  const HISTORY_ACTIONS = new Set(['done', 'skip']);

  let state = loadState();
  let legacyState = null;
  let modalOpener = null;

  const els = {
    navLinks: document.querySelectorAll('.nav-link'),
    views: {
      city: document.getElementById('view-city'),
      today: document.getElementById('view-today'),
      atlas: document.getElementById('view-atlas'),
      habits: document.getElementById('view-habits'),
      weekly: document.getElementById('view-weekly'),
      settings: document.getElementById('view-settings')
    },
    cityScene: document.getElementById('city-scene'),
    citySummary: document.getElementById('city-summary'),
    cityLegendList: document.getElementById('city-legend-list'),
    todayDate: document.getElementById('today-date'),
    todayScheduleHint: document.getElementById('today-schedule-hint'),
    todayList: document.getElementById('today-list'),
    todayEmpty: document.getElementById('today-empty'),
    atlasGrid: document.getElementById('atlas-grid'),
    atlasEmpty: document.getElementById('atlas-empty'),
    activeHabits: document.getElementById('active-habits'),
    archivedHabitsSection: document.getElementById('archived-habits-section'),
    archivedHabits: document.getElementById('archived-habits'),
    habitsEmpty: document.getElementById('habits-empty'),
    weeklySubtitle: document.getElementById('weekly-subtitle'),
    weeklyList: document.getElementById('weekly-list'),
    weeklyEmpty: document.getElementById('weekly-empty'),
    btnExport: document.getElementById('btn-export'),
    importFile: document.getElementById('import-file'),
    importResult: document.getElementById('import-result'),
    legacyMigrationCard: document.getElementById('legacy-migration-card'),
    btnMigrate: document.getElementById('btn-migrate'),
    btnDiscardLegacy: document.getElementById('btn-discard-legacy'),
    migrationResult: document.getElementById('migration-result'),
    btnErase: document.getElementById('btn-erase'),
    modal: document.getElementById('habit-modal'),
    modalTitle: document.getElementById('habit-modal-title'),
    habitForm: document.getElementById('habit-form'),
    habitId: document.getElementById('habit-id'),
    habitTitle: document.getElementById('habit-title'),
    habitCue: document.getElementById('habit-cue'),
    habitMinimum: document.getElementById('habit-minimum'),
    habitCadence: document.getElementById('habit-cadence'),
    habitDistrict: document.getElementById('habit-district')
  };

  // --------------------------------------------------------------------------
  // Storage and state
  // --------------------------------------------------------------------------
  function makeDefaultState() {
    return {
      version: STATE_VERSION,
      habits: [],
      history: {},
      weekly: {},
      settings: {}
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return makeDefaultState();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return makeDefaultState();
      const merged = { ...makeDefaultState(), ...parsed };
      merged.habits = Array.isArray(merged.habits) ? merged.habits.map(normalizeHabit) : [];
      merged.history = typeof merged.history === 'object' && merged.history !== null ? merged.history : {};
      merged.weekly = typeof merged.weekly === 'object' && merged.weekly !== null ? merged.weekly : {};
      merged.settings = typeof merged.settings === 'object' && merged.settings !== null ? merged.settings : {};
      return merged;
    } catch (e) {
      console.error('Failed to load state', e);
      return makeDefaultState();
    }
  }

  function normalizeHabit(h, index) {
    if (!h || typeof h !== 'object') {
      return null;
    }
    return {
      id: typeof h.id === 'string' ? h.id : generateId(),
      title: typeof h.title === 'string' ? h.title : '',
      cue: typeof h.cue === 'string' ? h.cue : '',
      minimum: typeof h.minimum === 'string' ? h.minimum : '',
      cadence: CADENCE_IDS.has(h.cadence) ? h.cadence : 'daily',
      district: DISTRICT_IDS.has(h.district) ? h.district : 'hearth',
      createdAt: typeof h.createdAt === 'string' ? h.createdAt : isoNow(),
      archivedAt: h.archivedAt === null || typeof h.archivedAt === 'string' ? h.archivedAt : null,
      paused: h.paused === true,
      order: typeof h.order === 'number' ? h.order : (typeof index === 'number' ? index : 0)
    };
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save state', e);
    }
  }

  // --------------------------------------------------------------------------
  // Legacy migration
  // --------------------------------------------------------------------------
  function detectLegacyState() {
    try {
      const raw = localStorage.getItem(LEGACY_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        localStorage.removeItem(LEGACY_KEY);
        return null;
      }
      return parsed;
    } catch (e) {
      localStorage.removeItem(LEGACY_KEY);
      return null;
    }
  }

  function importLegacy() {
    if (!legacyState || !legacyState.habit) return;
    const id = generateId();
    const habit = {
      id,
      title: String(legacyState.habit.action || '').trim() || 'Imported habit',
      cue: String(legacyState.habit.cue || '').trim(),
      minimum: String(legacyState.habit.minimum || '').trim(),
      cadence: 'daily',
      district: 'hearth',
      createdAt: legacyState.habit.createdAt || isoNow(),
      archivedAt: null,
      paused: false,
      order: state.habits.length
    };
    state.habits.push(habit);

    if (legacyState.history && typeof legacyState.history === 'object') {
      Object.entries(legacyState.history).forEach(([date, record]) => {
        if (!record || typeof record !== 'object') return;
        const action = record.action;
        if (action === 'done' || action === 'skip') {
          if (!state.history[date]) state.history[date] = {};
          state.history[date][id] = action;
        }
      });
    }

    localStorage.removeItem(LEGACY_KEY);
    legacyState = null;
    saveState();
    renderLegacyMigration();
    renderAll();
    showMigrationMessage('Old habit imported into the city.', false);
  }

  function discardLegacy() {
    try {
      localStorage.removeItem(LEGACY_KEY);
    } catch (e) {
      console.error('Failed to discard legacy state', e);
    }
    legacyState = null;
    renderLegacyMigration();
    showMigrationMessage('Old data discarded. Starting fresh.', false);
  }

  function renderLegacyMigration() {
    if (legacyState) {
      els.legacyMigrationCard.classList.remove('is-hidden');
    } else {
      els.legacyMigrationCard.classList.add('is-hidden');
    }
  }

  function showMigrationMessage(text, isError) {
    els.migrationResult.textContent = text;
    els.migrationResult.className = 'import-result ' + (isError ? 'error' : 'success');
    setTimeout(() => {
      els.migrationResult.textContent = '';
      els.migrationResult.className = 'import-result';
    }, 5000);
  }

  // --------------------------------------------------------------------------
  // Routing
  // --------------------------------------------------------------------------
  function showView(viewId) {
    Object.values(els.views).forEach(v => v.classList.add('is-hidden'));
    els.views[viewId].classList.remove('is-hidden');
    els.navLinks.forEach(link => {
      const active = link.dataset.view === viewId;
      link.classList.toggle('is-active', active);
      link.setAttribute('aria-current', active ? 'page' : 'false');
    });
    currentView = viewId;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  let currentView = 'city';

  // --------------------------------------------------------------------------
  // Rendering helpers
  // --------------------------------------------------------------------------
  function renderAll() {
    renderCity();
    renderToday();
    renderAtlas();
    renderHabits();
    renderWeekly();
    renderSettings();
  }

  function activeHabits() {
    return state.habits.filter(h => !h.archivedAt).sort((a, b) => a.order - b.order);
  }

  function archivedHabits() {
    return state.habits.filter(h => !!h.archivedAt).sort((a, b) => a.archivedAt.localeCompare(b.archivedAt));
  }

  function scheduledHabits() {
    return activeHabits().filter(h => !h.paused && isScheduledToday(h));
  }

  function getDistrict(id) {
    return DISTRICTS.find(d => d.id === id) || DISTRICTS[0];
  }

  function countDone(habitId) {
    let total = 0;
    Object.values(state.history).forEach(day => {
      if (day && day[habitId] === 'done') total += 1;
    });
    return total;
  }

  function todayRecord(habitId) {
    const day = state.history[todayKey()];
    return day ? day[habitId] : null;
  }

  // --------------------------------------------------------------------------
  // City view
  // --------------------------------------------------------------------------
  function renderCity() {
    const habits = state.habits;
    const svg = generateCitySvg(habits);
    els.cityScene.innerHTML = '';
    els.cityScene.appendChild(svg);

    const totalDone = habits.reduce((sum, h) => sum + countDone(h.id), 0);
    const activeCount = activeHabits().length;
    const archivedCount = archivedHabits().length;

    let summary = `Your city has ${activeCount} active habit${activeCount === 1 ? '' : 's'}`;
    if (archivedCount) summary += ` and ${archivedCount} archived`;
    summary += `, with ${totalDone} completed day${totalDone === 1 ? '' : 's'} recorded.`;

    const districtParts = DISTRICTS.map(d => {
      const done = habits.filter(h => h.district === d.id).reduce((sum, h) => sum + countDone(h.id), 0);
      const count = habits.filter(h => h.district === d.id && !h.archivedAt).length;
      if (count === 0 && done === 0) return null;
      return `${d.name}: ${count} habit${count === 1 ? '' : 's'}${done ? `, ${done} days` : ''}`;
    }).filter(Boolean);

    if (districtParts.length) {
      summary += ' ' + districtParts.join('; ') + '.';
    }

    els.citySummary.textContent = summary;
    renderCityLegend();
  }

  function renderCityLegend() {
    els.cityLegendList.innerHTML = '';
    DISTRICTS.forEach(d => {
      const li = document.createElement('li');
      li.className = 'legend-item';
      li.innerHTML = `<span class="legend-dot" style="background:${escapeHtml(d.base)}" aria-hidden="true"></span>${escapeHtml(d.name)}`;
      els.cityLegendList.appendChild(li);
    });
  }

  function generateCitySvg(habits) {
    const viewBox = '0 0 1000 520';
    const svg = makeSvg('svg');
    svg.setAttribute('viewBox', viewBox);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.setAttribute('role', 'img');

    const totalDone = habits.reduce((sum, h) => sum + countDone(h.id), 0);
    const titleText = `City of Habits skyline showing ${habits.length} habit${habits.length === 1 ? '' : 's'} and ${totalDone} completed day${totalDone === 1 ? '' : 's'}.`;
    const titleEl = makeSvg('title');
    titleEl.textContent = titleText;
    svg.appendChild(titleEl);
    svg.setAttribute('aria-label', titleText);

    const defs = makeSvg('defs');
    defs.innerHTML = `
      <linearGradient id="skyGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#e8f0f7"/>
        <stop offset="100%" stop-color="#f7f4ef"/>
      </linearGradient>
      <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#2b2620" flood-opacity="0.12"/>
      </filter>
    `;
    svg.appendChild(defs);

    const sky = makeSvg('rect');
    sky.setAttribute('x', '0');
    sky.setAttribute('y', '0');
    sky.setAttribute('width', '1000');
    sky.setAttribute('height', '520');
    sky.setAttribute('fill', 'url(#skyGradient)');
    svg.appendChild(sky);

    const sun = makeSvg('circle');
    sun.setAttribute('cx', '880');
    sun.setAttribute('cy', '70');
    sun.setAttribute('r', '28');
    sun.setAttribute('fill', '#e8c97c');
    sun.setAttribute('opacity', '0.85');
    svg.appendChild(sun);

    if (habits.length === 0) {
      const message = makeSvg('text');
      message.setAttribute('x', '500');
      message.setAttribute('y', '260');
      message.setAttribute('text-anchor', 'middle');
      message.setAttribute('fill', '#6b6256');
      message.setAttribute('font-size', '18');
      message.setAttribute('font-family', 'Georgia, serif');
      message.textContent = 'Your city is waiting for its first habit.';
      svg.appendChild(message);
    } else {
      const bandW = 1000 / DISTRICTS.length;
      const pad = 16;
      const groundY = 420;

      DISTRICTS.forEach((district, idx) => {
        const districtHabits = habits
          .filter(h => h.district === district.id)
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        const x0 = idx * bandW + pad;
        const usableW = bandW - pad * 2;

        if (districtHabits.length > 0) {
          const slotCount = districtHabits.length;
          const slotW = usableW / slotCount;
          districtHabits.forEach((habit, j) => {
            const hash = hashString(habit.id);
            const done = countDone(habit.id);
            const bW = Math.min(76, Math.max(32, slotW - 14 + (hash % 10) - 5));
            const x = x0 + j * slotW + slotW / 2 - bW / 2;
            const baseH = 46;
            const floorH = 14;
            const maxFloors = 20;
            const floors = Math.min(done, maxFloors);
            const height = baseH + floors * floorH + (hash % 28);
            const y = groundY - height;

            drawBuilding(svg, { x, y, width: bW, height, district, done, hash, archived: !!habit.archivedAt });
          });
        }

        // District label
        const label = makeSvg('text');
        label.setAttribute('x', x0 + usableW / 2);
        label.setAttribute('y', groundY + 26);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('fill', '#6b6256');
        label.setAttribute('font-size', '12');
        label.setAttribute('font-weight', '600');
        label.setAttribute('font-family', 'sans-serif');
        label.textContent = district.name;
        svg.appendChild(label);
      });
    }

    const ground = makeSvg('rect');
    ground.setAttribute('x', '0');
    ground.setAttribute('y', '420');
    ground.setAttribute('width', '1000');
    ground.setAttribute('height', '100');
    ground.setAttribute('fill', 'var(--color-ground)');
    svg.appendChild(ground);

    return svg;
  }

  function drawBuilding(svg, { x, y, width, height, district, done, hash, archived }) {
    const g = makeSvg('g');
    if (archived) g.setAttribute('opacity', '0.55');

    const body = makeSvg('rect');
    body.setAttribute('x', x);
    body.setAttribute('y', y);
    body.setAttribute('width', width);
    body.setAttribute('height', height);
    body.setAttribute('rx', '3');
    body.setAttribute('fill', district.base);
    body.setAttribute('stroke', district.accent);
    body.setAttribute('stroke-width', '1');
    g.appendChild(body);

    const rows = Math.max(1, Math.floor((height - 22) / 16));
    const cols = Math.max(1, Math.floor((width - 10) / 12));
    const winW = Math.max(4, (width - 10 - (cols - 1) * 4) / cols);
    const winH = 7;
    const totalWindows = rows * cols;
    const lit = Math.min(done, totalWindows);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const wx = x + 5 + c * (winW + 4);
        const wy = y + height - 12 - r * 15;
        const win = makeSvg('rect');
        win.setAttribute('x', wx);
        win.setAttribute('y', wy);
        win.setAttribute('width', winW);
        win.setAttribute('height', winH);
        win.setAttribute('rx', '1');
        if (idx < lit) {
          win.setAttribute('fill', '#f7f4ef');
          win.setAttribute('opacity', '0.92');
        } else {
          win.setAttribute('fill', '#5a5046');
          win.setAttribute('opacity', '0.22');
        }
        g.appendChild(win);
      }
    }

    const roofStyle = Math.abs(hash) % 3;
    if (roofStyle === 0) {
      const roof = makeSvg('path');
      roof.setAttribute('d', `M${x - 2},${y} L${x + width / 2},${y - 14} L${x + width + 2},${y} Z`);
      roof.setAttribute('fill', district.accent);
      g.appendChild(roof);
    } else if (roofStyle === 1) {
      const roof = makeSvg('path');
      roof.setAttribute('d', `M${x},${y} A${width / 2},${width / 2} 0 0 1 ${x + width},${y}`);
      roof.setAttribute('fill', district.accent);
      g.appendChild(roof);
    } else {
      const roof = makeSvg('rect');
      roof.setAttribute('x', x + 2);
      roof.setAttribute('y', y - 6);
      roof.setAttribute('width', width - 4);
      roof.setAttribute('height', '6');
      roof.setAttribute('rx', '1');
      roof.setAttribute('fill', district.accent);
      g.appendChild(roof);
    }

    svg.insertBefore(g, svg.querySelector('rect[y="420"]'));
  }

  function makeSvg(tag) {
    return document.createElementNS('http://www.w3.org/2000/svg', tag);
  }

  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h;
  }

  // --------------------------------------------------------------------------
  // Today view
  // --------------------------------------------------------------------------
  function renderToday() {
    const now = new Date();
    els.todayDate.textContent = now.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const habits = scheduledHabits();
    els.todayList.innerHTML = '';

    const allActive = activeHabits();
    const pausedCount = allActive.filter(h => h.paused).length;
    const unscheduledCount = allActive.filter(h => !h.paused && !isScheduledToday(h)).length;

    if (habits.length === 0) {
      els.todayList.classList.add('is-hidden');
      els.todayEmpty.classList.remove('is-hidden');
      let emptyText = 'No habits yet. Add one to begin building your city.';
      if (allActive.length > 0) {
        const parts = [];
        if (pausedCount) parts.push(`${pausedCount} paused`);
        if (unscheduledCount) parts.push(`${unscheduledCount} not scheduled for today`);
        if (parts.length) {
          emptyText = `Nothing scheduled for today (${parts.join(', ')}). Rest is part of the rhythm.`;
        } else {
          emptyText = 'Nothing scheduled for today. Rest is part of the rhythm.';
        }
      }
      els.todayEmpty.querySelector('p').textContent = emptyText;
      els.todayScheduleHint.textContent = '';
      return;
    }

    els.todayList.classList.remove('is-hidden');
    els.todayEmpty.classList.add('is-hidden');

    const onceWeeklyCount = habits.filter(h => h.cadence === 'weekly').length;
    if (onceWeeklyCount > 0) {
      els.todayScheduleHint.textContent = 'Once-a-week habits appear on their assigned day based on the habit name.';
    } else {
      els.todayScheduleHint.textContent = '';
    }

    habits.forEach(habit => {
      const record = todayRecord(habit.id);
      const district = getDistrict(habit.district);
      const cadence = CADENCES.find(c => c.id === habit.cadence) || CADENCES[0];
      const doneTotal = countDone(habit.id);
      const cadenceLabel = cadenceLabelForToday(habit);

      const card = document.createElement('article');
      card.className = 'today-card card';

      const main = document.createElement('div');
      main.className = 'today-card__main';

      const meta = document.createElement('div');
      meta.className = 'today-card__meta';
      meta.innerHTML = `
        <h3>${escapeHtml(habit.title)}</h3>
        <p class="today-card__statement">After ${escapeHtml(habit.cue)}, at least ${escapeHtml(habit.minimum)}.</p>
        <div class="today-card__tags">
          <span class="tag" style="background:${district.base}22;color:${district.accent};border-color:${district.accent}44">${escapeHtml(district.name)}</span>
          <span class="tag" title="${escapeHtml(cadenceLabel)}">${escapeHtml(cadenceLabel)}</span>
          <span class="tag" aria-label="${doneTotal} completed days">${doneTotal} days</span>
        </div>
      `;

      const status = document.createElement('div');
      status.className = 'today-card__status';
      const statusText = record === 'done' ? 'Done today' : record === 'skip' ? 'Not today' : 'Not yet';
      status.innerHTML = `
        <span class="status-badge ${record || ''}" aria-live="polite">${escapeHtml(statusText)}</span>
        <div class="week-dots" aria-label="Last seven days">${renderWeekDots(habit.id)}</div>
      `;

      main.appendChild(meta);
      main.appendChild(status);
      card.appendChild(main);

      const actions = document.createElement('div');
      actions.className = 'action-bar';

      const btnDone = makeButton('Done', 'btn--done', () => markToday(habit.id, 'done'));
      const btnSkip = makeButton('Not today', 'btn--skip', () => markToday(habit.id, 'skip'));
      const btnUndo = makeButton('Undo', 'btn--ghost', () => undoToday(habit.id), record === null);

      actions.appendChild(btnDone);
      actions.appendChild(btnSkip);
      actions.appendChild(btnUndo);
      card.appendChild(actions);

      els.todayList.appendChild(card);
    });
  }

  function cadenceLabelForToday(habit) {
    const cadence = CADENCES.find(c => c.id === habit.cadence);
    if (!cadence) return 'Every day';
    if (habit.cadence === 'weekly') {
      return `${cadence.label} — ${WEEKDAY_NAMES[assignedWeekday(habit.id)]}`;
    }
    return cadence.label;
  }

  function isScheduledToday(habit) {
    const day = new Date().getDay();
    switch (habit.cadence) {
      case 'daily': return true;
      case 'weekdays': return day >= 1 && day <= 5;
      case 'weekends': return day === 0 || day === 6;
      case 'weekly': return day === assignedWeekday(habit.id);
      default: return true;
    }
  }

  function assignedWeekday(habitId) {
    return Math.abs(hashString(habitId)) % 7;
  }

  function renderWeekDots(habitId) {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = dateKey(d);
      const action = (state.history[key] || {})[habitId] || null;
      const label = d.toLocaleDateString(undefined, { weekday: 'short' });
      const title = `${label}: ${action === 'done' ? 'done' : action === 'skip' ? 'not today' : 'no record'}`;
      days.push(`<span class="week-dot ${action || ''}" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}"></span>`);
    }
    return days.join('');
  }

  function markToday(habitId, action) {
    const key = todayKey();
    if (!state.history[key]) state.history[key] = {};
    state.history[key][habitId] = action;
    saveState();
    renderAll();
  }

  function undoToday(habitId) {
    const key = todayKey();
    const day = state.history[key];
    if (day && day[habitId]) {
      delete day[habitId];
      if (Object.keys(day).length === 0) delete state.history[key];
      saveState();
      renderAll();
    }
  }

  // --------------------------------------------------------------------------
  // Atlas view
  // --------------------------------------------------------------------------
  function renderAtlas() {
    const habits = state.habits;
    els.atlasGrid.innerHTML = '';

    if (habits.length === 0) {
      els.atlasGrid.classList.add('is-hidden');
      els.atlasEmpty.classList.remove('is-hidden');
      return;
    }

    els.atlasGrid.classList.remove('is-hidden');
    els.atlasEmpty.classList.add('is-hidden');

    DISTRICTS.forEach(district => {
      const districtHabits = habits
        .filter(h => h.district === district.id)
        .sort((a, b) => a.order - b.order);
      if (districtHabits.length === 0) return;

      const card = document.createElement('article');
      card.className = 'district-card card card--flat';
      card.innerHTML = `
        <h3>
          <span class="legend-dot" style="background:${escapeHtml(district.base)}" aria-hidden="true"></span>
          ${escapeHtml(district.name)}
        </h3>
        <p class="district-card__desc">${escapeHtml(district.desc)}</p>
        <div class="building-list"></div>
      `;
      const list = card.querySelector('.building-list');

      districtHabits.forEach(habit => {
        const done = countDone(habit.id);
        const cadence = CADENCES.find(c => c.id === habit.cadence) || CADENCES[0];
        const archived = !!habit.archivedAt;
        const paused = !archived && habit.paused;
        const building = document.createElement('div');
        building.className = 'building-card';
        if (archived) building.classList.add('building-card--archived');
        const tags = [];
        if (archived) tags.push('<span class="tag">Archived</span>');
        if (paused) tags.push('<span class="tag">Paused</span>');
        building.innerHTML = `
          <div class="building-card__icon" aria-hidden="true">${generateMiniBuilding(habit, done)}</div>
          <div class="building-card__body">
            <p class="building-card__title">${escapeHtml(habit.title)}${tags.join('')}</p>
            <p class="building-card__detail">${escapeHtml(cadence.label)} · ${done} completed day${done === 1 ? '' : 's'}</p>
          </div>
          <div class="building-card__actions">
            ${paused
              ? `<button class="btn btn--ghost" data-resume="${habit.id}">Resume</button>`
              : `<button class="btn btn--ghost" data-edit="${habit.id}">Edit</button>`}
            <button class="btn btn--ghost" data-archive-toggle="${habit.id}">${archived ? 'Unarchive' : 'Archive'}</button>
          </div>
        `;
        list.appendChild(building);
      });

      els.atlasGrid.appendChild(card);
    });

    bindAtlasActions();
  }

  function generateMiniBuilding(habit, done) {
    const district = getDistrict(habit.district);
    const hash = hashString(habit.id);
    const floors = Math.min(done, 12);
    const height = 18 + floors * 4;
    const width = 32;
    const y = 48 - height;
    const roofStyle = Math.abs(hash) % 3;
    let roof = '';
    if (roofStyle === 0) {
      roof = `<path d="M0,${y} L16,${y - 8} L32,${y} Z" fill="${district.accent}"/>`;
    } else if (roofStyle === 1) {
      roof = `<path d="M0,${y} A16,16 0 0 1 32,${y}" fill="${district.accent}"/>`;
    } else {
      roof = `<rect x="4" y="${y - 4}" width="24" height="4" rx="1" fill="${district.accent}"/>`;
    }
    return `<svg viewBox="0 0 32 48" role="img" aria-label="${escapeHtml(habit.title)} building">
      <title>${escapeHtml(habit.title)}</title>
      <rect x="0" y="${y}" width="32" height="${height}" rx="2" fill="${district.base}" stroke="${district.accent}" stroke-width="1"/>
      ${roof}
    </svg>`;
  }

  function bindAtlasActions() {
    els.atlasGrid.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => openHabitModal(btn.dataset.edit));
    });
    els.atlasGrid.querySelectorAll('[data-resume]').forEach(btn => {
      btn.addEventListener('click', () => resumeHabit(btn.dataset.resume));
    });
    els.atlasGrid.querySelectorAll('[data-archive-toggle]').forEach(btn => {
      btn.addEventListener('click', () => toggleArchive(btn.dataset.archiveToggle));
    });
  }

  // --------------------------------------------------------------------------
  // Habits view
  // --------------------------------------------------------------------------
  function renderHabits() {
    const active = activeHabits();
    const archived = archivedHabits();

    els.activeHabits.innerHTML = '';
    els.archivedHabits.innerHTML = '';

    if (active.length === 0 && archived.length === 0) {
      els.habitsEmpty.classList.remove('is-hidden');
      els.activeHabits.classList.add('is-hidden');
      els.archivedHabitsSection.classList.add('is-hidden');
      return;
    }

    els.habitsEmpty.classList.add('is-hidden');
    els.activeHabits.classList.remove('is-hidden');

    active.forEach(habit => {
      els.activeHabits.appendChild(renderHabitRow(habit));
    });

    if (archived.length > 0) {
      els.archivedHabitsSection.classList.remove('is-hidden');
      archived.forEach(habit => {
        els.archivedHabits.appendChild(renderHabitRow(habit));
      });
    } else {
      els.archivedHabitsSection.classList.add('is-hidden');
    }

    bindHabitActions();
  }

  function renderHabitRow(habit) {
    const district = getDistrict(habit.district);
    const cadence = CADENCES.find(c => c.id === habit.cadence) || CADENCES[0];
    const done = countDone(habit.id);
    const archived = !!habit.archivedAt;
    const paused = !archived && habit.paused;
    const row = document.createElement('article');
    row.className = 'habit-row card';
    const tags = [];
    if (paused) tags.push('<span class="tag">Paused</span>');
    row.innerHTML = `
      <div class="habit-row__info">
        <h3>${escapeHtml(habit.title)}</h3>
        <p class="habit-row__meta">
          <span class="tag" style="background:${district.base}22;color:${district.accent};border-color:${district.accent}44">${escapeHtml(district.name)}</span>
          ${escapeHtml(cadence.label)} · ${done} completed day${done === 1 ? '' : 's'}
          ${tags.join('')}
        </p>
      </div>
      <div class="habit-row__actions">
        ${paused
          ? `<button class="btn btn--ghost" data-resume="${habit.id}">Resume</button>`
          : `<button class="btn btn--ghost" data-edit="${habit.id}">Edit</button>`}
        <button class="btn btn--ghost" data-archive-toggle="${habit.id}">${archived ? 'Unarchive' : 'Archive'}</button>
      </div>
    `;
    return row;
  }

  function bindHabitActions() {
    document.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => openHabitModal(btn.dataset.edit));
    });
    document.querySelectorAll('[data-resume]').forEach(btn => {
      btn.addEventListener('click', () => resumeHabit(btn.dataset.resume));
    });
    document.querySelectorAll('[data-archive-toggle]').forEach(btn => {
      btn.addEventListener('click', () => toggleArchive(btn.dataset.archiveToggle));
    });
  }

  function toggleArchive(id) {
    const habit = state.habits.find(h => h.id === id);
    if (!habit) return;
    if (habit.archivedAt) {
      habit.archivedAt = null;
    } else {
      habit.archivedAt = isoNow();
      habit.paused = false;
    }
    saveState();
    renderAll();
  }

  function resumeHabit(id) {
    const habit = state.habits.find(h => h.id === id);
    if (!habit || !habit.paused) return;
    habit.paused = false;
    saveState();
    renderAll();
  }

  // --------------------------------------------------------------------------
  // Habit modal
  // --------------------------------------------------------------------------
  function populateDistrictSelect() {
    els.habitDistrict.innerHTML = '';
    DISTRICTS.forEach(d => {
      const option = document.createElement('option');
      option.value = d.id;
      option.textContent = `${d.name} — ${d.desc}`;
      els.habitDistrict.appendChild(option);
    });
  }

  function openHabitModal(id) {
    modalOpener = document.activeElement;
    populateDistrictSelect();
    els.habitForm.reset();
    if (id) {
      const habit = state.habits.find(h => h.id === id);
      if (!habit) return;
      els.modalTitle.textContent = 'Edit habit';
      els.habitId.value = habit.id;
      els.habitTitle.value = habit.title;
      els.habitCue.value = habit.cue;
      els.habitMinimum.value = habit.minimum;
      els.habitCadence.value = habit.cadence;
      els.habitDistrict.value = habit.district;
    } else {
      els.modalTitle.textContent = 'New habit';
      els.habitId.value = '';
      els.habitCadence.value = 'daily';
      els.habitDistrict.value = 'hearth';
    }
    els.modal.classList.add('is-open');
    els.modal.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => els.habitTitle.focus());
  }

  function closeHabitModal() {
    els.modal.classList.remove('is-open');
    els.modal.setAttribute('aria-hidden', 'true');
    if (modalOpener && typeof modalOpener.focus === 'function') {
      requestAnimationFrame(() => modalOpener.focus());
    }
    modalOpener = null;
  }

  function getModalFocusables() {
    return Array.from(els.modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )).filter(el => !el.disabled && el.offsetParent !== null);
  }

  function onModalKeydown(e) {
    if (e.key === 'Escape') {
      closeHabitModal();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusables = getModalFocusables();
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function onHabitSubmit(e) {
    e.preventDefault();
    const title = els.habitTitle.value.trim();
    const cue = els.habitCue.value.trim();
    const minimum = els.habitMinimum.value.trim();
    const cadence = els.habitCadence.value;
    const district = els.habitDistrict.value;

    if (!title || !cue || !minimum || !cadence || !district) return;

    const existingId = els.habitId.value;
    if (existingId) {
      const habit = state.habits.find(h => h.id === existingId);
      if (habit) {
        habit.title = title;
        habit.cue = cue;
        habit.minimum = minimum;
        habit.cadence = cadence;
        habit.district = district;
      }
    } else {
      state.habits.push({
        id: generateId(),
        title,
        cue,
        minimum,
        cadence,
        district,
        createdAt: isoNow(),
        archivedAt: null,
        paused: false,
        order: state.habits.length
      });
    }

    saveState();
    closeHabitModal();
    renderAll();
  }

  // --------------------------------------------------------------------------
  // Weekly view
  // --------------------------------------------------------------------------
  function renderWeekly() {
    const weekKey = currentWeekKey();
    const start = weekStartDate();
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const rangeText = `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    els.weeklySubtitle.textContent = rangeText;

    const habits = activeHabits().filter(h => !h.paused);
    els.weeklyList.innerHTML = '';

    if (habits.length === 0) {
      els.weeklyList.classList.add('is-hidden');
      els.weeklyEmpty.classList.remove('is-hidden');
      const anyPaused = activeHabits().some(h => h.paused);
      els.weeklyEmpty.querySelector('p').textContent = anyPaused
        ? 'All active habits are paused. Resume one from Habits or Atlas to check in.'
        : 'No active habits to check in with.';
      return;
    }

    els.weeklyList.classList.remove('is-hidden');
    els.weeklyEmpty.classList.add('is-hidden');

    const weekData = state.weekly[weekKey] || {};

    habits.forEach(habit => {
      const current = weekData[habit.id] || null;
      const card = document.createElement('article');
      card.className = 'weekly-card card';

      const header = document.createElement('div');
      header.className = 'weekly-card__header';
      header.innerHTML = `
        <h3>${escapeHtml(habit.title)}</h3>
        <p class="weekly-card__current">${escapeHtml(weeklyStatusText(current))}</p>
      `;
      card.appendChild(header);

      const row = document.createElement('div');
      row.className = 'choice-row';
      WEEKLY_CHOICES.forEach(choice => {
        const active = current && current.choice === choice.id;
        const btn = makeButton(choice.label, active ? 'btn--primary' : 'btn--secondary', () => setWeeklyChoice(habit.id, choice.id));
        btn.title = choice.desc;
        btn.setAttribute('aria-pressed', String(active));
        row.appendChild(btn);
      });
      card.appendChild(row);

      if (current && current.choice === 'smaller') {
        const field = document.createElement('div');
        field.className = 'field';
        field.innerHTML = `<label for="weekly-min-${habit.id}">New minimum version</label>`;
        const input = document.createElement('input');
        input.type = 'text';
        input.id = `weekly-min-${habit.id}`;
        input.value = habit.minimum;
        input.addEventListener('change', () => updateHabitMinimum(habit.id, input.value.trim()));
        field.appendChild(input);
        card.appendChild(field);
      }

      if (current && current.choice === 'cue') {
        const field = document.createElement('div');
        field.className = 'field';
        field.innerHTML = `<label for="weekly-cue-${habit.id}">New cue</label>`;
        const input = document.createElement('input');
        input.type = 'text';
        input.id = `weekly-cue-${habit.id}`;
        input.value = habit.cue;
        input.addEventListener('change', () => updateHabitCue(habit.id, input.value.trim()));
        field.appendChild(input);
        card.appendChild(field);
      }

      const noteLabel = document.createElement('label');
      noteLabel.className = 'hint';
      noteLabel.setAttribute('for', `weekly-note-${habit.id}`);
      noteLabel.textContent = 'Optional note to yourself';
      const note = document.createElement('textarea');
      note.className = 'weekly-note field';
      note.id = `weekly-note-${habit.id}`;
      note.value = current && typeof current.note === 'string' ? current.note : '';
      note.addEventListener('change', () => setWeeklyNote(habit.id, note.value));
      card.appendChild(noteLabel);
      card.appendChild(note);

      els.weeklyList.appendChild(card);
    });
  }

  function weeklyStatusText(current) {
    if (!hasWeeklyCheckIn(current)) return 'No check-in yet this week.';
    if (current.choice) {
      return `This week: ${getChoiceLabel(current.choice)}${current.note ? ' · note saved' : ''}`;
    }
    return 'This week: note saved';
  }

  function hasWeeklyCheckIn(entry) {
    return !!entry && (typeof entry.choice === 'string' || typeof entry.note === 'string');
  }

  function getChoiceLabel(id) {
    const choice = WEEKLY_CHOICES.find(c => c.id === id);
    return choice ? choice.label : id;
  }

  function updateHabitMinimum(habitId, value) {
    const habit = state.habits.find(h => h.id === habitId);
    if (!habit || !value) return;
    habit.minimum = value;
    saveState();
    renderAll();
  }

  function updateHabitCue(habitId, value) {
    const habit = state.habits.find(h => h.id === habitId);
    if (!habit || !value) return;
    habit.cue = value;
    saveState();
    renderAll();
  }

  function setWeeklyChoice(habitId, choice) {
    const weekKey = currentWeekKey();
    if (!state.weekly[weekKey]) state.weekly[weekKey] = {};
    const existing = state.weekly[weekKey][habitId] || {};
    state.weekly[weekKey][habitId] = {
      ...existing,
      choice,
      at: isoNow()
    };
    if (choice === 'pause') {
      const habit = state.habits.find(h => h.id === habitId);
      if (habit) habit.paused = true;
    }
    saveState();
    renderAll();
  }

  function setWeeklyNote(habitId, note) {
    const weekKey = currentWeekKey();
    if (!state.weekly[weekKey]) state.weekly[weekKey] = {};
    const existing = state.weekly[weekKey][habitId] || {};
    state.weekly[weekKey][habitId] = {
      ...existing,
      note,
      at: isoNow()
    };
    saveState();
    renderWeekly();
  }

  // --------------------------------------------------------------------------
  // Settings view
  // --------------------------------------------------------------------------
  function renderSettings() {
    renderLegacyMigration();
  }

  function exportJson() {
    const payload = {
      version: 'city-of-habits-v1',
      exportedAt: isoNow(),
      habits: state.habits,
      history: state.history,
      weekly: state.weekly,
      settings: state.settings
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `city-of-habits-backup-${todayKey()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showImportResult('Backup downloaded.', false);
  }

  function onImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!validateBackup(parsed)) {
          showImportResult('That file does not look like a valid City of Habits backup.', true);
          return;
        }
        if (!window.confirm('Replace all current data with this backup? Export first if you are unsure.')) {
          return;
        }
        state = {
          version: STATE_VERSION,
          habits: (parsed.habits || []).map(normalizeHabit),
          history: parsed.history || {},
          weekly: parsed.weekly || {},
          settings: parsed.settings || {}
        };
        saveState();
        renderAll();
        showImportResult('Backup restored successfully.', false);
      } catch (err) {
        showImportResult('Could not read backup file.', true);
      }
    };
    reader.onerror = () => showImportResult('Could not read backup file.', true);
    reader.readAsText(file);
    e.target.value = '';
  }

  function validateBackup(obj) {
    if (!obj || typeof obj !== 'object') return false;
    if (typeof obj.version !== 'string' || !obj.version.startsWith('city-of-habits-v')) return false;
    if (!Array.isArray(obj.habits)) return false;
    if (!obj.history || typeof obj.history !== 'object' || Array.isArray(obj.history)) return false;
    if (!obj.weekly || typeof obj.weekly !== 'object' || Array.isArray(obj.weekly)) return false;
    if (obj.settings === undefined || obj.settings === null) {
      // settings is optional but if present must be an object
    } else if (typeof obj.settings !== 'object' || Array.isArray(obj.settings)) {
      return false;
    }

    const ids = new Set();
    for (let i = 0; i < obj.habits.length; i++) {
      const h = obj.habits[i];
      if (!h || typeof h !== 'object') return false;
      if (typeof h.id !== 'string' || h.id.length === 0) return false;
      if (ids.has(h.id)) return false;
      ids.add(h.id);
      if (typeof h.title !== 'string' || h.title.length === 0) return false;
      if (typeof h.cue !== 'string') return false;
      if (typeof h.minimum !== 'string') return false;
      if (!CADENCE_IDS.has(h.cadence)) return false;
      if (!DISTRICT_IDS.has(h.district)) return false;
      if (typeof h.createdAt !== 'string' || Number.isNaN(Date.parse(h.createdAt))) return false;
      if (h.archivedAt !== null && typeof h.archivedAt !== 'string') return false;
      if (h.archivedAt !== null && Number.isNaN(Date.parse(h.archivedAt))) return false;
      if (h.paused !== undefined && h.paused !== null && typeof h.paused !== 'boolean') return false;
      if (h.order !== undefined && typeof h.order !== 'number') return false;
    }

    for (const [date, day] of Object.entries(obj.history)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return false;
      if (!day || typeof day !== 'object' || Array.isArray(day)) return false;
      for (const [habitId, action] of Object.entries(day)) {
        if (typeof habitId !== 'string' || habitId.length === 0) return false;
        if (!ids.has(habitId)) return false;
        if (typeof action !== 'string' || !HISTORY_ACTIONS.has(action)) return false;
      }
    }

    for (const [week, habits] of Object.entries(obj.weekly)) {
      if (typeof week !== 'string' || week.length === 0) return false;
      if (!habits || typeof habits !== 'object' || Array.isArray(habits)) return false;
      for (const [habitId, entry] of Object.entries(habits)) {
        if (typeof habitId !== 'string' || habitId.length === 0) return false;
        if (!ids.has(habitId)) return false;
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false;
        if (entry.choice !== undefined && entry.choice !== null && !WEEKLY_CHOICE_IDS.has(entry.choice)) return false;
        if (entry.note !== undefined && typeof entry.note !== 'string') return false;
        if (entry.at !== undefined && (typeof entry.at !== 'string' || Number.isNaN(Date.parse(entry.at)))) return false;
      }
    }

    return true;
  }

  function showImportResult(text, isError) {
    els.importResult.textContent = text;
    els.importResult.className = 'import-result ' + (isError ? 'error' : 'success');
    setTimeout(() => {
      els.importResult.textContent = '';
      els.importResult.className = 'import-result';
    }, 5000);
  }

  function eraseAllData() {
    if (window.confirm('Erase all City of Habits data on this device? This cannot be undone.')) {
      localStorage.removeItem(STORAGE_KEY);
      state = makeDefaultState();
      saveState();
      renderAll();
      showImportResult('All data erased.', false);
    }
  }

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------
  function makeButton(text, className, onClick, disabled = false) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn ' + className;
    btn.textContent = text;
    btn.disabled = disabled;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function generateId() {
    return 'h-' + Math.random().toString(36).slice(2, 9) + '-' + Date.now().toString(36).slice(-4);
  }

  function isoNow() {
    return new Date().toISOString();
  }

  function todayKey() {
    return dateKey(new Date());
  }

  function dateKey(date) {
    const offset = date.getTimezoneOffset() * 60 * 1000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
  }

  function currentWeekKey() {
    const now = new Date();
    const start = weekStartDate(now);
    const year = start.getFullYear();
    const month = String(start.getMonth() + 1).padStart(2, '0');
    const day = String(start.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function weekStartDate(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }

  // --------------------------------------------------------------------------
  // Init
  // --------------------------------------------------------------------------
  function init() {
    legacyState = detectLegacyState();

    els.navLinks.forEach(link => {
      link.addEventListener('click', () => showView(link.dataset.view));
    });

    document.querySelectorAll('[data-action="new-habit"]').forEach(btn => {
      btn.addEventListener('click', () => openHabitModal(null));
    });

    els.habitForm.addEventListener('submit', onHabitSubmit);
    els.modal.querySelectorAll('[data-close-modal]').forEach(el => {
      el.addEventListener('click', closeHabitModal);
    });
    els.modal.addEventListener('keydown', onModalKeydown);

    els.btnExport.addEventListener('click', exportJson);
    els.importFile.addEventListener('change', onImportFile);
    els.btnMigrate.addEventListener('click', importLegacy);
    els.btnDiscardLegacy.addEventListener('click', discardLegacy);
    els.btnErase.addEventListener('click', eraseAllData);

    showView('city');
    renderAll();
  }

  init();
})();
