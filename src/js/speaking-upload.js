/* speaking-upload.js — uploads speaking recordings to Netlify Blobs via /api/upload-recording */
(function () {
  var SESSION_KEY = 'met:session:id';

  function getSessionId() {
    var id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      try { localStorage.setItem(SESSION_KEY, id); } catch (_) {}
    }
    return id;
  }

  window.uploadSpeakingRecording = function (taskIndex, chunks) {
    if (!chunks || chunks.length === 0) return;
    var mimeType = (chunks[0] && chunks[0].type) ? chunks[0].type : 'audio/webm';
    var blob = new Blob(chunks, { type: mimeType });
    var sessionId = getSessionId();

    var reader = new FileReader();
    reader.onload = function () {
      var base64 = reader.result.split(',')[1];
      fetch('/api/upload-recording', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId,
          taskIndex: taskIndex,
          audioBase64: base64,
          mimeType: mimeType
        })
      }).catch(function () { /* silent — best-effort upload */ });
    };
    reader.readAsDataURL(blob);
  };

  // Expose so thanks.html can include the sessionId in the Netlify Form submission
  window.getSpeakingSessionId = getSessionId;
})();
