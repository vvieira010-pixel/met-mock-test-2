import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';

const DEEPGRAM_KEY = 'f8ad5c6837799e3c2b0a1f830f926c0c9cb81385';
const ELEVENLABS_KEY = '95f9679fb6a8c197168c6efaf9826e1e31145be1aee59b029daebfff0148ef17';

const DEEPGRAM_VOICES = { W: 'aura-2-asteria-en', M: 'aura-2-orion-en', T1: 'aura-2-luna-en', T2: 'aura-2-luna-en', T3: 'aura-2-luna-en', N: 'aura-2-luna-en' };
const ELEVENLABS_VOICES = { W: 'EXAVITQu4vr4xnSDxMaL', M: 'JBFqnCBsd6RMkjVDRZzb', T1: 'SAz9YHcvj6GT2YYXdXww', T2: 'SAz9YHcvj6GT2YYXdXww', T3: 'SAz9YHcvj6GT2YYXdXww', N: 'SAz9YHcvj6GT2YYXdXww' };

const DATA = {
  p2: [
    { title: 'Conversation A: Volunteer Programme', lines: [{s:'W',t:'Hello, I\'m calling about the volunteer programme I saw online.'},{s:'M',t:'Great! What would you like to know?'},{s:'W',t:'What kind of organization are you exactly?'},{s:'M',t:'We are a community volunteer network connecting local people with meaningful projects.'},{s:'W',t:'What do I need to do before I can begin?'},{s:'M',t:'You\'ll need to attend a short orientation session so we can match you to a suitable role.'},{s:'W',t:'How long is the minimum commitment?'},{s:'M',t:'We ask for at least three months, but many volunteers stay longer.'},{s:'W',t:'I\'m most interested in working with children.'},{s:'M',t:'Perfect - we have after-school tutoring programmes that would be an excellent fit.'}] },
    { title: 'Conversation B: Part-time Job', lines: [{s:'W',t:'Excuse me, are you still hiring part-time staff?'},{s:'M',t:'Yes, we are. Have you worked in a café before?'},{s:'W',t:'No, but I learn quickly. The problem is my class schedule.'},{s:'M',t:'What does your schedule look like?'},{s:'W',t:'I have classes until 3 p.m. most days, so I can only work evenings.'},{s:'M',t:'You should talk to the manager directly. She handles all scheduling herself.'},{s:'W',t:'Where can I find her?'},{s:'M',t:'She\'ll be here later this afternoon. Come back around 4.'}] },
    { title: 'Conversation C: Class Project', lines: [{s:'W',t:'For our class project, I was thinking we could look at local water pollution in the river.'},{s:'M',t:'That sounds interesting. How would we collect data?'},{s:'W',t:'We could visit sites along the river and take water samples.'},{s:'M',t:'The professor warned us the topic might be too broad. Maybe we should focus on just one section?'},{s:'W',t:'Good point. We could focus on the area near the industrial zone.'},{s:'M',t:'When is the first draft due?'},{s:'W',t:'In two weeks. That should give us enough time.'}] },
    { title: 'Conversation D: Travel Plans', lines: [{s:'W',t:'I\'m planning a hiking trip to the mountains next month.'},{s:'M',t:'That sounds amazing. But I\'m a bit concerned - have you checked the weather up there?'},{s:'W',t:'Not yet. I need to find accommodation near the trail.'},{s:'M',t:'I\'d recommend buying travel insurance. Mountain hiking can be risky.'},{s:'W',t:'That\'s smart. I hadn\'t thought of that.'},{s:'M',t:'Also check if the cabins are open that time of year.'}] }
  ],
  p3: [
    { title: 'Talk A: New Course Announcement', lines: [{s:'T1',t:'Good morning, everyone. I am pleased to announce a new course: Environmental Science 201.'},{s:'T1',t:'This course is open to students from any department who have completed their first-year science requirement.'},{s:'T1',t:'The course will require students to complete a hands-on research project working with real environmental data.'},{s:'T1',t:'What makes this course special is our new hands-on approach - you will spend time in the field, not just the classroom.'},{s:'T1',t:'Registration opens next Monday. I encourage anyone interested to sign up early as places are limited.'}] },
    { title: 'Talk B: Library Announcement', lines: [{s:'T2',t:'Attention all students. The library will be introducing a new online booking system starting next month.'},{s:'T2',t:'This system will allow you to reserve study rooms and borrow books from your phone or computer.'},{s:'T2',t:'If you need help using the new system, please visit the help desk on the ground floor during opening hours.'},{s:'T2',t:'We are making these changes to improve student access to our resources, especially during busy exam periods.'},{s:'T2',t:'The current system will remain active until the end of this month. Thank you for your cooperation.'}] },
    { title: 'Talk C: Museum Guide', lines: [{s:'T3',t:'Welcome to the City Science Museum. I will be your guide for today.'},{s:'T3',t:'Our most popular exhibit is the space exploration room, where you can see a real piece of the moon.'},{s:'T3',t:'I recommend planning to spend two to three hours here to see everything properly.'},{s:'T3',t:'Our gift shop is located near the main entrance and sells books, educational toys, and souvenirs.'},{s:'T3',t:'Next week, we are hosting a special children\'s workshop on robotics. Tickets are available at the front desk.'}] },
    { title: 'Talk D: Community Garden', lines: [{s:'N',t:'Welcome to the Riverside Community Garden. Our main purpose is to provide fresh produce for local residents.'},{s:'N',t:'Anyone who volunteers their time can participate - no gardening experience is needed.'},{s:'N',t:'All garden tools are provided by the city council, so you do not need to bring anything.'},{s:'N',t:'Looking ahead, we are planning to build a greenhouse which will allow us to grow vegetables all year round.'},{s:'N',t:'If you are interested in joining, please speak to me after the tour or visit our website.'}] }
  ]
};

