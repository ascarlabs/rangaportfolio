#!/usr/bin/env node
/**
 * Portfolio Generator
 * -------------------
 * Reads:
 *   - input/resume.pdf (or .docx, .txt)
 *   - input/photo.jpg  (or .png, .webp)
 * Writes:
 *   - data/portfolio.json         (parsed + spoken-style intro)
 *   - public/photo.<ext>          (copied photo)
 *   - public/intro.mp3  (optional, if OPENAI_API_KEY set)  -> enables provider="openai"
 *
 * Providers:
 *   - Default (no keys):  heuristic parser + template-based first-person intro.
 *   - With OPENAI_API_KEY: uses gpt-4o-mini for structured extraction + natural-speech rewrite,
 *                          and OpenAI TTS for the intro.mp3 file.
 *
 * Usage:
 *   node scripts/generate.mjs
 *   OPENAI_API_KEY=sk-... node scripts/generate.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const inputDir = path.join(root, 'input');
const publicDir = path.join(root, 'public');
const dataDir = path.join(root, 'data');

// Load .env.local / .env (in that order) if OPENAI_API_KEY isn't already in the environment.
for (const file of ['.env.local', '.env']) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (!m) continue;
    const [, k, rawV] = m;
    if (process.env[k]) continue;
    const v = rawV.replace(/^['"]|['"]$/g, '');
    process.env[k] = v;
  }
}

fs.mkdirSync(inputDir, { recursive: true });
fs.mkdirSync(publicDir, { recursive: true });
fs.mkdirSync(dataDir, { recursive: true });

const findFile = (dir, basenames, exts) => {
  for (const b of basenames) {
    for (const e of exts) {
      const p = path.join(dir, `${b}${e}`);
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
};

const resumePath = findFile(inputDir, ['resume', 'cv'], ['.pdf', '.docx', '.txt', '.md']);
const photoPath = findFile(inputDir, ['photo', 'avatar', 'headshot'], ['.jpg', '.jpeg', '.png', '.webp']);

async function readResumeText(p) {
  if (!p) return '';
  const ext = path.extname(p).toLowerCase();
  if (ext === '.pdf') {
    // Import the library file directly — the package's index.js has debug code
    // that tries to open a test PDF at import time.
    const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
    const buf = fs.readFileSync(p);
    const out = await pdfParse(buf);
    return out.text;
  }
  if (ext === '.docx') {
    const mammoth = await import('mammoth');
    const out = await mammoth.extractRawText({ path: p });
    return out.value;
  }
  return fs.readFileSync(p, 'utf8');
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(\+?\d[\d\s\-().]{7,}\d)/;
const URL_RE = /https?:\/\/[^\s)]+/g;

function heuristicParse(text, fallbackName = 'Your Name') {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const email = (text.match(EMAIL_RE) || [])[0] || '';
  const phone = (text.match(PHONE_RE) || [])[0] || '';
  const urls = text.match(URL_RE) || [];
  const github = urls.find((u) => /github\.com/i.test(u)) || '';
  const linkedin = urls.find((u) => /linkedin\.com/i.test(u)) || '';
  const website = urls.find((u) => !/github|linkedin/i.test(u)) || '';

  // Guess name from the first non-trivial line
  let name = fallbackName;
  for (const l of lines.slice(0, 8)) {
    if (EMAIL_RE.test(l) || PHONE_RE.test(l) || /http/i.test(l)) continue;
    if (l.length > 2 && l.length < 60 && /^[A-Za-z][A-Za-z .'\-]+$/.test(l)) {
      name = l;
      break;
    }
  }

  // Section chunking
  const SECTION_PATTERNS = {
    summary: /(summary|profile|objective|about)/i,
    experience: /(experience|employment|work history|professional)/i,
    skills: /(skills|technologies|tech stack|tools)/i,
    projects: /(projects|portfolio)/i,
    education: /(education|academic)/i,
  };
  const sections = { header: [] };
  let current = 'header';
  for (const line of lines) {
    let matched = null;
    for (const [key, re] of Object.entries(SECTION_PATTERNS)) {
      if (re.test(line) && line.length < 40) {
        matched = key;
        break;
      }
    }
    if (matched) {
      current = matched;
      sections[current] = sections[current] || [];
      continue;
    }
    (sections[current] = sections[current] || []).push(line);
  }

  const summary = (sections.summary || []).slice(0, 6).join(' ').trim();

  const experience = [];
  const expLines = sections.experience || [];
  let job = null;
  const DATE_RE = /(\b(19|20)\d{2}\b|present|current)/i;
  for (const l of expLines) {
    if (DATE_RE.test(l) && l.length < 120) {
      if (job) experience.push(job);
      const dates = l.match(/((19|20)\d{2}|present|current)/gi) || [];
      job = {
        role: l.replace(/[•●]/g, '').split(/[\|\-–—]/)[0].trim().slice(0, 80) || 'Role',
        company: l.split(/[\|\-–—]/)[1]?.trim() || '',
        start: dates[0] || '',
        end: dates[1] || 'Present',
        location: '',
        highlights: [],
      };
    } else if (job && (l.startsWith('•') || l.startsWith('-') || l.startsWith('●') || l.length > 30)) {
      job.highlights.push(l.replace(/^[-•●\s]+/, ''));
    }
  }
  if (job) experience.push(job);

  const skillsLine = (sections.skills || []).join(', ');
  const skillTokens = skillsLine
    .split(/[,;\|\n]/)
    .map((s) => s.replace(/^[^A-Za-z]+/, '').trim())
    .filter((s) => s.length > 1 && s.length < 30);
  const skills = skillTokens.length ? { Skills: Array.from(new Set(skillTokens)).slice(0, 30) } : {};

  const projects = (sections.projects || [])
    .filter((l) => l.length > 10)
    .slice(0, 6)
    .map((l) => ({
      name: l.split(/[\-–—:]/)[0].trim().slice(0, 60),
      summary: l.split(/[\-–—:]/).slice(1).join(' ').trim() || l,
      stack: [],
      link: '',
    }));

  const education = (sections.education || [])
    .filter((l) => /university|college|institute|school|b\.tech|m\.tech|bachelor|master|phd/i.test(l))
    .slice(0, 3)
    .map((l) => ({
      school: l.split(/[\-–—:]/)[0].trim(),
      degree: l.split(/[\-–—:]/).slice(1).join(' ').trim(),
      start: '',
      end: '',
    }));

  return {
    name,
    title: experience[0]?.role || 'Software Engineer',
    tagline: 'Turning ideas into shipped products.',
    location: '',
    photo: '/photo.jpg',
    email,
    phone,
    links: { github, linkedin, website },
    summary: summary || `${name} — engineer, builder, problem-solver.`,
    spokenIntro: '',
    experience: experience.length ? experience : [],
    skills: Object.keys(skills).length ? skills : { Skills: [] },
    projects,
    education,
  };
}

function buildSpokenIntro(p) {
  const first = p.name.split(/\s+/)[0];
  const years = inferYears(p.experience);
  const bits = [];
  bits.push(`Hi, I'm ${first}.`);
  if (p.title) bits.push(`I'm a ${p.title.toLowerCase()}.`);
  if (years) bits.push(`I have over ${years} years of experience building production software.`);
  const allSkills = Object.values(p.skills || {}).flat();
  if (allSkills.length) {
    const top = allSkills.slice(0, 5).join(', ');
    bits.push(`I work across ${top}.`);
  }
  const topJob = p.experience?.[0];
  if (topJob?.highlights?.[0]) {
    bits.push(`Most recently, ${topJob.highlights[0].toLowerCase()}`);
  }
  bits.push('Thanks for stopping by — feel free to explore my work below.');
  return bits.join(' ');
}

function inferYears(experience = []) {
  const years = experience
    .map((j) => parseInt(j.start, 10))
    .filter((n) => !Number.isNaN(n));
  if (!years.length) return null;
  const earliest = Math.min(...years);
  const now = new Date().getFullYear();
  return Math.max(1, now - earliest);
}

async function enhanceWithOpenAI(rawText, heuristic) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const prompt = `You are a resume parser. Extract structured data from this resume text and return STRICT JSON matching this TypeScript type (no markdown, no prose):

type Portfolio = {
  name: string; title: string; tagline: string; location: string;
  email: string; phone?: string;
  links: { github?: string; linkedin?: string; website?: string };
  summary: string;
  spokenIntro: string; // first-person, natural spoken paragraph starting with "Hi, I'm <firstName>." 4-6 sentences, warm and confident, ~20-30 seconds when spoken.
  experience: { company: string; role: string; start: string; end: string; location?: string; highlights: string[] }[];
  skills: Record<string, string[]>; // grouped, e.g. "Languages", "Frameworks", "Cloud & Infra", "Data"
  projects: { name: string; summary: string; stack: string[]; link?: string }[];
  education: { school: string; degree: string; start: string; end: string }[];
};

Resume text:
"""
${rawText.slice(0, 15000)}
"""

Heuristic draft (use as a hint, correct where wrong):
${JSON.stringify(heuristic).slice(0, 4000)}
`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You extract structured JSON from resumes. Reply with JSON only.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      }),
    });
    if (!res.ok) {
      console.warn('[openai] extraction failed:', res.status, await res.text());
      return null;
    }
    const json = await res.json();
    const text = json.choices?.[0]?.message?.content?.trim();
    if (!text) return null;
    return JSON.parse(text);
  } catch (err) {
    console.warn('[openai] error:', err.message);
    return null;
  }
}

async function generateIntroMp3(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return false;
  try {
    const voice = process.env.OPENAI_TTS_VOICE || 'alloy';
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        voice,
        input: text,
        format: 'mp3',
      }),
    });
    if (!res.ok) {
      console.warn('[openai tts] failed:', res.status, await res.text());
      return false;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(path.join(publicDir, 'intro.mp3'), buf);
    return true;
  } catch (err) {
    console.warn('[openai tts] error:', err.message);
    return false;
  }
}

/* ------------------------ Hedra talking-head video ------------------------ */

