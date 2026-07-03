# MET Mock Test — Narrator Audio Configuration Guide

## Overview

The MET Mock Test includes **narrator audio** between sections and parts, creating an authentic test experience. The narrator introduces new sections and guides students through transitions.

**Status**: System implemented and ready. Awaiting ElevenLabs MP3 URLs.

---

## Test Flow & Narrator Moments

```
[Writing Section — 45 min]
    ↓ narrator plays
[NARRATOR: "You have completed Writing. Next is Listening."]
    ↓
[Listening Part 1 — 35 min, 19 questions]
    ↓ narrator plays
[NARRATOR: "Part 1 complete. Now Part 2."]
    ↓
[Listening Part 2 — 14 min, 17 questions]
    ↓ narrator plays
[NARRATOR: "Part 2 complete. Now Part 3."]
    ↓
[Listening Part 3 — 25 min, 17 questions]
    ↓ narrator plays
[NARRATOR: "Listening section complete. Next is Reading and Grammar."]
    ↓
[Reading & Grammar — 90 min, 40 questions]
    ↓ narrator plays
[NARRATOR: "You have completed Reading. Next is Speaking."]
    ↓
[Speaking Part 1 — 3 questions × 90s each + 15s prep]
    ↓ narrator plays
[NARRATOR: "Part 1 complete. Now Part 2."]
    ↓
[Speaking Part 2 — 2 questions × 90s each + 20s prep]
    ↓
[Mock Test Complete]
```

---

## Narrator Locations in Code

All narrator configurations use the shared **`assets/narrator-system.js`** utility.

### Files with Narrator Zones Ready:

| File | Transition | Config Key | Status |
|------|-----------|-----------|--------|
| `writing.html` | Writing → Listening | `listening` | ✓ Ready |
| `Listening/listening.html` | Part 1 → 2 | `part2` | ⏳ TODO |
| `Listening/listening.html` | Part 2 → 3 | `part3` | ⏳ TODO |
| `Listening/listening.html` | Listening → Reading | `reading` | ⏳ TODO |
| `reading.html` | Reading → Speaking | `speaking` | ✓ Ready |
| `speaking.html` | Part 1 → 2 | `part2` | ✓ Ready |

---

## How the System Works

### 1. **Auto-Play on Transition**
When a student completes a section, the narrator audio automatically plays:
```javascript
window.narratorSystem.play(key, buttonId);
```

### 2. **Button Lock During Narration**
The "Next" button is disabled (grayed out) until:
- Narrator audio **finishes playing**, OR
- **5-second timeout** is reached (fallback safety)

### 3. **Graceful Fallback**
If audio URL is empty or missing, the system waits 5 seconds then unlocks the button automatically.

---

## Setting Up ElevenLabs Audio

### Step 1: Create Narrator Voices in ElevenLabs

1. Log in to [ElevenLabs](https://elevenlabs.io)
2. Navigate to **VoiceLibrary** → Select an appropriate voice for test instructions
   - Recommend: Clear, calm, professional tone (e.g., "Rachel", "Sam")
3. Create scripts for each narrator moment:
   - **Writing → Listening**: "You have completed the Writing section. Next is Listening."
   - **Part 1 → 2**: "Part 1 is complete. Now listen to Part 2."
   - **Part 2 → 3**: "Part 2 is complete. Now listen to Part 3."
   - **Listening → Reading**: "The Listening section is complete. Next is Reading and Grammar."
   - **Reading → Speaking**: "You have completed Reading and Grammar. Next is Speaking."
   - **Speaking Part 1 → 2**: "Part 1 is complete. Now Part 2 begins."

### Step 2: Generate MP3 Files

For each script:
1. Paste the text into ElevenLabs text box
2. Click **Generate** to create MP3
3. Download the MP3 file
4. Copy the download URL (or upload to your own CDN)

### Step 3: Insert URLs into Code

Update the narrator configuration in each file:

**`writing.html` (after line 24)**:
```javascript
window.narratorSystem.init({
  'listening': 'https://your-cdn.com/narrator-writing-to-listening.mp3',  // ← INSERT URL
  'reading': '',
  'speaking': '',
  'part2': '',
  'part3': ''
});
```

**`reading.html` (after line 1850)**:
```javascript
window.narratorSystem.init({
  'listening': '',
  'reading': 'https://your-cdn.com/narrator-reading-to-speaking.mp3',     // ← INSERT URL
  'speaking': '',
  'part2': '',
  'part3': ''
});
```

**`speaking.html` (after line 1350)**:
```javascript
window.narratorSystem.init({
  'listening': '',
  'reading': '',
  'speaking': '',
  'part2': 'https://your-cdn.com/narrator-speaking-part1-to-part2.mp3',  // ← INSERT URL
  'part3': ''
});
```

**`Listening/listening.html` (in script section, line ~TBD)**:
```javascript
window.narratorSystem.init({
  'listening': '',
  'reading': 'https://your-cdn.com/narrator-listening-to-reading.mp3',    // ← INSERT URL
  'part2': 'https://your-cdn.com/narrator-listening-part1-to-part2.mp3',  // ← INSERT URL
  'part3': 'https://your-cdn.com/narrator-listening-part2-to-part3.mp3'   // ← INSERT URL
});
```

---

## Audio Specifications

- **Format**: MP3
- **Duration**: 3–5 seconds (optimal 4s for student cognitive load)
- **Sample Rate**: 44.1 kHz or higher
- **Bitrate**: 128 kbps (acceptable for speech)
- **Volume**: Normalized to -14 dB (prevent sharp transitions)

---

## Testing the Narrator System

1. **Test with empty URLs** (current state):
   - Click "Next" buttons
   - Button should unlock after 5 seconds automatically
   - No errors in browser console

2. **Test with real URLs**:
   - Verify audio plays automatically
   - Check button remains disabled during playback
   - Verify button unlocks when audio ends
   - Test on mobile (microphone button may trigger)

---

## Fallback Behavior

If any audio fails:
- Logs warning to console: `[Narrator] Playback failed`
- Button automatically unlocks after 5 seconds
- Student can continue test without audio

---

## Future Enhancements

- [ ] Add visual indicator (progress bar) while narrator audio plays
- [ ] Add mute toggle for students who want to skip narrator audio
- [ ] Store narrator URLs in configuration file (separate from code)
- [ ] Add narrator audio to Part intro screens (before questions start)

---

**Last Updated**: 2026-05-13  
**System Status**: Ready for URL integration
