var TTS = {
  currentAudio: null,
  apiKey: 'f8ad5c6837799e3c2b0a1f830f926c0c9cb81385',

  play: function(part, idx) {
    var self = this;
    return new Promise(function(resolve) {
      var src = self._getSrc(part, idx);
      if (!src) { resolve(); return; }

      var audio = new Audio(src);
      self.currentAudio = audio;

      audio.addEventListener('ended', function() {
        self.currentAudio = null;
        resolve();
      });

      audio.addEventListener('error', function() {
        console.warn('[TTS] Static file not found, attempting Deepgram dynamic TTS:', src);
        self.currentAudio = null;
        self._playDynamic(part, idx).then(resolve);
      });

      audio.play().catch(function(err) {
        console.warn('[TTS] Static playback failed, attempting Deepgram dynamic TTS:', err);
        self.currentAudio = null;
        self._playDynamic(part, idx).then(resolve);
      });

    });
  },

  _playDynamic: async function(part, idx) {
    var self = this;
    if (typeof LISTENING_DATA === 'undefined') {
      console.error('[TTS] LISTENING_DATA not found');
      return;
    }
    var data = LISTENING_DATA;
    var item = (part === 'p1') ? data.p1[idx] : (part === 'p2') ? data.p2[idx] : (part === 'p3') ? data.p3[idx] : null;
    if (!item || !item.lines) {
      console.error('[TTS] No lines found for dynamic playback:', part, idx);
      return;
    }

    var voiceMap = {
      'W': 'aura-2-asteria-en',
      'M': 'aura-2-orion-en',
      'T1': 'aura-2-luna-en',
      'T2': 'aura-2-luna-en',
      'T3': 'aura-2-luna-en',
      'N': 'aura-2-luna-en'
    };

    for (var i = 0; i < item.lines.length; i++) {
      var line = item.lines[i];
      var text = line.t;
      var voice = voiceMap[line.s] || 'aura-2-asteria-en';

      await new Promise(function(resolve) {
        fetch('https://api.deepgram.com/v1/speak?model=' + voice, {
          method: 'POST',
          headers: {
            'Authorization': 'Token ' + self.apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ text: text })
        })
        .then(function(response) {
          if (!response.ok) throw new Error('Deepgram API error: ' + response.status);
          return response.blob();
        })
        .then(function(blob) {
          var url = URL.createObjectURL(blob);
          var audio = new Audio(url);
          self.currentAudio = audio;
          audio.addEventListener('ended', function() {
            self.currentAudio = null;
            URL.revokeObjectURL(url);
            resolve();
          });
          audio.play().catch(function(err) {
            console.error('[TTS] Dynamic playback failed:', err);
            self.currentAudio = null;
            resolve();
          });
        })
        .catch(function(err) {
          console.error('[TTS] Deepgram request failed:', err);
          resolve();
        });
      });
    }
  },

  stop: function() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
  },

  _getSrc: function(part, idx) {
    var base = '/assets/audio/listening/';
    if (part === 'p1') {
      var num = String(idx + 1).padStart(2, '0');
      return base + 'part1/part1_conv' + num + '.mp3';
    } else if (part === 'p2') {
      var labels = ['a', 'b', 'c', 'd'];
      return base + 'part2/conv_' + labels[idx] + '.mp3';
    } else if (part === 'p3') {
      var labels = ['a', 'b', 'c', 'd'];
      return base + 'part3/talk_' + labels[idx] + '.mp3';
    }
    return null;
  },

  _getText: function(part, idx) {
    if (typeof LISTENING_DATA === 'undefined') {
      console.error('[TTS] LISTENING_DATA not found');
      return null;
    }
    var data = LISTENING_DATA;
    var item = (part === 'p1') ? data.p1[idx] : (part === 'p2') ? data.p2[idx] : (part === 'p3') ? data.p3[idx] : null;
    if (!item || !item.lines) return null;
    return item.lines.map(function(line) { return line.t; }).join(' ');
  }
};
