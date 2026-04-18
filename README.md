# Ranga Portfolio — AI Talking-Avatar Portfolio

A resume + a photo in, a polished portfolio website with a talking-avatar hero out. The hero speaks the person's intro in first person ("Hi, I'm Ranga. I have 5 years of experience..."). Static-exportable, so it deploys free to **GitHub Pages**.

> **MVP philosophy:** ships free out of the box using the browser's Web Speech API + an animated photo. Drop in paid API keys later to upgrade to a photoreal D-ID avatar with OpenAI-quality TTS — no code changes elsewhere.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

## Regenerate from a real resume + photo

1. Drop the source files into `input/`:
   - `input/resume.pdf` (or `.docx`, `.txt`, `.md`)
   - `input/photo.jpg` (or `.png`, `.webp`)
2. Run the generator:

```bash
npm run generate
# optional: OPENAI_API_KEY=sk-... npm run generate   # higher-quality extraction + intro.mp3
```

This updates `data/portfolio.json` and copies the photo to `public/`.

## Upgrading the avatar to photoreal (optional)

The `TalkingAvatar` component supports three providers:

| Provider    | Cost            | Setup                                                                                      |
| ----------- | --------------- | ------------------------------------------------------------------------------------------ |
| `webspeech` | Free (default)  | No setup — uses the browser's built-in synthesizer                                         |
| `openai`    | ~$0.015/min     | `OPENAI_API_KEY=... npm run generate` drops `public/intro.mp3`, then set `provider="openai"` |
| `did`       | D-ID API rates  | Generate a talking MP4 of the photo separately, save as `public/intro.mp4`, set `provider="did"` |

Change the provider in `components/Hero.tsx` where `<TalkingAvatar … />` is rendered.

## Deploying to GitHub Pages

1. Create a new GitHub repository (e.g. `ranga-portfolio`).
2. Push this folder to it:

```bash
git init -b main
git add .
git commit -m "Initial portfolio"
git remote add origin https://github.com/<you>/ranga-portfolio.git
git push -u origin main
```

3. In the repo **Settings → Pages**, set **Source: `GitHub Actions`** — **not** “Deploy from a branch”. (Branch mode looks for `index.html` at the repo root; this app is built by CI into `out/`.)
4. The workflow at `.github/workflows/deploy.yml` builds and deploys on every push to `main`.
   Your site will appear at `https://<you>.github.io/ranga-portfolio/`.

> The `basePath`/`assetPrefix` in `next.config.mjs` is automatically set when the workflow runs.

## Project structure

```
app/                 Next.js App Router pages (layout, home)
components/          UI components
  TalkingAvatar.tsx  The speaking-avatar widget (provider-pluggable)
  Hero.tsx  ...etc.
data/portfolio.json  The generated structured data
input/               Drop resume + photo here
public/              Photo, favicon, and optional intro.mp3 / intro.mp4
scripts/generate.mjs Resume + photo -> portfolio.json + intro.mp3
.github/workflows/   GitHub Pages deployment
```

## License

MIT — do what you want; a little credit is appreciated.
