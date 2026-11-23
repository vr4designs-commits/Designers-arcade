# Design Principles — the arcade in the schoolyard

**Name:** the product is called **Design Principles**. It covers UX laws, usability heuristics, Gestalt principles, cognitive biases and behavioural psychology, so use "principle" (not "law") in all UI copy. Individual items keep their real names (Hick's Law, Error Prevention…) and their category label.

A web app that shows one random UX law, heuristic, Gestalt principle, cognitive bias or psychology principle at a time. It opens on a sunny pixel-art schoolyard with a purple arcade cabinet in the middle. Pressing start zooms into the cabinet: its screen shows the law, its control deck has the joystick and buttons, and its lower panel holds the **DOWNLOAD** button that saves the cabinet with the law on it as an image. It plays like a game: for each law you answer **I KNEW IT** or **NEW TO ME**; knowing it earns points and HP, and filling the HP bar levels you up.

The cabinet runs **4 programs on floppy disks**: Design Principles (the game), Contrast Fight, Type Scale and Layout Grid. Tapping a disk in the rack ejects the current disk back to the rack, flies the new one into the drive slot next to SHUFFLE, and loads that program on the screen. With no disk in the drive, the screen shows the **Design Arcade home screen** (welcome + a menu of the 4 disks).

Mobile first, but it must look finished on desktop too.

The working prototype (single HTML file) is the source of truth for look, flow and behaviour. When this file and the prototype disagree, ask.


## Current codebase (read this first)

The repo is a working Next.js (App Router) app that wraps the finished prototype:
- `app/layout.tsx` — shell; fonts via `next/font` exposed as `--font-rubik`, `--font-silkscreen`, `--font-pixelify` (the download canvas in `arcade.js` maps plain font names to these).
- `app/page.tsx` — embeds `content/laws.json` as `<script id="laws-data" type="application/json">`, injects `app/markup.ts`, and loads `public/arcade.js` with `next/script` (afterInteractive).
- `content/laws.json` + `lib/types.ts` — the principles and their type. Saved answers are keyed by `number`, so keep numbers stable.
- `app/globals.css` — Tailwind v4 theme + utilities (no preflight; the hand-written base styles stay in charge), `@theme` tokens, then all styles. `public/arcade.js` — scene, game, tools, disks, download.
- `next.config.mjs` has `output: "export"`; `npm run preview` serves `/out`. shadcn/8bitcn are not installed yet: add them in phase 4 when buttons and popups become React components.

It already ships and works. When refactoring into the component/lib structure below, do it one piece at a time and keep behaviour identical (check phone 390×844 and desktop 1440×900 after each step). Download in the hosted app uses `navigator.share` with files on touch devices and an object-URL `<a download>` elsewhere; the artifact `downloads` capability branch only matters inside claude.ai and can be removed.

---

## Golden rules

1. **Keep it light.** No backend, database, auth or analytics. All content ships as one JSON file. Target: under 200 KB JS gzipped, first load fast on 4G.
2. **Ask before adding any dependency** not listed under Stack.
3. **Mobile first** (390 × 844), then tablet, then desktop (1440 × 900). Check all three after every phase.
4. **Tyler is the designer.** When he shares a Figma link, screenshot or pixel art, match it exactly. Use the Figma MCP tools (`get_design_context`, `get_screenshot`) before writing UI from a Figma link.
5. **No third-party IP in the art.** The mood reference is someone else's event poster (its logo, event name, sponsor and contact details). None of that ships: the marquee and screen say DESIGN PRINCIPLES, and the schoolyard is drawn from scratch.
6. **Content accuracy.** Definitions are in our own words; never copy text from lawsofux.com or similar. Every entry credits its original source.

---

## Stack

| Purpose | Choice |
|---|---|
| Framework | **Next.js (App Router) + TypeScript**, `output: 'export'` (fully static) |
| Styling | Tailwind CSS + a small global CSS file for the scene and screen effects |
| Components | shadcn/ui + **8bitcn** (https://www.8bitcn.com) for buttons and popups |
| Fonts | `next/font/google`: **Rubik** 900 italic (titles, logo), **Silkscreen** 400/700 (HUD, labels, buttons, marquee), **Pixelify Sans** 400/500/700 (body) |
| Scene | One low-res canvas (yard + cabinet body) scaled with `image-rendering: pixelated`, with HTML overlays for the marquee text, screen, deck controls and lower panel |
| Card image | Canvas 2D (draw the export directly; no html-to-image needed) |
| Sharing | Web Share API with files; `<a download>` fallback |
| Persistence | localStorage (`uxl-arcade`: score, known count, answers; `uxl-tools`: each tool's inputs), wrapped in try/catch |
| PWA (phase 5) | Web manifest + Serwist, only if it stays small |
| Hosting | Vercel |

**8bitcn:** install each component with the exact command on its docs page at 8bitcn.com. Don't guess registry URLs. Restyle to the prototype's tokens (cream keys, lime download).

**Not allowed:** a state library, an animation library (CSS transitions and keyframes only), icon packs, image CDNs, Canvas libraries.

Everything that touches `window`, `canvas` or `navigator` lives in client components (`'use client'`). The page itself can be a server component that renders the shell.

## Commands

```bash
npm install
npm run dev               # test on a phone with: npm run dev -- -H 0.0.0.0
npm run build             # static export to /out
npx serve out             # preview the export
```

---

## Project structure

```
app/
  layout.tsx            # fonts, metadata, theme-color #1c78ee, viewport
  page.tsx              # renders <ArcadeApp />
  globals.css           # tokens, screen effects, keyframes
content/
  laws.json             # all content (single source of truth)
lib/
  types.ts
  deck.ts               # random order, shuffle without repeats
  game.ts               # score, HP, level, answers, persistence (pure + localStorage)
  tools/contrast.ts     # hex parse, WCAG luminance + ratio, special move
  tools/typeScale.ts    # modular scale steps, line heights, fluid clamp(), CSS tokens
  tools/grid.ts         # column width, spans, pixel-perfect check, presets
  scene/
    layout.ts           # cabinet + yard geometry from the viewport (pure function)
    palette.ts          # sky + grass ramps, Bayer dither, cabinet purples
    drawYard.ts         # sky, clouds, floodlight, fence, wall, school, hoop, bench, bin, tiles, confetti
    drawCabinet.ts      # marquee frame + posts, body, screen bezel, deck slab, lower panel
    drawDynamic.ts      # birds, screen twinkles, corner brackets
  exportCard.ts         # 1080×1350 PNG
  share.ts              # navigator.share + fallback
components/
  ArcadeApp.tsx         # state machine: start → zooming → on
  SceneCanvas.tsx       # canvas + animation loop (~11 fps)
  Marquee.tsx           # ◆ DESIGN PRINCIPLES ◆
  AttractScreen.tsx     # logo + PRESS START
  ScreenContent.tsx     # HUD, category, title, definition, APPLY IT box, source
  ControlDeck.tsx       # joystick + EXIT / SHUFFLE arcade buttons + floppy drive
  LowerPanel.tsx        # floppy rack (4 disks) + full-width DOWNLOAD bar
  DiskSwap.ts           # eject / fly / insert animation (Web Animations API)
  tools/ContrastFight.tsx
  tools/TypeScale.tsx
  tools/LayoutGrid.tsx
  HudBar.tsx            # LV · HP segments · PTS
  AnswerButtons.tsx     # I KNEW IT / NEW TO ME
  Popup.tsx             # +100 PTS, LEVEL UP!, NOW YOU KNOW
  GameClear.tsx         # end screen + PLAY AGAIN

## Content schema

```ts
type Category = "ux" | "heur" | "gest" | "bias" | "psy";
// shown on screen as: UX LAW, HEURISTIC, GESTALT, COGNITIVE BIAS, PSYCHOLOGY

interface Law {
  id: string;        // "hicks-law"
  number: number;    // shown as LAW 014
  category: Category;
  title: string;
  definition: string; // one line, max ~100 chars
  applyIt: string;    // one practical tip, max ~80 chars
  source: string;     // "W. E. Hick & R. Hyman, 1952–53"
}
```

There are **no category filters or chips**. The deck is fully random. Start with the 28 laws in the prototype and grow to 100+ (Fitts, Hick, Jakob, Miller, Tesler, Doherty, Postel, Peak-End, Aesthetic-Usability, Von Restorff, Serial Position, Zeigarnik, Goal-Gradient, Parkinson, Pareto, Occam; Nielsen's 10; Gestalt set; common cognitive biases; cognitive load, mental models, Fogg, flow, scarcity, reciprocity…).

---

## Art direction

A bright, sunny schoolyard at recess, in pixel art, with a purple arcade cabinet front and centre.

- **Sky:** saturated blue, lighter towards the horizon, Bayer-dithered. Big chunky white clouds with pale-blue undersides. A few navy birds flapping across the top.
- **Left:** floodlight tower (purple pole, navy panel, 3×3 white lamps), chain-link fence over a purple wall, an orange bench and a blue bin on the ground.
- **Right:** purple school building with cream trim, blue windows and a clock, a tree behind it, a basketball hoop (white backboard, orange rim, white net) on a purple pole, two lime slashes painted on the wall.
- **Ground:** lime tiles in one-point perspective, darker green grout lines, scattered confetti crosses (pink, blue, white, yellow), grass tufts along the bottom.
- **Cabinet:** purple with a light left edge and dark right edge, navy outline. A marquee on two posts with lime corner brackets and **◆ DESIGN PRINCIPLES ◆** in glowing lime. Below the screen, a wider control deck slab and a lower panel.
- **Screen:** plain dark navy (no grid floor), faint twinkling dots, lime corner brackets, scanlines and a vignette. The APPLY IT box and the question row have solid navy backing panels.

### Tokens

| Token | Value |
|---|---|
| Sky ramp (top → horizon) | `#1462dc #1a72ea #2484f4 #3398fa #48abff #62bdff #7fcdff` |
| Grass ramp | `#8fd61f #9fe327 #aeee31 #bdf63f #cbfb55`, grout `#6fbf1f` |
| Outline navy | `#1d1548` |
| Cabinet purples | main `#7d4cf0`, light `#a27bff`, dark `#5a2fc0`, darker `#45219c`, lower `#6a3be0` |
| Screen | `#0b1033` |
| Lime (accent + **DOWNLOAD**) | `#c6f432`, shadow `#6f9a0f` |
| Pink (diamonds, APPLY IT) | `#ff4fae` |
| Light blue (category, box ticks) | `#5fb8ff` |
| Box border | `#2f4bd8` |
| Title shadow | `#2f5bff` then `#0b1033` |
| Arcade buttons | yellow `#ffd23a` / `#e8a10c`, red `#ff4a3d` / `#c81e1e`, joystick ball `#f02a2a` |

### Pixel scale

The canvas is drawn at `ceil(viewport / P)` logical pixels, where P = 3 on phones, 4 on tablets, 5 on desktop, then scaled up with `image-rendering: pixelated`. Recompute the layout on resize; never stretch.

### Scene layout rules (from `layout()` in the prototype)

- **Portrait** (width/height < 0.85): cabinet width = 80% of the width; screen slightly taller than wide (sw × 1.05).
- **Landscape:** screen width fits 86% of the height for the whole cabinet; screen is wide (sw × 0.62).
- Cabinet centred, bottom at 90% (portrait) / 95% (landscape) of the height. Horizon at 64% / 70%.

### Container query gotcha

An element's `cqw`/`cqh` units resolve against its nearest **ancestor** container, never itself. Every overlay (`#marq`, `#screen`, `#deck`, `#lower`) is a size container, and the content that uses cq units lives in an inner wrapper.

---

## Flow and interaction

```
START (yard) --tap / Enter--> ZOOMING (1.5s) --> ON (law on screen)
ON --EXIT button / Esc--> back to START
```

1. **Start:** the whole yard. The cabinet screen shows the attract mode: "◆ LAWS · HEURISTICS · PSYCHOLOGY ◆", the **DESIGN / PRINCIPLES** logo (white and lime, italic, with blue and navy offset shadows), "◆ 28 PRINCIPLES TO PLAY ◆", and a bordered box: "YOUR NEXT DESIGN INSIGHT AWAITS." with a blinking pink **PRESS START**. The whole viewport is the start button. A hint at the bottom says "Tap the screen to start" (touch) or "Click anywhere or press Enter to start" (hover devices).
2. **Zoom:** CSS transform on the world container, 1.5s `cubic-bezier(.72,0,.2,1)`. The target fits the screen, deck and lower panel (the marquee may be cropped): 102% of cabinet width on phones, 92% of deck width / 95% of height on desktop. Clamp the translation so the view never shows past the edge of the scene.
3. **On:** screen content turns on with a screen "power-on" effect; the deck and lower panel controls become clickable. Focus moves to I KNEW IT.
4. **HUD:** `LV 2` left, `HP` with 5 segments in the middle (pink when filled), `0500 PTS` right in lime.
5. **Screen content (centred):** "◆ COGNITIVE BIAS ◆" in light blue, title in uppercase Rubik 900 italic, definition, an APPLY IT box (pink label, tip, source in small lime capitals), then the question.
6. **The question:** "DID YOU KNOW THIS ONE?" with two buttons: **I KNEW IT** (lime fill) and **NEW TO ME** (pink outline). Each law can be answered once.
7. **Scoring:**
   - I KNEW IT → +100 PTS and +1 HP segment. Popup: "+100 PTS · HP +1 · 3 TO LV 3". The joystick tilts right.
   - Every 5 known laws → **LEVEL UP!** popup in pink, the marquee flashes, the HP bar empties and starts again.
   - NEW TO ME → no points. Popup: "NOW YOU KNOW · ADDED TO YOUR PLAYBOOK". The joystick tilts left.
   - Popups sit on a navy panel with a lime (or pink for level up) border, and the law text dims behind them.
   - About 1.1s after answering, the next random law loads automatically.
   - **Answers persist**, so on load every answered principle counts as already seen: shuffle and start only ever pick unanswered ones, and the answer buttons are always live. If everything is answered, start straight on the game-clear screen.
   - Cancel the pending auto-advance whenever the player shuffles, exits or restarts, so it can never skip a principle or leave the buttons locked.
   - The screen content scrolls if a long principle doesn't fit, so the answer buttons are always reachable.
8. **Game clear:** after every law has been seen, the screen shows "◆ ALL 28 PRINCIPLES PLAYED ◆", **GAME / CLEAR**, "YOU KNEW 17 OF 28 · LEVEL 4 · 1700 PTS", and **PLAY AGAIN** (resets score, HP and answers).
9. **Control deck:** joystick (tap = shuffle with a wiggle), yellow **EXIT** (back to the yard), red **SHUFFLE** (skip to a random unseen law, no points). There are no prev/next buttons.
10. **Lower panel:** the full-width lime **DOWNLOAD** bar with a pixel download-to-tray icon. The label changes to SAVING… then SAVED!.
11. **Changing law:** lime/pink scanline flash (280ms) and a short stepped slide.
12. **Input:** swipe on the screen = shuffle; keyboard Y (I knew it), N (new to me), Space (shuffle), D (download), Esc (exit).
13. **Reduced motion:** no zoom animation (jump), no flashes, blinking, wiggle or bouncing popups.

## Home screen and empty drive

- The app starts with **all 4 disks in the rack** and the drive empty. Marquee: **◆ DESIGN ARCADE ◆**.
- **Before start:** "◆ WELCOME, PLAYER ◆", **DESIGN / ARCADE** logo, "◆ 28 PRINCIPLES + 3 TOOLS ◆", and the PRESS START box.
- **After the zoom, with the drive empty:** "◆ WELCOME, PLAYER ◆", the logo, "EXPLORE THE TOOLS · INSERT A DISK", and a menu of 4 tiles (sticker colour, "1 · DESIGN PRINCIPLES" + one-line description). One column on phones, two on wide screens. Tapping a tile inserts that disk (same animation as tapping it in the rack).
- **EJECT button** (light lilac key with an eject icon) sits right next to the drive slot. It flies the disk back to the rack and returns to the home screen. Disabled when the drive is empty. Keyboard: E.
- **EXIT:** if a disk is loaded, eject it first (disk flies back to the rack), then zoom out to the yard. So the yard always shows the home screen with every disk in the rack.
- **Empty drive:** label under the slot reads EMPTY, LED off, DOWNLOAD reads "INSERT A DISK" and is dimmed (tapping it just wiggles the joystick). SHUFFLE / joystick inserts a random disk.

## Floppy disks

| Disk | Marquee | Sticker | Colour | Program |
|---|---|---|---|---|
| (none) | DESIGN ARCADE | — | — | home screen |
| PRINCIPLES | DESIGN PRINCIPLES | UX | `#ff4fae` | the principles game |
| CONTRAST | CONTRAST FIGHT | AA | `#5fb8ff` | WCAG contrast checker |
| TYPE | TYPE SCALE | Aa | `#ffd23a` | modular type scale |
| GRID | LAYOUT GRID | 12 | `#c6f432` | layout grid calculator |

- **Rack:** the lower panel holds 4 floppies (coloured body, grey shutter with a slot, cream sticker) with a label under each, above the DOWNLOAD bar. The loaded disk's spot shows a dashed outline and a lime label.
- **Drive:** a slot on the control deck next to SHUFFLE: dark mouth, a coloured lip showing the loaded disk, an amber LED, the EJECT key beside it, and the disk's name (or EMPTY) underneath.
- **Swap animation** (only when ON, one swap at a time):
  1. The current disk rises out of the drive (clipped at the slot line) and flies back to its rack spot (~620ms).
  2. The chosen disk lifts out of the rack, flies above the drive, shrinks to fit the slot, and slides down into it while a `clip-path: inset(0 0 x% 0)` hides the part below the slot line (~950ms). The LED blinks.
  3. The screen shows LOADING + the program name with a stepped progress bar (~700ms), the marquee changes to the program name, then the program powers on.
  - Positions come from `getBoundingClientRect()` divided by the current zoom scale, so the flight works inside the zoomed world. With reduced motion, skip the flights.
- **Keyboard:** 1–4 insert disks, E ejects.
- **SHUFFLE / joystick per program:** principles = next random principle; contrast = random colour pair; type = random body size and scale; grid = next device preset.
- **Answer buttons, popups, HP and game clear** belong to the principles program only.

## The three tools (ported from Design Quest)

**Contrast Fight** — "BOSS · CONTRAST FIGHT"
- Inputs: text colour and background, each a colour picker plus a hex field (accepts 3 or 6 digits).
- Enemy bar "LOW CONTRAST": HP = clamp((4.5 − ratio) / 3.5 × 100, 0, 100); LV = ceil(HP / 20), min 1.
- Preview box "Aa Pixel" in the chosen colours, the ratio as `4.53 : 1`, and four pass/fail chips that show their target: AA BODY 4.5, AA LARGE 3, AAA BODY 7, UI ICONS 3. (AAA body text genuinely needs 7:1, so most AA-passing pairs still fail it. That's correct, not a bug.)
- Message: <3 "The enemy laughs…", ≥3 "The enemy is wounded…", ≥4.5 "Enemy defeated! AAA needs 7:1 — hit Special move again to go for it.", ≥7 "Flawless victory…".
- **Special move:** a two-stage move. Below 4.5:1 it targets AA (4.5); from 4.5 to 7 it targets AAA (7); at 7+ it says "Already AAA". It mixes the text colour toward black and toward white in 1% steps and takes whichever reaches the target with the smaller change. If neither can (e.g. AAA on a mid-grey background), it says so and suggests a darker or lighter background.
- **Swap** text and background. **Copy** puts a one-line result on the clipboard.
- Button labels never carry "A ·" / "B ·" prefixes.
- Luminance and ratio follow WCAG 2.x (sRGB linearisation with 0.03928, (L1 + 0.05) / (L2 + 0.05)).

**Type Scale** — "FORGE · TYPE SCALE" (kept deliberately simple: two choices, no jargon)
- **BODY TEXT SIZE:** 4 buttons — 14PX, 16PX (default), 18PX, 20PX.
- **HOW MUCH BIGGER EACH HEADING GETS:** 4 buttons — SUBTLE ×1.2, BALANCED ×1.25 (default), BOLD ×1.333, DRAMATIC ×1.5.
- The list shows H1–H5, BODY, SMALL, TINY with the rounded px size and a "Level up" sample. Two columns on wide screens.
- Behind the scenes (not shown as options): line height = clamp(1.6 − step × 0.1, 1.1, 1.6); headings are fluid from 360px to 1440px and shrink to 80% on mobile (never below body size); body and smaller are fixed rem.
- **Copy CSS tokens** copies `:root{ --fs-h1: clamp(…); --lh-h1: …; … }`. A small note says headings shrink a little on mobile.
- SHUFFLE picks a random size and scale.

**Layout Grid** — "MAP · LAYOUT GRID"
- Presets: Desktop 1440/12/24/80, Tablet 1024/8/20/40, iPhone 390/4/16/20, Android 360/4/16/16 (frame / columns / gutter / margin). The matching preset is highlighted.
- Inputs: frame px, columns 1–24 (slider), gutter px, margin px.
- Column width = (frame − 2·margin − (columns − 1)·gutter) / columns. Status: TOO TIGHT (≤0), PIXEL PERFECT (whole number) or SUB-PIXEL.
- Preview strip with pink columns at true proportions, the column width in big type, then content width and spans 6 / 4 / 3.
- **Copy spec** copies a one-line summary.

All tool inputs use 16px real text (no iOS zoom), are real labelled form controls, and save to localStorage. Only the principles program has swipe-to-shuffle, so range sliders can be dragged on touch screens.

### Focus and scrolling gotcha

Focusing an input can scroll ancestors even when they have `overflow: hidden`, which shifts the whole zoomed scene. Keep the world container `position: fixed`, reset any window scroll, and reset `scrollTop/scrollLeft` on the screen, deck, lower panel and marquee overlays. Only the tool panels themselves may scroll (vertically) when content is taller than the screen.

### Sizing text inside the zoomed screen

Overlays live inside the transformed container, so they scale with the zoom. Size with container units, capped by real pixels divided by the zoom factor:

```css
h1 { font-size: min(8.4cqw, calc(52px / var(--z))); }
```

`--z` is the target zoom factor, set on the container from JS. In landscape the attract screen also caps by height (`min(15cqw, 22cqh)`) so it fits a short, wide screen.

---

## Sound and haptics

- Chiptune sound effects synthesised live with Web Audio (square/triangle voices + filtered noise), in the `FX` block near the top of `public/arcade.js`. No audio files, no library. Master volume is low (0.16).
- Every click and reveal has a sound and a vibration pattern: coin-in + zoom whoosh on start, power-on arpeggio, joystick ratchet on shuffle, sparkle when a new principle or tool result appears, pick-up on I KNEW IT, fanfare on LEVEL UP, a soft two-note "hmm" on NEW TO ME, a victory jingle on game clear, eject / lift / clunk / drive-seek / boot for the disks, special move, swap, copy, saving / saved, a low buzz when something can't be done, and throttled ticks for sliders and typing.
- The auto-advance after answering plays only the reveal, not the joystick sound.
- Haptics: `navigator.vibrate` (Android). iOS has no vibrate API, so on iOS 18+ Safari a hidden `<input type="checkbox" switch>` is toggled inside the tap to get a light system tick (only within a user gesture, so delayed events like the disk landing don't tick on iPhone).
- One toggle controls both: the pixel speaker button `#snd`, fixed top-right outside the zoomed world, or key **M**. Saved in localStorage `uxl-sound` (on by default). Audio unlocks on the first tap or key press.

## Download

- Draw a 1080 × 1350 (4:5) PNG on a canvas: dithered sky, clouds, lime ground, the marquee with the loaded program's name, the purple cabinet filling the frame, the law on the navy screen (HUD, category, title, definition, APPLY IT box), the joystick, the yellow and red buttons and the drive (lip in the disk's colour) on the deck, and the source on the lower panel.
- For the tools, the screen shows the tool's result instead: Contrast = colour preview, ratio and the 4 chips; Type = all 8 steps with samples; Grid = the column strip, column width, status and a 6-cell spec table. The lower panel shows a one-line summary.
- Wait for `document.fonts.load(...)` for all three fonts before drawing.
- **Pre-render** the PNG (as a Blob) about 400ms after each new law appears, so a tap saves instantly.
- On tap, save the file straight to the device:
  - **Mobile:** if `navigator.canShare({ files: [file] })`, call `navigator.share({ files: [file] })` — on iPhone, "Save Image" puts it in Photos. Safari only allows this right after a tap, which is why the Blob must be ready already.
  - **Desktop and everything else:** an `<a download>` link with an object URL.
  - File names: `design-principle-014-default-effect.png`, `contrast-fight-7a8a99-on-ffffff.png`, `type-scale-16-1.25.png` (the image shows each step as name + px), `layout-grid-1440-12col.png`.
- Show SAVING… / SAVED! on the button. No dialog in the real app.
- (The claude.ai prototype uses the artifact `downloads` capability instead, because the preview frame blocks normal downloads.)

## Accessibility

- All controls are real `<button>`s with labels; 44px minimum hit area (each arcade button includes its label in the hit area).
- Popups use `aria-live="assertive"`; answer buttons are disabled after answering.
- The canvas is `aria-hidden`; law text is real HTML with `aria-live="polite"`.
- Visible focus rings; move focus to I KNEW IT after zoom and to PLAY AGAIN on the clear screen, back to the start button after exit.
- Contrast: white and lime text on `#0b1033`.

---

## Build phases

0. **Setup:** Next.js + TS + Tailwind, static export, fonts, shadcn + 8bitcn, port tokens to `globals.css`.
1. **Content:** `laws.json` + types + `deck.ts` + `game.ts` (with unit tests for scoring and level-up).
2. **Scene:** port `layout`, `drawStatic`, `drawScreen` and `frame` from the prototype into `lib/scene`, split into `drawYard`, `drawCabinet` and `drawDynamic`. Check portrait, landscape and resize.
3. **Flow:** start → zoom → on → exit state machine, attract screen, overlays positioned from the layout.
4. **Content, game, disks, tools and controls:** marquee, screen content, HUD, answer buttons, popups, game clear, control deck, lower panel, shuffle, swipe, keyboard, screen effects.
5. **Download:** export canvas, pre-render, share sheet, fallback, dialog.
6. **Polish and ship:** reduced motion, metadata and OG image, optional PWA, deploy to Vercel, test on a real iPhone (Safari) and desktop Chrome/Safari.

Work one phase at a time and run `npm run build` at the end of each.