const HEDRA_BASE = 'https://api.hedra.com/web-app/public';
const HEDRA_MODEL_AVATAR = '26f0fc66-152b-40ab-abed-76c43df99bc8'; // Hedra Avatar (talking head, up to 10 min)
const HEDRA_CACHE = path.join(root, '.hedra-cache.json');

function loadHedraCache() {
  if (!fs.existsSync(HEDRA_CACHE)) return {};
  try { return JSON.parse(fs.readFileSync(HEDRA_CACHE, 'utf8')); } catch { return {}; }
}
function saveHedraCache(obj) {
  fs.writeFileSync(HEDRA_CACHE, JSON.stringify(obj, null, 2));
}

async function hedraFetch(apiKey, url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { 'X-API-Key': apiKey, ...(opts.headers || {}) },
  });
  return res;
}

async function hedraUploadAsset(apiKey, filePath, type) {
  const ext = path.extname(filePath).toLowerCase();
  const mime =
    {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.m4a': 'audio/mp4',
    }[ext] || 'application/octet-stream';

  const createRes = await hedraFetch(apiKey, `${HEDRA_BASE}/assets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: path.basename(filePath), type }),
  });
  if (!createRes.ok) {
    throw new Error(`[hedra] create asset failed: ${createRes.status} ${await createRes.text()}`);
  }
  const asset = await createRes.json();
  const assetId = asset.id || asset.asset_id;

  const form = new FormData();
  const buf = fs.readFileSync(filePath);
  form.append('file', new Blob([buf], { type: mime }), path.basename(filePath));

  const upRes = await hedraFetch(apiKey, `${HEDRA_BASE}/assets/${assetId}/upload`, {
    method: 'POST',
    body: form,
  });
  if (!upRes.ok) {
    throw new Error(`[hedra] upload asset failed: ${upRes.status} ${await upRes.text()}`);
  }
  return assetId;
}

async function hedraEnsureAsset(apiKey, cache, cacheKey, filePath, type) {
  const mtime = fs.statSync(filePath).mtimeMs;
  if (cache[cacheKey]?.id && cache[cacheKey]?.mtime === mtime) return cache[cacheKey].id;
  console.log(`[hedra] Uploading ${type} asset: ${path.basename(filePath)}`);
  const id = await hedraUploadAsset(apiKey, filePath, type);
  cache[cacheKey] = { id, mtime };
  saveHedraCache(cache);
  return id;
}

async function hedraPollGeneration(apiKey, generationId) {
  const deadline = Date.now() + 10 * 60 * 1000; // 10 min max
  let delay = 3000;
  while (Date.now() < deadline) {
    const res = await hedraFetch(apiKey, `${HEDRA_BASE}/generations/${generationId}/status`);
    if (!res.ok) {
      console.warn(`[hedra] poll non-ok: ${res.status}`);
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }
    const json = await res.json();
    const status = json.status || json.state || 'unknown';
    const progress = json.progress ?? json.percent ?? null;
    process.stdout.write(`\r[hedra] status=${status}${progress != null ? ` progress=${Math.round(progress * 100)}%` : ''}      `);
    if (['complete', 'completed', 'succeeded', 'success'].includes(status)) {
      process.stdout.write('\n');
      return json.url || json.asset?.url || json.video_url || json;
    }
    if (['failed', 'error', 'canceled', 'cancelled'].includes(status)) {
      process.stdout.write('\n');
      throw new Error(`[hedra] generation ${status}: ${JSON.stringify(json).slice(0, 400)}`);
    }
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay + 1500, 8000);
  }
  throw new Error('[hedra] generation timed out after 10 minutes');
}

async function generateTalkingVideoWithHedra() {
  const apiKey = process.env.HEDRA_API_KEY;
  if (!apiKey) return false;

  const photoPathLocal = findFile(publicDir, ['photo'], ['.jpg', '.jpeg', '.png', '.webp']);
  const audioPathLocal = path.join(publicDir, 'intro.mp3');
  if (!photoPathLocal || !fs.existsSync(audioPathLocal)) {
    console.log('[hedra] Need both public/photo.* and public/intro.mp3 — skipping video gen.');
    return false;
  }

  const cache = loadHedraCache();
  try {
    const imageId = await hedraEnsureAsset(apiKey, cache, 'image', photoPathLocal, 'image');
    const audioId = await hedraEnsureAsset(apiKey, cache, 'audio', audioPathLocal, 'audio');

    console.log('[hedra] Starting talking-head video generation...');
    const genRes = await hedraFetch(apiKey, `${HEDRA_BASE}/generations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'video',
        ai_model_id: HEDRA_MODEL_AVATAR,
        start_keyframe_id: imageId,
        audio_id: audioId,
        generated_video_inputs: {
          text_prompt:
            'A professional software engineer speaking warmly and confidently to the camera. Subtle natural head movement, gentle smile, occasional blinking, calm energy.',
          aspect_ratio: '1:1',
          resolution: '720p',
        },
      }),
    });
    if (!genRes.ok) {
      console.warn('[hedra] start generation failed:', genRes.status, await genRes.text());
      return false;
    }
    const gen = await genRes.json();
    const generationId = gen.id || gen.generation_id;
    if (!generationId) {
      console.warn('[hedra] no generation id in response:', JSON.stringify(gen).slice(0, 300));
      return false;
    }

    const videoUrl = await hedraPollGeneration(apiKey, generationId);
    if (typeof videoUrl !== 'string') {
      console.warn('[hedra] no video URL returned:', JSON.stringify(videoUrl).slice(0, 300));
      return false;
    }

    console.log('[hedra] Downloading finished video...');
    const vRes = await fetch(videoUrl);
    if (!vRes.ok) {
      console.warn('[hedra] download failed:', vRes.status);
      return false;
    }
    const buf = Buffer.from(await vRes.arrayBuffer());
    fs.writeFileSync(path.join(publicDir, 'intro.mp4'), buf);
    console.log(`[hedra] Wrote public/intro.mp4 (${(buf.length / 1024 / 1024).toFixed(2)} MB)`);
    return true;
  } catch (err) {
    console.warn('[hedra] error:', err.message);
    return false;
  }
}

