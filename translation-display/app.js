(function() {
  'use strict';

  var CONFIG = {
    appName: 'Translation Display',
    storageKey: 'translation_display',
    apiBase: null,
    token: null,
    autoScrollEnabled: true,
    scrollSpeed: 'normal',
    maxMessages: 50,
  };

  if (typeof TRANSLATION_CONFIG !== 'undefined') {
    CONFIG.apiBase = TRANSLATION_CONFIG.apiBase || window.location.origin;
    CONFIG.token = TRANSLATION_CONFIG.token;
    CONFIG.autoScrollEnabled = TRANSLATION_CONFIG.autoScroll !== false;
    CONFIG.scrollSpeed = TRANSLATION_CONFIG.scrollSpeed || 'normal';
  }

  var state = {
    currentScreen: 'home',
    screenHistory: [],
    isConnected: false,
    messages: [],
    pollTimer: null,
    lastTimestamp: 0,
    scrollSpeed: CONFIG.scrollSpeed,
    scrollSpeedMs: 2000,
  };

  var screens = {};
  var messagesListEl = null;

  function collectScreens() {
    document.querySelectorAll('.screen').forEach(function(s) {
      if (s.id) screens[s.id] = s;
    });
    messagesListEl = document.getElementById('messages-list');
  }

  function navigateTo(screenId, options) {
    options = options || {};
    if (options.addToHistory !== false && state.currentScreen) {
      state.screenHistory.push(state.currentScreen);
    }
    Object.values(screens).forEach(function(s) { s.classList.add('hidden'); });
    if (screens[screenId]) {
      screens[screenId].classList.remove('hidden');
      state.currentScreen = screenId;
      onScreenEnter(screenId);
      focusFirst(screens[screenId]);
    }
  }

  function navigateBack() {
    if (state.screenHistory.length > 0) {
      navigateTo(state.screenHistory.pop(), { addToHistory: false });
    }
  }

  function focusFirst(container) {
    var el = container.querySelector('.focusable:not([disabled]):not(.hidden)');
    if (el) el.focus();
  }

  function moveFocus(direction) {
    var container = screens[state.currentScreen];
    if (!container) return;
    var focusables = Array.from(container.querySelectorAll('.focusable:not([disabled]):not(.hidden)'));
    if (!focusables.length) return;
    var idx = focusables.indexOf(document.activeElement);
    if (idx === -1) { focusFirst(container); return; }
    var nextIdx = (direction === 'up' || direction === 'left')
      ? (idx > 0 ? idx - 1 : focusables.length - 1)
      : (idx < focusables.length - 1 ? idx + 1 : 0);
    focusables[nextIdx].focus();
    var scrollParent = focusables[nextIdx].closest('.content, .list-container');
    if (scrollParent) focusables[nextIdx].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  // ==================== POLLING ====================

  function startPolling() {
    if (!CONFIG.apiBase || !CONFIG.token) return;
    state.lastTimestamp = Date.now() - 5000;

    function poll() {
      var url = CONFIG.apiBase + '/api/messages?since=' + state.lastTimestamp +
        '&token=' + encodeURIComponent(CONFIG.token);

      fetch(url)
        .then(function(res) {
          if (res.status === 403) throw new Error('Forbidden');
          return res.json();
        })
        .then(function(data) {
          if (!state.isConnected) {
            state.isConnected = true;
            updateStatus('connected');
            showToast('Connected', 'success');
          }
          if (data.messages && data.messages.length > 0) {
            data.messages.forEach(function(msg) {
              if (msg.timestamp > state.lastTimestamp) state.lastTimestamp = msg.timestamp;
              addMessage(msg);
            });
          }
          state.pollTimer = setTimeout(poll, 2000);
        })
        .catch(function(err) {
          console.error('[Poll] Error:', err);
          state.isConnected = false;
          updateStatus('reconnecting');
          state.pollTimer = setTimeout(poll, 5000);
        });
    }

    poll();
  }

  // ==================== STATUS ====================

  function updateStatus(status) {
    var indicator = document.getElementById('status-indicator');
    if (!indicator) return;
    indicator.className = 'header-meta';
    switch (status) {
      case 'connected':
        indicator.textContent = 'Connected';
        indicator.classList.add('status-connected');
        break;
      case 'disconnected':
        indicator.textContent = 'Disconnected';
        indicator.classList.add('status-disconnected');
        break;
      case 'reconnecting':
        indicator.textContent = 'Reconnecting...';
        indicator.classList.add('status-reconnecting');
        break;
      default:
        indicator.textContent = status;
    }
  }

  // ==================== MESSAGES ====================

  function addMessage(data) {
    var msg = {
      id: data.id || (Date.now() + '-' + Math.random()),
      text: data.text || data.message || '',
      type: data.type || 'translation',
      timestamp: data.timestamp || Date.now(),
    };
    state.messages.push(msg);
    if (state.messages.length > CONFIG.maxMessages) state.messages.shift();
    renderMessages();
  }

  function clearMessages() {
    state.messages = [];
    state.lastTimestamp = Date.now();
    renderMessages();
    showToast('Messages cleared', 'success');
  }

  function renderMessages() {
    if (!messagesListEl) return;
    messagesListEl.innerHTML = '';
    if (state.messages.length === 0) {
      messagesListEl.innerHTML =
        '<div class="empty-state"><div class="empty-icon">&#8595;</div>' +
        '<div class="loading-text">Waiting for translations...</div></div>';
      return;
    }
    state.messages.forEach(function(msg, i) {
      messagesListEl.appendChild(createMessageCard(msg, i === state.messages.length - 1));
    });
    if (CONFIG.autoScrollEnabled) {
      messagesListEl.scrollTop = messagesListEl.scrollHeight;
    }
  }

  function createMessageCard(msg, isNew) {
    var div = document.createElement('div');
    div.className = 'message-card' + (isNew ? ' new-message' : '');
    div.setAttribute('tabindex', '0');
    div.setAttribute('data-action', 'view-message');
    div.setAttribute('data-msg-id', msg.id);
    div.innerHTML =
      '<div class="message-text">' + escapeHtml(msg.text) + '</div>' +
      '<div class="message-meta">' +
        '<span class="message-time">' + formatTime(msg.timestamp) + '</span>' +
        '<span class="message-type">' + getMessageType(msg.type) + '</span>' +
      '</div>';
    return div;
  }

  function formatTime(ts) {
    var d = new Date(ts);
    return [d.getHours(), d.getMinutes(), d.getSeconds()]
      .map(function(n) { return String(n).padStart(2, '0'); }).join(':');
  }

  function getMessageType(type) {
    return { translation: 'Translation', summary: 'Summary', fulltext: 'Full Text' }[type] || 'Message';
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ==================== TOAST ====================

  function showToast(message, type) {
    var toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'toast' + (type ? ' ' + type : '');
    toast.offsetHeight;
    toast.classList.add('visible');
    setTimeout(function() { toast.classList.remove('visible'); }, 2500);
  }

  // ==================== ACTIONS ====================

  function handleAction(action, element) {
    var speeds = ['fast', 'normal', 'slow'];
    var speedLabels = { fast: 'Fast', normal: 'Normal', slow: 'Slow' };
    var speedTimes = { fast: 500, normal: 2000, slow: 4000 };

    switch (action) {
      case 'back':
        navigateBack();
        break;
      case 'clear':
        clearMessages();
        break;
      case 'settings':
        navigateTo('settings');
        break;
      case 'toggle-scroll':
        CONFIG.autoScrollEnabled = !CONFIG.autoScrollEnabled;
        var scrollLabel = document.getElementById('scroll-mode-label');
        if (scrollLabel) scrollLabel.textContent = CONFIG.autoScrollEnabled ? 'Enabled' : 'Disabled';
        showToast('Auto-scroll ' + (CONFIG.autoScrollEnabled ? 'enabled' : 'disabled'), 'success');
        break;
      case 'toggle-speed':
        var idx = speeds.indexOf(state.scrollSpeed);
        state.scrollSpeed = speeds[(idx + 1) % speeds.length];
        state.scrollSpeedMs = speedTimes[state.scrollSpeed];
        var speedLabel = document.getElementById('speed-label');
        if (speedLabel) speedLabel.textContent = speedLabels[state.scrollSpeed];
        showToast('Scroll speed: ' + speedLabels[state.scrollSpeed], 'success');
        break;
    }
  }

  function onScreenEnter(screenId) {
    if (screenId === 'settings') {
      var urlEl = document.getElementById('server-url');
      if (urlEl) urlEl.textContent = CONFIG.apiBase || 'Not configured';
    }
  }

  function setupEvents() {
    document.addEventListener('click', function(e) {
      var el = e.target.closest('[data-action]');
      if (el) handleAction(el.dataset.action, el);
    });

    document.addEventListener('keydown', function(e) {
      var isInput = document.activeElement &&
        (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');
      if (isInput && !['Escape', 'Enter'].includes(e.key)) return;

      switch (e.key) {
        case 'ArrowUp':    moveFocus('up');    e.preventDefault(); break;
        case 'ArrowDown':  moveFocus('down');  e.preventDefault(); break;
        case 'ArrowLeft':  moveFocus('left');  e.preventDefault(); break;
        case 'ArrowRight': moveFocus('right'); e.preventDefault(); break;
        case 'Enter':
          if (!isInput && document.activeElement && document.activeElement.classList.contains('focusable')) {
            document.activeElement.click();
          }
          e.preventDefault();
          break;
        case 'Escape': navigateBack(); e.preventDefault(); break;
      }
    });
  }

  // ==================== TOKEN ====================

  function getTokenFromURL() {
    try { return new URLSearchParams(window.location.search).get('token'); } catch(e) { return null; }
  }

  function validateToken() {
    var token = getTokenFromURL();
    var valid = typeof TRANSLATION_CONFIG !== 'undefined' ? TRANSLATION_CONFIG.token : null;
    return token && token === valid;
  }

  function showAccessDenied() {
    Object.values(screens).forEach(function(s) { s.classList.add('hidden'); });
    if (screens['access-denied']) screens['access-denied'].classList.remove('hidden');
    startCountdownTimer();
  }

  function startCountdownTimer() {
    var remaining = 5;
    var el = document.getElementById('countdown-text');
    if (el) el.textContent = 'Retrying in ' + remaining + ' seconds...';
    var interval = setInterval(function() {
      remaining--;
      if (el) el.textContent = remaining > 0 ? 'Retrying in ' + remaining + ' seconds...' : 'Checking...';
      if (remaining <= 0) { clearInterval(interval); startCountdownTimer(); }
    }, 1000);
  }

  // ==================== STORAGE ====================

  function loadData() {
    try {
      var saved = localStorage.getItem(CONFIG.storageKey);
      if (saved) {
        var data = JSON.parse(saved);
        CONFIG.autoScrollEnabled = data.autoScrollEnabled !== undefined ? data.autoScrollEnabled : true;
        state.scrollSpeed = data.scrollSpeed || 'normal';
        state.scrollSpeedMs = data.scrollSpeedMs || 2000;
      }
    } catch(e) {}
  }

  // ==================== INIT ====================

  function init() {
    collectScreens();
    setupEvents();
    loadData();

    if (!validateToken()) { showAccessDenied(); return; }

    var scrollLabel = document.getElementById('scroll-mode-label');
    if (scrollLabel) scrollLabel.textContent = CONFIG.autoScrollEnabled ? 'Enabled' : 'Disabled';
    var speedLabels = { fast: 'Fast', normal: 'Normal', slow: 'Slow' };
    var speedLabel = document.getElementById('speed-label');
    if (speedLabel) speedLabel.textContent = speedLabels[state.scrollSpeed] || 'Normal';

    setTimeout(function() {
      navigateTo('home', { addToHistory: false });
      startPolling();
    }, 100);
  }

  // Browser console test helper
  window.sendTestMessage = function(text) {
    fetch('/api/message?token=' + encodeURIComponent(CONFIG.token), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text || 'Test message', type: 'translation' })
    }).then(function(r) { return r.json(); }).then(console.log).catch(console.error);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
