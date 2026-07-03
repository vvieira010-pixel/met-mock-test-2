# How to Generate Narrator Audio

## Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements-narrator.txt
```

### 2. Get Your ElevenLabs API Key
1. Go to https://elevenlabs.io
2. Sign up or log in
3. Go to **Account** → **API Key**
4. Copy your API key

### 3. Run the Generator
```bash
export ELEVENLABS_API_KEY="paste-your-key-here"
python generate-narrator-audio.py
```

**Windows (PowerShell)**:
```powershell
$env:ELEVENLABS_API_KEY="paste-your-key-here"
python generate-narrator-audio.py
```

### 4. Output
The script will create:
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

## Customizing Scripts

**Before running**, edit `generate-narrator-audio.py`:

Find the `NARRATOR_SCRIPTS` dict (lines ~17-45) and modify any text:

```python
"writing-to-listening": {
    "text": """Your custom script here.
Multiple lines supported.""",
    "description": "Description for logs"
},
```

Save and run again!

---

## Changing the Voice

In the script, look for `VOICE_SETTINGS`:

```python
VOICE_SETTINGS = {
    "voice_id": "21m00Tcm4TlvDq8ikWAM",  # Rachel (recommended)
```

Available voices:
- `"21m00Tcm4TlvDq8ikWAM"` = **Rachel** ⭐ (professional, clear)
- `"EXAVITQu4vr4xnSDxMaL"` = Bella
- `"TxGEqnHWrfWFTfGW9XjX"` = Josh  
- `"TX3LPaxmHKTJvRPk9CjM"` = Arnold

Pick one, save, and re-run.

---

## Troubleshooting

### "ELEVENLABS_API_KEY environment variable not set"
You forgot to set the API key. Run:
```bash
export ELEVENLABS_API_KEY="your-key"
```
Then run the script again.

### "ModuleNotFoundError: No module named 'elevenlabs'"
Install dependencies:
```bash
pip install -r requirements-narrator.txt
```

### "Invalid API key"
Your API key is wrong or expired. Check:
1. Copy the full API key from elevenlabs.io/account
2. Make sure there are no extra spaces
3. Try creating a new API key

### "Quota exceeded"
You've used up your ElevenLabs free tier. Either:
- Upgrade your ElevenLabs account
- Wait for the month to reset
- Use a different account

---

## Next: Upload to CDN

After generation, upload the 6 MP3 files to a CDN (Netlify, AWS S3, or similar).

Then update the URLs in:
- `writing.html` (line ~25)
- `reading.html` (line ~1850)
- `speaking.html` (line ~1350)

See `NARRATOR-VOICE-GUIDE.md` for detailed URL insertion instructions.

---

## Help

Questions? Check:
- `NARRATOR-VOICE-GUIDE.md` — detailed voice & generation guide
- `NARRATOR-AUDIO-SETUP.md` — system architecture & fallback behavior