const ALT = { p2: ['dg','el','dg','el'], p3: ['el','dg','el','dg'] };

async function deepgramTTS(text, voice) {
  const resp = await fetch(`https://api.deepgram.com/v1/speak?model=${voice}`, {
    method: 'POST',
    headers: { 'Authorization': `Token ${DEEPGRAM_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  if (!resp.ok) { const t = await resp.text(); throw new Error(`Deepgram ${resp.status}: ${t}`); }
  return Buffer.from(await resp.arrayBuffer());
}

async function elevenlabsTTS(text, voiceId) {
  const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': ELEVENLABS_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: 'eleven_turbo_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75 } })
  });
  if (!resp.ok) { const t = await resp.text(); throw new Error(`ElevenLabs ${resp.status}: ${t}`); }
  return Buffer.from(await resp.arrayBuffer());
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function generateDialogue(part, idx, lines, engine, outPath, label) {
  console.log(`\n[${label}] Generating ${outPath} (${engine.toUpperCase()})...`);
  const tmpDir = join(dirname(outPath), '.tmp');
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
  const chunkPaths = [];

  for (let i = 0; i < lines.length; i++) {
    const { s, t } = lines[i];
    const chunkPath = join(tmpDir, `chunk_${String(i).padStart(2,'0')}.mp3`);
    const voice = engine === 'dg' ? DEEPGRAM_VOICES[s] || 'aura-2-asteria-en' : ELEVENLABS_VOICES[s] || '21m00Tcm4TlvDq8ikWAM';
    console.log(`  Line ${i+1}/${lines.length} [${s}] "${t.slice(0,50)}..."`);
    const buf = engine === 'dg' ? await deepgramTTS(t, voice) : await elevenlabsTTS(t, voice);
    writeFileSync(chunkPath, buf);
    chunkPaths.push(chunkPath);
    await sleep(200);
  }

  const listPath = join(tmpDir, 'files.txt');
  const listContent = chunkPaths.map(p => `file '${p.replace(/\\/g, '/')}'\nduration 0.3`).join('\n');
  writeFileSync(listPath, listContent, 'utf-8');

  const concatPath = join(tmpDir, 'concat.mp3');
  execSync(`ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${concatPath}"`, { stdio: 'ignore' });

  execSync(`ffmpeg -y -i "${concatPath}" -codec:a libmp3lame -b:a 64k "${outPath}"`, { stdio: 'ignore' });
  console.log(`  ✓ Saved ${outPath}`);
  chunkPaths.forEach(p => { try { execSync(`del "${p}"`, { stdio: 'ignore' }); } catch {} });
  try { execSync(`del "${listPath}" "${concatPath}"`, { stdio: 'ignore' }); } catch {}
  try { execSync(`rmdir "${tmpDir}"`, { stdio: 'ignore' }); } catch {}
}

async function main() {
  const base = join(process.cwd(), 'assets', 'audio', 'listening');
  for (const part of ['p2', 'p3']) {
    const partLabel = part === 'p2' ? 'Part 2' : 'Part 3';
    const data = DATA[part];
    const prefix = part === 'p2' ? 'conv' : 'talk';
    for (let i = 0; i < data.length; i++) {
      const engine = ALT[part][i];
      const labels = ['a', 'b', 'c', 'd'];
      const outPath = join(base, part, `${prefix}_${labels[i]}.mp3`);
      await generateDialogue(part, i, data[i].lines, engine, outPath, `${partLabel} ${labels[i].toUpperCase()}`);
    }
  }
  console.log('\n✓ All dialogues generated!');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