/* ----------------------- ElevenLabs voice cloning ----------------------- */

const ELEVEN_CACHE = path.join(root, '.elevenlabs-cache.json');

function loadElevenCache() {
  if (!fs.existsSync(ELEVEN_CACHE)) return {};
  try {
    return JSON.parse(fs.readFileSync(ELEVEN_CACHE, 'utf8'));
  } catch {
    return {};
  }
}

function saveElevenCache(obj) {
  fs.writeFileSync(ELEVEN_CACHE, JSON.stringify(obj, null, 2));
}

async function elevenVoiceExists(voiceId, apiKey) {
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
      headers: { 'xi-api-key': apiKey },
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function cloneVoiceWithElevenLabs(name) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;

  const voicePath = findFile(inputDir, ['voice', 'sample'], ['.m4a', '.mp3', '.wav', '.ogg', '.flac', '.webm']);
  if (!voicePath) {
    console.log('[elevenlabs] No voice sample at input/voice.{m4a,mp3,wav,...} — skipping clone.');
    return null;
  }

  const cache = loadElevenCache();
  const sampleMTime = fs.statSync(voicePath).mtimeMs;

  // Reuse cached voice_id if the sample hasn't changed AND the voice still exists on ElevenLabs.
  if (cache.voiceId && cache.sampleMTime === sampleMTime) {
    const ok = await elevenVoiceExists(cache.voiceId, apiKey);
    if (ok) {
      console.log(`[elevenlabs] Reusing cached voice clone: ${cache.voiceId}`);
      return cache.voiceId;
    }
  }

  const ext = path.extname(voicePath).toLowerCase();
  const mimeByExt = {
    '.m4a': 'audio/mp4',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
    '.webm': 'audio/webm',
  };
  const mime = mimeByExt[ext] || 'audio/mpeg';

  const form = new FormData();
  form.append('name', `Portfolio Voice — ${name}`.slice(0, 60));
  form.append('description', 'Cloned voice for AI-generated portfolio intro.');
  form.append('remove_background_noise', 'true');
  const buf = fs.readFileSync(voicePath);
  form.append('files', new Blob([buf], { type: mime }), `voice${ext}`);

  console.log('[elevenlabs] Uploading sample and creating cloned voice...');
  const res = await fetch('https://api.elevenlabs.io/v1/voices/add', {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: form,
  });
  if (!res.ok) {
    console.warn('[elevenlabs] clone failed:', res.status, await res.text());
    return null;
  }
  const json = await res.json();
  const voiceId = json.voice_id;
  saveElevenCache({ voiceId, sampleMTime, createdAt: new Date().toISOString() });
  console.log(`[elevenlabs] Created voice clone: ${voiceId}`);
  return voiceId;
}

