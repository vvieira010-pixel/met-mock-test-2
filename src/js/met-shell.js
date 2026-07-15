/* ============================================================
   met-shell.js — MET Digital Sample Test Shell Engine
   Handles: timer, navigation, answer selection, modals, sidebar
   ============================================================ */

(function () {
  'use strict';

  /* ── Constants ── */
  const AUDIO_PLAY_DELAY_MS = 2000; // deliberate pause before playback starts (UX breathing room)
  const GLOBAL_TIMER_STORAGE_KEY = 'met:global-exam-timer:v1';
  const DEFAULT_GLOBAL_SECONDS = 155 * 60;
  const STUDENT_EMAIL_KEY = 'met:student:email';

  /* ── State ── */
  const MET = {
    totalSeconds: 0,
    timerInterval: null,
    pages: [],
    currentPageIdx: 0,
    questionAnswered: {},
    listeningMode: false,
    hasBack: true,
    hasFinishSection: true,
    hasSidebar: false,
    speakingIntervals: {},
    finishingSection: false,
    timerStorageKey: GLOBAL_TIMER_STORAGE_KEY,
    useGlobalTimer: true,
    sectionId: '',
  };

  /* ─────────────────────────────────────────────
     PUBLIC API
  ───────────────────────────────────────────── */
  window.METShell = {

    init(opts = {}) {
      MET.useGlobalTimer   = opts.useGlobalTimer   ?? true;
      MET.timerStorageKey  = opts.timerStorageKey  ?? GLOBAL_TIMER_STORAGE_KEY;
      MET.totalSeconds     = opts.totalSeconds     ?? 0;
      MET.listeningMode    = opts.listeningMode    ?? false;
      MET.hasSidebar       = opts.hasSidebar       ?? false;
      MET.hasBack          = opts.hasBack          ?? !opts.listeningMode;
      MET.hasFinishSection = opts.hasFinishSection ?? true;
      MET.sectionId        = opts.sectionId        ?? _deriveSectionId(MET.timerStorageKey);
      MET.pages            = Array.from(document.querySelectorAll('[data-met-page]'));
      MET.currentPageIdx   = 0;

      // If this section was already completed, send the student back to the home page
      if (localStorage.getItem('met:done:' + MET.timerStorageKey) === '1') {
        window.location.replace('mock-home.html?locked=1');
        return;
      }

      _enforceServerSectionLock().then(isLocked => {
        if (isLocked) {
          try { localStorage.setItem('met:done:' + MET.timerStorageKey, '1'); } catch (_) {}
          window.location.replace('mock-home.html?locked=1');
          return;
        }
        _boot(opts);
      }).catch(() => {
        _boot(opts);
      });
    },

    /* Speaking countdown bar + label */
    startSpeakingTimer(seconds, barId, labelId) {
      const bar   = document.getElementById(barId);
      const label = labelId ? document.getElementById(labelId) : null;
      if (!bar) return;
      if (MET.speakingIntervals[barId]) {
        clearInterval(MET.speakingIntervals[barId]);
        delete MET.speakingIntervals[barId];
      }
      let remaining = seconds;
      bar.style.width = '100%';
      if (label) label.textContent = remaining + 's';

      const id = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
          clearInterval(id);
          bar.style.width = '0%';
          if (label) label.textContent = '0s';
          return;
        }
        bar.style.width = ((remaining / seconds) * 100) + '%';
        if (label) label.textContent = remaining + 's';
      }, 1000);
      MET.speakingIntervals[barId] = id;
    },

    startSpeakingPrepThenTimer(prepSeconds, speakSeconds, prepBarId, prepLabelId, speakBarId, speakLabelId, onSpeakStart) {
      // Clear speak bar interval — prep bar is owned and cleared by startSpeakingTimer below
      if (speakBarId && MET.speakingIntervals[speakBarId]) {
        clearInterval(MET.speakingIntervals[speakBarId]);
        delete MET.speakingIntervals[speakBarId];
      }
      // Clear any pending phase-switch timeout for this pair
      const timeoutKey = `timeout:${prepBarId}:${speakBarId}`;
      if (MET.speakingIntervals[timeoutKey]) {
        clearTimeout(MET.speakingIntervals[timeoutKey]);
        delete MET.speakingIntervals[timeoutKey];
      }

      // Prep phase
      this.startSpeakingTimer(prepSeconds, prepBarId, prepLabelId);
      const speakBar = document.getElementById(speakBarId);
      const speakLbl = speakLabelId ? document.getElementById(speakLabelId) : null;
      if (speakBar) speakBar.style.width = '0%';
      if (speakLbl) speakLbl.textContent = speakSeconds + 's';

      const startSpeak = () => {
        if (typeof onSpeakStart === 'function') onSpeakStart();
        this.startSpeakingTimer(speakSeconds, speakBarId, speakLabelId);
      };

      const timeoutId = setTimeout(startSpeak, Math.max(0, prepSeconds) * 1000);
      MET.speakingIntervals[timeoutKey] = timeoutId;
    },

    goToPage(idx) {
      _showLoadingThen(() => _showPage(idx));
    },

    startWaveform(canvasId) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      canvas.width  = canvas.offsetWidth  || 420;
      canvas.height = canvas.offsetHeight || 56;
      _drawWaveform(canvas.getContext('2d'), canvas.width, canvas.height);
    },
  };

  function _boot(opts) {
    _hydrateGlobalTimer(opts);
    _initTimer();
    _initNavButtons();
    _initFinishBtn();
    _initAnswerOptions();
    _initAriaRoles();
    _initBeforeUnload(opts.sectionLabel);
    _initSidebar();
    _initAudioPlayers();
    _initWordCounts();
    _initScrollToasts();
    _initModalButtons();
    _showPage(0);
  }

  /* ─────────────────────────────────────────────
     PAGE NAVIGATION
  ───────────────────────────────────────────── */
  function _showPage(idx) {
    if (idx < 0 || idx >= MET.pages.length) return;
    MET.pages.forEach((p, i) => p.style.display = (i === idx ? '' : 'none'));
    MET.currentPageIdx = idx;
    _updateTopBar();
    _updateNavButtons();
    _updateSidebar();
    _checkScrollToast();
    _pauseAllAudio();

    // stop any running speaking timers/timeouts
    Object.keys(MET.speakingIntervals).forEach(key => {
      const handle = MET.speakingIntervals[key];
      if (key.startsWith('timeout:')) clearTimeout(handle);
      else clearInterval(handle);
      delete MET.speakingIntervals[key];
    });

    // notify Speaking section (and any other listeners)
    document.dispatchEvent(new CustomEvent('METPageChanged', { detail: { pageIndex: idx } }));
  }

  function _goNext() {
    const page = MET.pages[MET.currentPageIdx];
    const isListeningQ = page && page.dataset.listeningQuestion === 'true';

    if (isListeningQ && !MET.questionAnswered[MET.currentPageIdx]) {
      _showProceedModal(() => _advanceNext());
      return;
    }
    _advanceNext();
  }

  function _advanceNext() {
    if (MET.currentPageIdx < MET.pages.length - 1) {
      _showLoadingThen(() => _showPage(MET.currentPageIdx + 1));
    } else {
      if (!MET.hasFinishSection) {
        const link = document.querySelector('[data-next-section]');
        if (link) { MET._navigatingSection = true; window.location.href = link.dataset.nextSection; return; }
      }
      _showFinishConfirm();
    }
  }

  function _goBack() {
    if (!MET.hasBack) return;
    if (MET.currentPageIdx > 0) {
      _showLoadingThen(() => _showPage(MET.currentPageIdx - 1));
    }
  }

  /* ─────────────────────────────────────────────
     TOP BAR
  ───────────────────────────────────────────── */
  function _updateTopBar() {
    const page = MET.pages[MET.currentPageIdx];
    if (!page) return;
    const pageLabel    = document.getElementById('met-page-label');
    const sectionLabel = document.getElementById('met-section-label');
    if (pageLabel)    pageLabel.textContent    = page.dataset.pageLabel    || '';
    if (sectionLabel) sectionLabel.textContent = page.dataset.sectionLabel || '';

    const answered = Object.keys(MET.questionAnswered).length;
    const total    = MET.pages.filter(p => p.dataset.isQuestion === 'true').length;
    const pct      = total ? Math.round((answered / total) * 100) : 0;
    const bar      = document.getElementById('met-progress-bar');
    const pctEl    = document.getElementById('met-progress-pct');
    if (bar)   bar.style.width = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';
    const outer = bar && bar.parentElement;
    if (outer && outer.hasAttribute('aria-valuenow')) outer.setAttribute('aria-valuenow', pct);
  }

  /* ─────────────────────────────────────────────
     NAV BUTTONS
  ───────────────────────────────────────────── */
  function _initNavButtons() {
    const nextBtn = document.getElementById('met-btn-next');
    const backBtn = document.getElementById('met-btn-back');
    if (nextBtn) nextBtn.addEventListener('click', _goNext);
    if (backBtn) backBtn.addEventListener('click', _goBack);
  }

  function _updateNavButtons() {
    const backBtn = document.getElementById('met-btn-back');
    if (backBtn) {
      const hide = !MET.hasBack || MET.currentPageIdx === 0;
      backBtn.style.visibility = hide ? 'hidden' : 'visible';
    }
  }

  /* ─────────────────────────────────────────────
     FINISH BUTTON
  ───────────────────────────────────────────── */
  function _initFinishBtn() {
    const btn = document.getElementById('met-btn-finish');
    if (btn) {
      if (!MET.hasFinishSection) btn.style.display = 'none';
      else btn.addEventListener('click', () => _showFinishConfirm());
    }
  }

  /* ─────────────────────────────────────────────
     ANSWER SELECTION
  ───────────────────────────────────────────── */
  function _initAnswerOptions() {
    document.addEventListener('click', e => {
      const opt = e.target.closest('.met-option');
      if (!opt) return;
      const group = opt.dataset.group;
      if (!group) {
        // fallback: deselect siblings inside same .met-options container
        const container = opt.closest('.met-options');
        if (container) container.querySelectorAll('.met-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
      } else {
        document.querySelectorAll(`.met-option[data-group="${group}"]`).forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
      }
      MET.questionAnswered[MET.currentPageIdx] = true;
      _updateTopBar();
      _updateSidebar();
      _persistAnswer(MET.currentPageIdx, opt.textContent.trim());
    });
  }

  function _persistAnswer(pageIdx, optionText) {
    try {
      const store = JSON.parse(localStorage.getItem('met:answers:v1') || '{}');
      store[MET.timerStorageKey + '__p' + pageIdx] = optionText;
      localStorage.setItem('met:answers:v1', JSON.stringify(store));
    } catch (_) {}
  }

  /* ─────────────────────────────────────────────
     SIDEBAR
  ───────────────────────────────────────────── */
  function _initSidebar() {
    if (!MET.hasSidebar) return;
    const sidebar = document.getElementById('met-sidebar');
    if (!sidebar) return;

    // Buttons with data-target="<data-met-page or pageIndex>"
    sidebar.querySelectorAll('[data-target]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        const byPageId = MET.pages.findIndex(page => page.dataset.metPage === target);
        const idx = byPageId >= 0 ? byPageId : parseInt(target, 10);
        if (!isNaN(idx)) _showLoadingThen(() => _showPage(idx));
      });
    });

    const upBtn   = document.getElementById('met-sidebar-up');
    const downBtn = document.getElementById('met-sidebar-down');
    const numWrap = document.getElementById('met-sidebar-numbers');
    if (!numWrap) return;

    let scrollOffset = 0;
    const ITEM_H = 34;
    const VISIBLE = 10;
    const allBtns = numWrap.querySelectorAll('[data-target]');

    function applyScroll() {
      const max = Math.max(0, allBtns.length - VISIBLE);
      scrollOffset = Math.max(0, Math.min(scrollOffset, max));
      numWrap.style.transform = `translateY(-${scrollOffset * ITEM_H}px)`;
    }
    if (upBtn)   upBtn.addEventListener('click',  () => { scrollOffset--; applyScroll(); });
    if (downBtn) downBtn.addEventListener('click', () => { scrollOffset++; applyScroll(); });
  }

  function _updateSidebar() {
    if (!MET.hasSidebar) return;
    document.querySelectorAll('[data-target]').forEach(btn => {
      const target = btn.dataset.target;
      const byPageId = MET.pages.findIndex(page => page.dataset.metPage === target);
      const targetIdx = byPageId >= 0 ? byPageId : parseInt(target, 10);
      btn.classList.remove('current', 'answered');
      if (targetIdx === MET.currentPageIdx) btn.classList.add('current');
      else if (MET.questionAnswered[targetIdx]) btn.classList.add('answered');
    });
  }

  /* ─────────────────────────────────────────────
     TIMER
  ───────────────────────────────────────────── */
  function _initTimer() {
    if (!MET.totalSeconds) return;
    if (MET.timerInterval) clearInterval(MET.timerInterval);
    _renderTimer();
    MET.timerInterval = setInterval(() => {
      if (MET.totalSeconds > 0) {
        MET.totalSeconds--;
        _persistGlobalTimer();
        _renderTimer();
      } else {
        clearInterval(MET.timerInterval);
        _persistGlobalTimer();
        document.dispatchEvent(new CustomEvent('METTimerEnded', { detail: { sectionLabel: MET.listeningMode ? 'Listening' : 'Section' } }));
      }
    }, 1000);
  }

  function _hydrateGlobalTimer(opts) {
    if (!MET.useGlobalTimer) return;
    const now = Date.now();
    const fallbackSeconds = opts.globalTotalSeconds ?? opts.totalSeconds ?? DEFAULT_GLOBAL_SECONDS;
    let snapshot = null;

    try {
      snapshot = JSON.parse(localStorage.getItem(MET.timerStorageKey) || 'null');
    } catch (_) {
      snapshot = null;
    }

    // Fallback for file:// navigation where localStorage can be unreliable
    if (!snapshot) {
      try {
        const carrier = JSON.parse(window.name || '{}');
        snapshot = carrier && carrier.__metTimerStore ? carrier.__metTimerStore[MET.timerStorageKey] || null : null;
      } catch (_) {
        snapshot = null;
      }
    }

    if (snapshot && snapshot.startedAt && Number.isFinite(snapshot.remainingSeconds)
        && snapshot.remainingSeconds > 0) {
      const elapsed = Math.max(0, Math.floor((now - snapshot.startedAt) / 1000));
      MET.totalSeconds = Math.max(0, snapshot.remainingSeconds - elapsed);
    } else {
      MET.totalSeconds = Math.max(0, fallbackSeconds);
      _persistGlobalTimer();
    }
  }

  function _persistGlobalTimer() {
    if (!MET.useGlobalTimer) return;
    const payload = {
      remainingSeconds: MET.totalSeconds,
      startedAt: Date.now()
    };
    try {
      localStorage.setItem(MET.timerStorageKey, JSON.stringify(payload));
    } catch (_) {}

    // Fallback for file:// navigation where localStorage can be unreliable
    try {
      const carrier = JSON.parse(window.name || '{}');
      carrier.__metTimerStore = carrier.__metTimerStore || {};
      carrier.__metTimerStore[MET.timerStorageKey] = payload;
      window.name = JSON.stringify(carrier);
    } catch (_) {}
  }

  function _renderTimer() {
    const el = document.getElementById('met-timer');
    if (!el) return;
    const h = Math.floor(MET.totalSeconds / 3600);
    const m = Math.floor((MET.totalSeconds % 3600) / 60);
    const s = MET.totalSeconds % 60;
    el.textContent = (h > 0 ? String(h).padStart(2,'0') + ':' : '00:') +
                     String(m).padStart(2,'0') + ':' +
                     String(s).padStart(2,'0');
  }

  /* ─────────────────────────────────────────────
     AUDIO PLAYERS
  ───────────────────────────────────────────── */
  function _initAudioPlayers() {
    document.querySelectorAll('.met-audio-player').forEach(player => {
      const audio     = player.querySelector('audio');
      const playBtn   = player.querySelector('.met-audio-btn');
      const volSlider = player.querySelector('.met-audio-volume');

      if (!audio) return;

      if (playBtn) {
        playBtn.addEventListener('click', () => {
          if (playBtn.dataset.started) return;
          playBtn.dataset.started = '1';
          playBtn.textContent = '…';
          playBtn.disabled = true;
          setTimeout(() => {
            audio.play().catch(() => {});
            playBtn.textContent = 'Playing';
          }, AUDIO_PLAY_DELAY_MS);
        });
        audio.addEventListener('ended', () => {
          playBtn.textContent = 'Play';
          playBtn.disabled = false;
          delete playBtn.dataset.started;
        });
      }

      if (volSlider) {
        volSlider.addEventListener('input', () => { audio.volume = parseFloat(volSlider.value); });
      }
    });
  }

  function _pauseAllAudio() {
    document.querySelectorAll('audio').forEach(a => {
      a.pause();
      const player = a.closest('.met-audio-player');
      if (!player) return;
      const btn = player.querySelector('.met-audio-btn');
      if (btn) {
        btn.textContent = 'Play';
        btn.disabled = false;
        delete btn.dataset.started;
      }
    });
  }

  /* ─────────────────────────────────────────────
     WORD COUNT
  ───────────────────────────────────────────── */
  function _initWordCounts() {
    document.querySelectorAll('textarea[data-word-count-target]').forEach(ta => {
      const targetId = ta.dataset.wordCountTarget;
      const span = targetId ? document.getElementById(targetId) : null;
      if (!span) return;
      ta.addEventListener('input', () => {
        const words = ta.value.trim() === '' ? 0 : ta.value.trim().split(/\s+/).length;
        span.textContent = words;
        if (words > 0) {
          MET.questionAnswered[MET.currentPageIdx] = true;
          _updateTopBar();
          _updateSidebar();
          _persistAnswer(MET.currentPageIdx, ta.value.trim());
        }
      });
    });
  }

  /* ─────────────────────────────────────────────
     SCROLL TOASTS
  ───────────────────────────────────────────── */
  function _initScrollToasts() {
    const closeBtn = document.getElementById('met-scroll-toast-close');
    if (closeBtn) closeBtn.addEventListener('click', () => {
      const toast = document.getElementById('met-scroll-toast');
      if (toast) toast.style.display = 'none';
    });
  }

  function _checkScrollToast() {
    const toast = document.getElementById('met-scroll-toast');
    if (!toast) return;
    toast.style.display = 'none';
    const wrap = document.querySelector('.met-content-wrap');
    if (!wrap) return;
    setTimeout(() => {
      if (wrap.scrollHeight > wrap.clientHeight + 20) {
        toast.style.display = '';
      }
      wrap.scrollTop = 0;
    }, 150);
  }

  /* ─────────────────────────────────────────────
     ARIA ROLES
  ───────────────────────────────────────────── */
  function _initAriaRoles() {
    const contentWrap = document.querySelector('.met-content-wrap');
    if (contentWrap && !contentWrap.getAttribute('role')) {
      contentWrap.setAttribute('role', 'main');
    }
    const progressBar = document.getElementById('met-progress-bar');
    if (progressBar) {
      const outer = progressBar.parentElement;
      if (outer) {
        outer.setAttribute('role', 'progressbar');
        outer.setAttribute('aria-valuemin', '0');
        outer.setAttribute('aria-valuemax', '100');
        outer.setAttribute('aria-valuenow', '0');
        outer.setAttribute('aria-label', 'Section progress');
      }
    }
    const topBar = document.querySelector('.met-top-bar');
    if (topBar && !topBar.getAttribute('role')) {
      topBar.setAttribute('role', 'banner');
    }
    const bottomBar = document.querySelector('.met-bottom-bar');
    if (bottomBar) {
      bottomBar.setAttribute('role', 'navigation');
      bottomBar.setAttribute('aria-label', 'Question navigation');
    }
  }

  /* ─────────────────────────────────────────────
     BEFORE UNLOAD
  ───────────────────────────────────────────── */
  function _initBeforeUnload(sectionLabel) {
    window.addEventListener('beforeunload', function(e) {
      if (MET._navigatingSection) return;
      if (MET.totalSeconds > 0 && Object.keys(MET.questionAnswered).length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  /* ─────────────────────────────────────────────
     MODALS — wire up by ID
  ───────────────────────────────────────────── */
  function _initModalButtons() {
    // Proceed modal (unanswered listening question)
    _bindId('met-proceed-no',  () => _hideModal('met-modal-proceed'));
    _bindId('met-proceed-yes', () => { _hideModal('met-modal-proceed'); _advanceNext(); });

    // Finish confirm step 1
    _bindId('met-finish1-no',  () => _hideModal('met-modal-finish1'));
    _bindId('met-finish1-yes', () => { _hideModal('met-modal-finish1'); _showFinishConfirm2(); });

    // Finish confirm step 2
    _bindId('met-finish2-ok',  () => { _hideModal('met-modal-finish2'); _doFinishSection(); });
  }

  function _bindId(id, fn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  }

  let _focusOrigin = null;

  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  function _trapFocus(modal) {
    const focusable = Array.from(modal.querySelectorAll(FOCUSABLE));
    if (!focusable.length) return;
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    first.focus();
    modal._trapHandler = function(e) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    };
    modal.addEventListener('keydown', modal._trapHandler);
  }

  function _releaseTrap(modal) {
    if (modal._trapHandler) {
      modal.removeEventListener('keydown', modal._trapHandler);
      delete modal._trapHandler;
    }
  }

  function _hideModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    _releaseTrap(el);
    el.classList.remove('active');
    el.removeAttribute('aria-modal');
    el.removeAttribute('role');
    if (_focusOrigin) { _focusOrigin.focus(); _focusOrigin = null; }
  }

  function _showModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    _focusOrigin = document.activeElement;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.classList.add('active');
    _trapFocus(el);
  }

  function _showLoadingThen(cb) {
    _showModal('met-modal-loading');
    setTimeout(() => { _hideModal('met-modal-loading'); cb(); }, 500);
  }

  function _showProceedModal(onYes) {
    // onYes is used via the button wire-up in _initModalButtons,
    // so we store it temporarily and the button handler calls _advanceNext directly.
    // This simpler approach just shows the modal; Yes is already wired to _advanceNext.
    _showModal('met-modal-proceed');
  }

  function _showFinishConfirm() {
    if (!MET.hasFinishSection) return;
    const answered = Object.keys(MET.questionAnswered).length;
    const total    = MET.pages.filter(p => p.dataset.isQuestion === 'true').length;
    if (answered < total) {
      _showModal('met-modal-finish1');
    } else {
      _showFinishConfirm2();
    }
  }

  function _showFinishConfirm2() {
    _showModal('met-modal-finish2');
  }

  function _doFinishSection() {
    const link = document.querySelector('[data-next-section]');
    const dest = link ? link.dataset.nextSection : 'mock-home.html';
    // Mark this section as completed when returning to home (last part of section)
    if (dest === 'mock-home.html') {
      try { localStorage.setItem('met:done:' + MET.timerStorageKey, '1'); } catch (_) {}
      _persistSectionLockServer();
    }
    MET._navigatingSection = true;
    window.location.href = dest;
  }

  function _deriveSectionId(timerStorageKey) {
    if (!timerStorageKey) return '';
    const key = String(timerStorageKey).toLowerCase();
    if (key.includes('reading')) return 'reading';
    if (key.includes('listening')) return 'listening';
    if (key.includes('speaking')) return 'speaking';
    if (key.includes('writing')) return 'writing';
    return '';
  }

  function _getStudentEmail() {
    try {
      return (localStorage.getItem(STUDENT_EMAIL_KEY) || '').trim().toLowerCase();
    } catch (_) {
      return '';
    }
  }

  async function _enforceServerSectionLock() {
    const studentEmail = _getStudentEmail();
    if (!studentEmail || !MET.sectionId) return false;
    const qs = new URLSearchParams({ studentEmail: studentEmail }).toString();
    const res = await fetch('/api/section-locks?' + qs, { method: 'GET' });
    if (!res.ok) return false;
    const payload = await res.json();
    const locked = Array.isArray(payload?.lockedSections) && payload.lockedSections.includes(MET.sectionId);
    return !!locked;
  }

  function _persistSectionLockServer() {
    const studentEmail = _getStudentEmail();
    if (!studentEmail || !MET.sectionId) return;
    fetch('/api/section-locks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentEmail: studentEmail, sectionId: MET.sectionId }),
      keepalive: true
    }).catch(() => {});
  }

  /* ─────────────────────────────────────────────
     WAVEFORM ANIMATION
  ───────────────────────────────────────────── */
  function _drawWaveform(ctx, w, h) {
    let t = 0;
    let running = true;
    function frame() {
      if (!running) return;
      ctx.fillStyle = '#1a3a6e';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(0,220,255,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const y = h / 2 +
          Math.sin((x + t) * 0.05) * 9 +
          Math.sin((x + t) * 0.13) * 4 +
          Math.sin((x + t) * 0.03) * 6;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      t += 2;
      requestAnimationFrame(frame);
    }
    frame();
    return () => { running = false; };
  }

})();
