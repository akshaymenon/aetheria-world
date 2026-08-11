(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // Constants
  // --------------------------------------------------------------------------
  const STORAGE_KEY = 'habitLoopStudy_v1';
  const CONDITIONS = ['city', 'garden', 'clear'];
  const CONDITION_LABELS = {
    city: 'City of Habits',
    garden: 'Garden of Habits',
    clear: 'Clear Day'
  };
  const RATING_LABELS = {
    1: 'Strongly disagree',
    2: 'Disagree',
    3: 'Slightly disagree',
    4: 'Neutral',
    5: 'Slightly agree',
    6: 'Agree',
    7: 'Strongly agree'
  };

  // --------------------------------------------------------------------------
  // State
  // --------------------------------------------------------------------------
  let state = loadState();

  // --------------------------------------------------------------------------
  // DOM refs
  // --------------------------------------------------------------------------
  const screens = {
    consent: document.getElementById('screen-consent'),
    setup: document.getElementById('screen-setup'),
    tracker: document.getElementById('screen-tracker')
  };

  const els = {
    consentCheck: document.getElementById('consent-check'),
    startBtn: document.getElementById('start-btn'),
    conditionRadios: document.querySelectorAll('input[name="condition"]'),
    setupForm: document.getElementById('setup-form'),
    habitAction: document.getElementById('habit-action'),
    habitCue: document.getElementById('habit-cue'),
    habitMinimum: document.getElementById('habit-minimum'),
    conditionBadge: document.getElementById('condition-badge'),
    habitStatement: document.getElementById('habit-statement'),
    todayDate: document.getElementById('today-date'),
    todayStatus: document.getElementById('today-status'),
    btnDone: document.getElementById('btn-done'),
    btnSkip: document.getElementById('btn-skip'),
    btnUndo: document.getElementById('btn-undo'),
    historyList: document.getElementById('history-list'),
    visualWrapper: document.getElementById('visual-wrapper'),
    visualCaption: document.getElementById('visual-caption'),
    feedbackForm: document.getElementById('feedback-form'),
    feedbackConfirmation: document.getElementById('feedback-confirmation'),
    btnExport: document.getElementById('btn-export'),
    btnReset: document.getElementById('btn-reset')
  };

  const ratingInputs = {
    useful: document.getElementById('rating-useful'),
    calm: document.getElementById('rating-calm'),
    clarity: document.getElementById('rating-clarity'),
    pressure: document.getElementById('rating-pressure'),
    disappointed: document.getElementById('rating-disappointed')
  };

  // --------------------------------------------------------------------------
  // Storage helpers
  // --------------------------------------------------------------------------
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return makeDefaultState();
      const parsed = JSON.parse(raw);
      return { ...makeDefaultState(), ...parsed };
    } catch (e) {
      console.error('Failed to load state', e);
      return makeDefaultState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save state', e);
    }
  }

  function makeDefaultState() {
    return {
      consented: false,
      condition: null,
      habit: null,
      history: {},
      feedback: [],
      events: []
    };
  }

  function clearAllData() {
    if (window.confirm('Clear all local data? This cannot be undone.')) {
      localStorage.removeItem(STORAGE_KEY);
      state = makeDefaultState();
      logEvent('data_cleared', { timestamp: isoNow() });
      route();
    }
  }

  // --------------------------------------------------------------------------
  // Event log
  // --------------------------------------------------------------------------
  function logEvent(type, payload = {}) {
    const entry = {
      type,
      timestamp: isoNow(),
      condition: state.condition,
      payload
    };
    state.events.push(entry);
    saveState();
  }

  function isoNow() {
    return new Date().toISOString();
  }

  function todayKey() {
    // Habit opportunities are local-calendar days, never UTC days.
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60 * 1000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
  }

  // --------------------------------------------------------------------------
  // Routing
  // --------------------------------------------------------------------------
  function route() {
    Object.values(screens).forEach(s => s.classList.add('is-hidden'));

    if (!state.consented) {
      screens.consent.classList.remove('is-hidden');
      return;
    }

    if (!state.habit) {
      screens.setup.classList.remove('is-hidden');
      return;
    }

    screens.tracker.classList.remove('is-hidden');
    renderTracker();
  }

  // --------------------------------------------------------------------------
  // Consent / assignment
  // --------------------------------------------------------------------------
  function pickCondition() {
    const url = new URL(window.location.href);
    const override = url.searchParams.get('condition');
    if (override && CONDITIONS.includes(override)) {
      return override;
    }

    const selectedRadio = document.querySelector('input[name="condition"]:checked');
    if (selectedRadio && selectedRadio.value !== 'random') {
      return selectedRadio.value;
    }

    return CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)];
  }

  function onConsentToggle() {
    els.startBtn.disabled = !els.consentCheck.checked;
  }

  function onStart() {
    if (!els.consentCheck.checked) return;
    state.consented = true;
    state.condition = pickCondition();
    logEvent('consent_given', { condition: state.condition, assignment: 'random_or_override' });
    saveState();
    route();
  }

  // --------------------------------------------------------------------------
  // Setup
  // --------------------------------------------------------------------------
  function onSetupSubmit(e) {
    e.preventDefault();
    const action = els.habitAction.value.trim();
    const cue = els.habitCue.value.trim();
    const minimum = els.habitMinimum.value.trim();

    if (!action || !cue || !minimum) return;

    state.habit = { action, cue, minimum, createdAt: isoNow() };
    logEvent('habit_created', { action, cue, minimum });
    saveState();
    route();
  }

  // --------------------------------------------------------------------------
  // Tracker actions
  // --------------------------------------------------------------------------
  function recordToday(action) {
    const date = todayKey();
    const previous = state.history[date] || null;
    state.history[date] = { action, recordedAt: isoNow() };
    logEvent('daily_action_recorded', { date, action, previous });
    saveState();
    renderTracker();
  }

  function undoToday() {
    const date = todayKey();
    const previous = state.history[date] || null;
    if (previous) {
      delete state.history[date];
      logEvent('daily_action_undone', { date, previous });
      saveState();
      renderTracker();
    }
  }

  function doneCount() {
    return Object.values(state.history).filter(h => h.action === 'done').length;
  }

  // --------------------------------------------------------------------------
  // Rendering
  // --------------------------------------------------------------------------
  function renderTracker() {
    if (!state.habit) return;

    els.conditionBadge.textContent = CONDITION_LABELS[state.condition];
    els.conditionBadge.className = 'condition-badge ' + state.condition;

    els.habitStatement.innerHTML = `I will <strong>${escapeHtml(state.habit.action)}</strong> after <strong>${escapeHtml(state.habit.cue)}</strong>, at least <strong>${escapeHtml(state.habit.minimum)}</strong>.`;

    const date = new Date();
    els.todayDate.textContent = date.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const today = state.history[todayKey()];
    renderTodayStatus(today);
    renderHistory();
    renderVisual();
  }

  function renderTodayStatus(today) {
    els.todayStatus.classList.remove('done', 'skip');
    els.btnUndo.disabled = true;

    if (!today) {
      els.todayStatus.textContent = 'No action recorded yet.';
      return;
    }

    els.btnUndo.disabled = false;
    if (today.action === 'done') {
      els.todayStatus.textContent = 'Today: done ✓';
      els.todayStatus.classList.add('done');
    } else if (today.action === 'skip') {
      els.todayStatus.textContent = 'Today: not today';
      els.todayStatus.classList.add('skip');
    }
  }

  function renderHistory() {
    const entries = Object.entries(state.history)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 14);

    els.historyList.innerHTML = '';
    if (entries.length === 0) {
      const li = document.createElement('li');
      li.className = 'history-item';
      li.textContent = 'No history yet.';
      els.historyList.appendChild(li);
      return;
    }

    entries.forEach(([date, record]) => {
      const li = document.createElement('li');
      li.className = 'history-item';
      const label = record.action === 'done' ? 'Done' : 'Not today';
      const displayDate = new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      });
      li.innerHTML = `<span class="history-date">${escapeHtml(displayDate)}</span><span class="history-action ${record.action}">${escapeHtml(label)}</span>`;
      els.historyList.appendChild(li);
    });
  }

  function renderVisual() {
    const count = doneCount();
    els.visualWrapper.innerHTML = '';

    if (state.condition === 'city') {
      renderCity(count);
    } else if (state.condition === 'garden') {
      renderGarden(count);
    } else {
      renderClear(count);
    }
  }

  // --------------------------------------------------------------------------
  // Visual: City of Habits
  // --------------------------------------------------------------------------
  function renderCity(count) {
    const svg = createSvgBase();
    const maxLayers = 12;
    const layers = Math.min(count, maxLayers);

    // Sky gradient handled in CSS, draw ground and buildings
    const ground = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    ground.setAttribute('x', '0');
    ground.setAttribute('y', '260');
    ground.setAttribute('width', '400');
    ground.setAttribute('height', '40');
    ground.setAttribute('fill', '#d8c8b8');
    svg.appendChild(ground);

    // Deterministic building layers
    const palette = ['#a8b8c8', '#c8b8a8', '#9cb0a0', '#d4c4b0', '#b8c8d8', '#c4b8a4'];
    for (let i = 0; i < layers; i++) {
      const x = 30 + i * 28;
      const h = 40 + (i % 5) * 24;
      const w = 22 + (i % 3) * 6;
      const y = 260 - h;
      const color = palette[i % palette.length];

      const b = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      b.setAttribute('x', x);
      b.setAttribute('y', y);
      b.setAttribute('width', w);
      b.setAttribute('height', h);
      b.setAttribute('fill', color);
      b.setAttribute('rx', 2);
      svg.appendChild(b);

      // Windows
      for (let wy = y + 8; wy < 250; wy += 14) {
        const win = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        win.setAttribute('x', x + 4);
        win.setAttribute('y', wy);
        win.setAttribute('width', w - 8);
        win.setAttribute('height', 8);
        win.setAttribute('fill', '#f7f4ef');
        win.setAttribute('opacity', '0.7');
        svg.appendChild(win);
      }

      // Roof detail
      if (i % 2 === 0) {
        const roof = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        roof.setAttribute('d', `M${x - 2},${y} L${x + w / 2},${y - 10} L${x + w + 2},${y} Z`);
        roof.setAttribute('fill', '#8a7a6a');
        svg.appendChild(roof);
      }
    }

    // Sun / moon
    const sun = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    sun.setAttribute('cx', 340);
    sun.setAttribute('cy', 50);
    sun.setAttribute('r', 18 + Math.min(count, 8));
    sun.setAttribute('fill', '#e8c97c');
    sun.setAttribute('opacity', '0.85');
    svg.appendChild(sun);

    els.visualCaption.textContent = layers === 0
      ? 'Your calm city waits for the first brick.'
      : `Your city has ${count} permanent building${count === 1 ? '' : 's'}.`;
  }

  // --------------------------------------------------------------------------
  // Visual: Garden of Habits
  // --------------------------------------------------------------------------
  function renderGarden(count) {
    const svg = createSvgBase();
    const maxPlants = 12;
    const plants = Math.min(count, maxPlants);

    // Ground
    const ground = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    ground.setAttribute('x', '0');
    ground.setAttribute('y', '270');
    ground.setAttribute('width', '400');
    ground.setAttribute('height', '30');
    ground.setAttribute('fill', '#c8d8c0');
    svg.appendChild(ground);

    const flowerColors = ['#d88c8c', '#e8c97c', '#9cb0d8', '#c8a2c8', '#f0b080', '#a8d0a8'];

    for (let i = 0; i < plants; i++) {
      const x = 35 + i * 30;
      const stemH = 50 + (i % 4) * 18;
      const y = 270 - stemH;

      // Stem
      const stem = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      stem.setAttribute('x1', x);
      stem.setAttribute('y1', 270);
      stem.setAttribute('x2', x);
      stem.setAttribute('y2', y);
      stem.setAttribute('stroke', '#7c9a6c');
      stem.setAttribute('stroke-width', '4');
      svg.appendChild(stem);

      // Leaves
      const leafL = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      leafL.setAttribute('cx', x - 8);
      leafL.setAttribute('cy', y + stemH / 2);
      leafL.setAttribute('rx', 8);
      leafL.setAttribute('ry', 4);
      leafL.setAttribute('fill', '#8caf7c');
      leafL.setAttribute('transform', `rotate(-30, ${x - 8}, ${y + stemH / 2})`);
      svg.appendChild(leafL);

      const leafR = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      leafR.setAttribute('cx', x + 8);
      leafR.setAttribute('cy', y + stemH / 2 + 8);
      leafR.setAttribute('rx', 8);
      leafR.setAttribute('ry', 4);
      leafR.setAttribute('fill', '#8caf7c');
      leafR.setAttribute('transform', `rotate(30, ${x + 8}, ${y + stemH / 2 + 8})`);
      svg.appendChild(leafR);

      // Flower head
      const color = flowerColors[i % flowerColors.length];
      for (let p = 0; p < 5; p++) {
        const angle = (p * 72 * Math.PI) / 180;
        const px = x + Math.cos(angle) * 10;
        const py = y + Math.sin(angle) * 10;
        const petal = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        petal.setAttribute('cx', px);
        petal.setAttribute('cy', py);
        petal.setAttribute('r', 6);
        petal.setAttribute('fill', color);
        svg.appendChild(petal);
      }
      const center = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      center.setAttribute('cx', x);
      center.setAttribute('cy', y);
      center.setAttribute('r', 5);
      center.setAttribute('fill', '#f7eaa8');
      svg.appendChild(center);
    }

    // Clouds
    for (let c = 0; c < 2; c++) {
      const cx = 60 + c * 240;
      const cy = 55 + c * 15;
      const cloud = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      cloud.setAttribute('cx', cx);
      cloud.setAttribute('cy', cy);
      cloud.setAttribute('rx', 28);
      cloud.setAttribute('ry', 14);
      cloud.setAttribute('fill', '#ffffff');
      cloud.setAttribute('opacity', '0.8');
      svg.appendChild(cloud);
    }

    els.visualCaption.textContent = plants === 0
      ? 'Your garden is ready for its first seed.'
      : `Your garden has ${count} permanent plant${count === 1 ? '' : 's'}.`;
  }

  // --------------------------------------------------------------------------
  // Visual: Clear Day (plain tracker control)
  // --------------------------------------------------------------------------
  function renderClear(count) {
    const svg = createSvgBase();

    const total = 14;
    const cols = 7;
    const size = 28;
    const gap = 16;
    const startX = (400 - (cols * size + (cols - 1) * gap)) / 2 + size / 2;
    const startY = 80;

    for (let i = 0; i < total; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * (size + gap);
      const cy = startY + row * (size + gap);
      const filled = i < count;

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', cx);
      circle.setAttribute('cy', cy);
      circle.setAttribute('r', size / 2);
      circle.setAttribute('fill', filled ? 'var(--color-done)' : 'transparent');
      circle.setAttribute('stroke', filled ? 'var(--color-done)' : 'var(--color-border)');
      circle.setAttribute('stroke-width', '2');
      svg.appendChild(circle);

      if (filled) {
        const check = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        check.setAttribute('d', `M${cx - 7},${cy} L${cx - 2},${cy + 6} L${cx + 8},${cy - 6}`);
        check.setAttribute('stroke', '#ffffff');
        check.setAttribute('stroke-width', '3');
        check.setAttribute('fill', 'none');
        check.setAttribute('stroke-linecap', 'round');
        check.setAttribute('stroke-linejoin', 'round');
        svg.appendChild(check);
      }
    }

    els.visualCaption.textContent = count === 0
      ? 'Plain tracker: no completed days yet.'
      : `Plain tracker: ${count} day${count === 1 ? '' : 's'} marked done.`;
  }

  function createSvgBase() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 400 300');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', CONDITION_LABELS[state.condition] + ' visualization');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    return svg;
  }

  // --------------------------------------------------------------------------
  // Feedback
  // --------------------------------------------------------------------------
  function updateRatingHint(key) {
    const input = ratingInputs[key];
    const hint = document.getElementById('rating-' + key + '-hint');
    if (hint) {
      hint.textContent = RATING_LABELS[input.value] || 'Neutral';
    }
  }

  function onFeedbackSubmit(e) {
    e.preventDefault();
    const entry = {
      timestamp: isoNow(),
      useful: parseInt(ratingInputs.useful.value, 10),
      calm: parseInt(ratingInputs.calm.value, 10),
      clarity: parseInt(ratingInputs.clarity.value, 10),
      pressure: parseInt(ratingInputs.pressure.value, 10),
      disappointed: parseInt(ratingInputs.disappointed.value, 10)
    };
    state.feedback.push(entry);
    logEvent('feedback_submitted', entry);
    saveState();

    els.feedbackConfirmation.classList.remove('is-hidden');
    setTimeout(() => els.feedbackConfirmation.classList.add('is-hidden'), 3000);

    // Reset sliders to neutral
    Object.values(ratingInputs).forEach(input => {
      input.value = 4;
      updateRatingHint(input.id.replace('rating-', ''));
    });
  }

  // --------------------------------------------------------------------------
  // Export
  // --------------------------------------------------------------------------
  function exportJson() {
    // Research export deliberately strips free-text habit content. The local
    // browser state retains it only so the participant can use the prototype.
    const sanitisedEvents = state.events.map(({ type, timestamp, condition, payload }) => ({
      type,
      timestamp,
      condition,
      payload: type === 'habit_created'
        ? { habitCreated: true }
        : payload
    }));
    const payload = {
      exportedAt: isoNow(),
      condition: state.condition,
      history: state.history,
      feedback: state.feedback,
      events: sanitisedEvents
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habit-loop-${state.condition || 'study'}-${todayKey()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    logEvent('data_exported', { eventCount: state.events.length, feedbackCount: state.feedback.length });
    saveState();
  }

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // --------------------------------------------------------------------------
  // Init
  // --------------------------------------------------------------------------
  function init() {
    // Consent screen
    els.consentCheck.checked = false;
    els.startBtn.disabled = true;
    els.consentCheck.addEventListener('change', onConsentToggle);
    els.startBtn.addEventListener('click', onStart);

    // Setup screen
    els.setupForm.addEventListener('submit', onSetupSubmit);

    // Tracker actions
    els.btnDone.addEventListener('click', () => recordToday('done'));
    els.btnSkip.addEventListener('click', () => recordToday('skip'));
    els.btnUndo.addEventListener('click', undoToday);

    // Feedback
    Object.keys(ratingInputs).forEach(key => {
      updateRatingHint(key);
      ratingInputs[key].addEventListener('input', () => updateRatingHint(key));
    });
    els.feedbackForm.addEventListener('submit', onFeedbackSubmit);

    // Researcher tools
    els.btnExport.addEventListener('click', exportJson);
    els.btnReset.addEventListener('click', clearAllData);

    // Keyboard shortcut: Ctrl/Cmd + Shift + E to export
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        exportJson();
      }
    });

    // Apply query-param override to radios so researchers can see selection
    const url = new URL(window.location.href);
    const override = url.searchParams.get('condition');
    if (override && CONDITIONS.includes(override)) {
      const radio = document.querySelector(`input[name="condition"][value="${override}"]`);
      if (radio) radio.checked = true;
    }

    route();
  }

  init();
})();