async function generateIntroMp3WithElevenLabs(voiceId, text) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey || !voiceId) return false;
  const modelId = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
  try {
    console.log(`[elevenlabs] Synthesizing intro (${text.length} chars) with model ${modelId}...`);
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability: 0.55,
            similarity_boost: 0.85,
            style: 0.2,
            use_speaker_boost: true,
          },
        }),
      },
    );
    if (!res.ok) {
      console.warn('[elevenlabs tts] failed:', res.status, await res.text());
      return false;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(path.join(publicDir, 'intro.mp3'), buf);
    return true;
  } catch (err) {
    console.warn('[elevenlabs tts] error:', err.message);
    return false;
  }
}

async function main() {
  if (!resumePath) {
    console.log('[generate] No resume found at input/resume.{pdf,docx,txt,md}. Keeping existing data/portfolio.json.');
  }
  if (!photoPath) {
    console.log('[generate] No photo found at input/photo.{jpg,png,webp}. Keeping existing /public/photo.*.');
  } else {
    const ext = path.extname(photoPath);
    const dest = path.join(publicDir, `photo${ext.toLowerCase()}`);
    fs.copyFileSync(photoPath, dest);
    console.log(`[generate] Copied photo -> public/photo${ext.toLowerCase()}`);
  }

  let portfolio;
  if (resumePath) {
    const text = await readResumeText(resumePath);
    const heuristic = heuristicParse(text);
    const ai = await enhanceWithOpenAI(text, heuristic);
    portfolio = ai || heuristic;

    if (photoPath) {
      portfolio.photo = `/photo${path.extname(photoPath).toLowerCase()}`;
    } else if (!portfolio.photo) {
      portfolio.photo = '/photo.svg';
    }

    if (!portfolio.spokenIntro || portfolio.spokenIntro.length < 20) {
      portfolio.spokenIntro = buildSpokenIntro(portfolio);
    }

    // Normalize ALL-CAPS names (resume headers often shout).
    if (portfolio.name && portfolio.name === portfolio.name.toUpperCase()) {
      portfolio.name = portfolio.name
        .toLowerCase()
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }

    fs.writeFileSync(path.join(dataDir, 'portfolio.json'), JSON.stringify(portfolio, null, 2));
    console.log('[generate] Wrote data/portfolio.json');
  } else {
    portfolio = JSON.parse(fs.readFileSync(path.join(dataDir, 'portfolio.json'), 'utf8'));
  }

  if (portfolio.spokenIntro) {
    let done = false;
    if (process.env.ELEVENLABS_API_KEY) {
      const voiceId = await cloneVoiceWithElevenLabs(portfolio.name || 'Portfolio');
      if (voiceId) {
        done = await generateIntroMp3WithElevenLabs(voiceId, portfolio.spokenIntro);
        if (done) console.log('[generate] Wrote public/intro.mp3 using ElevenLabs cloned voice.');
      }
    }
    if (!done && process.env.OPENAI_API_KEY) {
      done = await generateIntroMp3(portfolio.spokenIntro);
      if (done) console.log('[generate] Wrote public/intro.mp3 using OpenAI TTS.');
    }
    if (!done) {
      console.log('[generate] Skipped intro.mp3 (no TTS provider configured). The avatar will fall back to the browser Web Speech API.');
    }
  }

  if (process.env.HEDRA_API_KEY && fs.existsSync(path.join(publicDir, 'intro.mp3'))) {
    await generateTalkingVideoWithHedra();
  }

  console.log('[generate] Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
