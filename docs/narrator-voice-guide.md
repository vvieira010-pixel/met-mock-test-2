# Narrator Voice Guide — Using Listening Section Voices

## Objective
Generate 7 narrator MP3 files using the **same voice(s) from the Listening section** for consistency.

---

## Voice Reference Files

The Listening section uses these voice references:
- **Man voice**: `assets/audio/listening/part1/reference/man.mp3`
- **Woman voice**: (check part1/part2/part3 references)

**Action**: Download these reference files and upload them to ElevenLabs to clone/match the voice profile.

---

## 7 Narrator Scripts to Generate

### 1. **Writing → Listening**
**File destination**: `assets/audio/narrator/writing-to-listening.mp3`
```
"You have completed the Writing section. 
Next is Listening. You will hear three parts 
with different types of conversations and lectures. 
Listen carefully and answer the questions."
```
**Duration**: ~5 seconds | **Voice**: Man (neutral, clear instruction tone)

---

### 2. **Listening Part 1 → Part 2**
**File destination**: `assets/audio/narrator/listening-part1-to-part2.mp3`
```
"Part 1 is complete. 
Now listen to Part 2. 
In this section, you will hear urban planning lectures. 
Listen carefully and answer the questions."
```
**Duration**: ~4 seconds | **Voice**: Man (same as Part 1)

---

### 3. **Listening Part 2 → Part 3**
**File destination**: `assets/audio/narrator/listening-part2-to-part3.mp3`
```
"Part 2 is complete. 
Now listen to Part 3. 
You will hear a lecture about sleep science 
and interviews about sleep habits. 
Listen carefully and answer the questions."
```
**Duration**: ~4 seconds | **Voice**: Man (same consistent voice)

---

### 4. **Listening → Reading**
**File destination**: `assets/audio/narrator/listening-to-reading.mp3`
```
"The Listening section is complete. 
Next is Reading and Grammar. 
You will have about 90 minutes to read passages 
and answer reading comprehension and grammar questions."
```
**Duration**: ~4 seconds | **Voice**: Man (professional, clear)

---

### 5. **Reading → Speaking**
**File destination**: `assets/audio/narrator/reading-to-speaking.mp3`
```
"You have completed Reading and Grammar. 
Next is Speaking. 
You will answer five speaking tasks. 
You have 90 seconds to speak for each task."
```
**Duration**: ~4 seconds | **Voice**: Man (encouraging, calm)

---

### 6. **Speaking Part 1 → Part 2**
**File destination**: `assets/audio/narrator/speaking-part1-to-part2.mp3`
```
"Part 1 is complete. 
Now Part 2 begins. 
The questions in Part 2 are longer 
and require more detailed answers. 
You have 90 seconds for each task."
```
**Duration**: ~4 seconds | **Voice**: Man (consistent with earlier sections)

---

### 7. **Listening Part 3 conclusion** (Optional - if used in intro screens)
**File destination**: `assets/audio/narrator/listening-part3-intro.mp3`
```
"Now listen to Part 3. 
This section contains a lecture about 
plant biology and research interviews. 
Listen carefully and answer the questions."
```
**Duration**: ~4 seconds | **Voice**: Man

---

## ElevenLabs Voice Cloning Steps

### Option A: Voice Cloning (Recommended for consistency)
1. Go to [ElevenLabs VoiceLibrary](https://elevenlabs.io/voice-lab)
2. Click **"Clone Voice"**
3. Upload the reference voice file:
   - `listening/part1/reference/man.mp3` (or similar)
4. Name it: `MET-Test-Narrator` or similar
5. Use this voice to generate all 7 scripts above

### Option B: Pre-built Voice Selection (Faster)
If voice cloning isn't available:
1. Choose a professional voice like:
   - **"Adam"** (calm, professional)
   - **"Sam"** (clear, neutral)
   - **"James"** (authoritative, friendly)
2. Generate all 7 scripts with same voice for consistency

---

## Generation Settings for All Scripts

Use these settings consistently:

| Setting | Value |
|---------|-------|
| **Stability** | 0.5 (neutral) |
| **Similarity Boost** | 0.75 (natural sounding) |
| **Style Exaggeration** | 0.0 (professional) |
| **Speaker Boost** | ON |
| **Format** | MP3, 44.1kHz |
| **Bitrate** | 128 kbps |

---

## File Organization After Generation

After downloading from ElevenLabs, organize as:

```
assets/audio/narrator/
├── writing-to-listening.mp3
├── listening-part1-to-part2.mp3
├── listening-part2-to-part3.mp3
├── listening-to-reading.mp3
├── reading-to-speaking.mp3
└── speaking-part1-to-part2.mp3
```

---

## URL Configuration

After uploading to your CDN, update the config URLs:

**writing.html**:
```javascript
window.narratorSystem.init({
  'listening': 'https://cdn.example.com/narrator/writing-to-listening.mp3',
});
```

**reading.html**:
```javascript
window.narratorSystem.init({
  'reading': 'https://cdn.example.com/narrator/reading-to-speaking.mp3',
});
```

**speaking.html**:
```javascript
window.narratorSystem.init({
  'part2': 'https://cdn.example.com/narrator/speaking-part1-to-part2.mp3',
});
```

**listening.html** (to be updated):
```javascript
window.narratorSystem.init({
  'part2': 'https://cdn.example.com/narrator/listening-part1-to-part2.mp3',
  'part3': 'https://cdn.example.com/narrator/listening-part2-to-part3.mp3',
  'reading': 'https://cdn.example.com/narrator/listening-to-reading.mp3',
});
```

---

## Audio Quality Checklist

Before uploading, verify each file:
- [ ] Duration 3–5 seconds (optimal 4s)
- [ ] No background noise or artifacts
- [ ] Clear, natural speech rate
- [ ] Professional tone (not robotic)
- [ ] Consistent volume across all 7 files
- [ ] No cut-offs at beginning/end
- [ ] MP3 format at 44.1kHz, 128 kbps

---

**Ready?** Generate the 7 scripts in ElevenLabs, download, upload to CDN, and paste the URLs into the config!
