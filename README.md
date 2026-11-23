# Design Arcade

A pixel-art arcade for designers. Press start in the schoolyard, zoom into the cabinet, and insert a floppy disk:

- **Design Principles** — 28 UX laws, heuristics and psychology principles as a quiz with HP, points and levels
- **Contrast Fight** — WCAG contrast checker with a two-stage "special move" (AA, then AAA)
- **Type Scale** — pick a body size and a scale, copy ready-made CSS tokens
- **Layout Grid** — exact column widths for any frame, with device presets

Every screen can be downloaded as a 1080 × 1350 image of the cabinet.

Built with Next.js (App Router) as a fully static export, with Tailwind CSS. No backend, no database: progress is saved in the browser.

## Run it locally

You need Node.js 18.18 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000. To test on your phone, run `npm run dev -- -H 0.0.0.0` and open your computer's local IP address on port 3000 from the phone (same Wi-Fi).

Production check:

```bash
npm run build     # static export to /out
npm run preview   # serves /out (npx serve out)
```

## Push to GitHub

Create an empty repository on GitHub (no README), then:

```bash
git init
git add .
git commit -m "Design Arcade"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/design-arcade.git
git push -u origin main
```

## Host on Vercel

1. Go to vercel.com → **Add New… → Project**.
2. Import the `design-arcade` repository. Vercel detects Next.js automatically; keep the default settings.
3. Click **Deploy**. Every push to `main` redeploys.

Or from the terminal: `npm i -g vercel`, then `vercel` (preview) and `vercel --prod` (live).

## Where things live

| File | What it does |
|---|---|
| `app/layout.tsx` | Page shell, title and description, fonts via `next/font` (Pixelify Sans, Rubik, Silkscreen) as CSS variables |
| `app/page.tsx` | Renders the markup, embeds `content/laws.json` for the script, and loads the arcade script |
| `content/laws.json` | All the principles (single source of truth) |
| `lib/types.ts` | The `Law` type |
| `app/markup.ts` | The HTML for the cabinet overlays, screens, tools, disk rack and controls |
| `app/globals.css` | Tailwind (theme + utilities, no preflight), design tokens, and all styles |
| `public/arcade.js` | Everything that moves: the pixel scene, zoom, disks and drive, the principles game (reads the embedded JSON), the three tools, and the image download |
| `CLAUDE.md` | Full spec for Claude Code (design tokens, flows, tool maths, rules) |

### Common edits

- **Add or edit principles:** edit `content/laws.json`. Each entry has `id`, `number`, `category` (`ux`, `heur`, `gest`, `bias`, `psy`), `title`, `definition`, `applyIt` and `source`. The principle counts on screen follow the file automatically. Keep `number` stable: saved answers are keyed by it.
- **Rename the arcade:** search for `DESIGN ARCADE` in `public/arcade.js` and `app/markup.ts`.
- **Colours:** the CSS variables at the top of `app/globals.css` and the colour constants (`PU`, `PL`, `SKY`, `GRASS`…) in `public/arcade.js`.

## Download behaviour

- **Phones:** opens the share sheet with the PNG (on iPhone, "Save Image" puts it in Photos).
- **Desktop:** downloads the PNG straight away.

Keyboard: Enter to start, 1–4 insert disks, E eject, Y / N answer, Space shuffle, D download, Esc exit, M sound on/off.

## Sound and haptics

Every click and reveal has a chiptune sound (synthesised with Web Audio, no audio files) and a vibration on phones that support it. The speaker button in the top-right corner (or M) turns both off.
