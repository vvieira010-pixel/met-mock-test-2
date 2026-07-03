/**
 * MET Mock Test Narrator Audio System
 *
 * Auto-plays narrator audio at section transitions.
 * Disables "Next" button until narrator audio finishes or timeout.
 *
 * SETUP:
 * 1. Add this script file to your HTML.
 * 2. Create narrator zones in your HTML (see examples below)
 * 3. Configure narrator URLs in initNarrator() call
 * 4. When transitioning, call playNarratorBeforeTransition(key, btnId)
 *
 * EXAMPLE HTML:
 * <div id="narrator-zone-to-reading" style="display:none">
 *   <audio id="narrator-audio-reading" preload="metadata"><\/audio>
 *   <div class="narrator-message">
 *     <p>Please listen to the next section introduction...</p>
 *   </div>
 * </div>
 * <button id="next-reading-btn" disabled>Next: Reading<\/button>
 */

(function() {
  window.narratorSystem = {
    /**
     * Initialize narrator system with audio URLs
     * @param {Object} config - { listening: url, reading: url, speaking: url, part2: url, part3: url }
     */
    init: function(config) {
      this.config = config || {};
      this.TIMEOUT = 5000; // 5s fallback
    },

    /**
     * Play narrator audio and disable button until complete
     * @param {string} key - Config key (listening, reading, speaking, part2, part3)
     * @param {string} btnId - Button element ID to unlock
     * @param {string} [audioElementId] - Audio element ID (default: narrator-audio-{key})
     */
    play: function(key, btnId, audioElementId) {
      audioElementId = audioElementId || 'narrator-audio-' + key;

      const audioEl = document.getElementById(audioElementId);
      const btnEl = document.getElementById(btnId);

      if (!audioEl || !btnEl) {
        console.warn(`[Narrator] Missing audio or button: ${audioElementId}, ${btnId}`);
        return;
      }

      // Lock button immediately
      btnEl.disabled = true;
      btnEl.style.opacity = '0.5';
      btnEl.style.cursor = 'not-allowed';

      const audioUrl = this.config[key] || '';

      // If no URL, just wait for timeout
      if (!audioUrl || audioUrl.trim() === '') {
        setTimeout(() => this._unlockButton(btnEl), this.TIMEOUT);
        return;
      }

      // Set up error/end handlers
      const onEnd = () => this._unlockButton(btnEl);
      const onError = () => {
        audioEl.removeEventListener('ended', onEnd);
        audioEl.removeEventListener('error', onError);
        setTimeout(() => this._unlockButton(btnEl), this.TIMEOUT);
      };

      audioEl.addEventListener('ended', onEnd, { once: true });
      audioEl.addEventListener('error', onError, { once: true });

      // Timeout safety
      setTimeout(() => {
        audioEl.removeEventListener('ended', onEnd);
        audioEl.removeEventListener('error', onError);
        this._unlockButton(btnEl);
      }, this.TIMEOUT);

      // Set source and auto-play
      audioEl.src = audioUrl;
      audioEl.play().catch((err) => {
        console.warn('[Narrator] Playback failed:', err);
        onError();
      });
    },

    /**
     * Stop any playing narrator audio
     * @param {string} [audioElementId]
     */
    stop: function(audioElementId) {
      audioElementId = audioElementId || 'narrator-audio-current';
      const audioEl = document.getElementById(audioElementId);
      if (audioEl) {
        audioEl.pause();
        audioEl.currentTime = 0;
      }
    },

    _unlockButton: function(btnEl) {
      if (!btnEl) return;
      btnEl.removeAttribute('disabled');
      btnEl.style.opacity = '1';
      btnEl.style.cursor = 'pointer';
    }
  };

  // Auto-init with empty config (override with your URLs)
  window.narratorSystem.init({});
})();
