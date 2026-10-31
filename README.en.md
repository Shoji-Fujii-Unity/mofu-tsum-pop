# MOFU TSUM POP

[日本語](README.md) | [English](README.en.md) | [简体中文](README.zh-CN.md)

A mobile-first matching puzzle game where you connect **2 or more** fluffy mascots to pop them.
No build or server is required: just open `index.html` in a browser.

> This is an original game featuring original characters. It is not affiliated with Disney or any other existing characters or trademarks.

---

## Getting Started

```
Double-click mofu-tsum-pop/index.html (or drag it into your browser)
```

- No external image or audio assets are used. Characters and sounds are generated at runtime.
- The game works offline (Google Fonts is loaded from a CDN; system fonts are used automatically if loading fails).
- Recommended: play on a smartphone in portrait orientation. It also works on PC, with a phone-style frame centered on the screen.

---

## How to Play

| Action | How |
|---|---|
| Pop mascots | Drag through mascots of the same color to connect them (2 or more). You can also tap one to pop all connected mascots of that color |
| Special | When the gauge is full and the Special button glows, tap it to clear all mascots of the most common color |
| Fever | Activate when the gauge is full. For a while, most of the board becomes the same color, and large chains score ×2 |
| Time | Popping mascots adds time. Clear the score target and mission before time runs out to complete a stage |
| Coins | Earn coins from your score. When time runs out, spend coins to continue (+15 seconds); the cost increases with each use |
| Keyboard (PC) | `Space` = Special / start, `Esc` = pause |

- There are **15 stages**. Earn ★1–3 by reaching 100% / 145% / 200% of the target.
- Example missions: “Connect 4 or more mascots at once,” “Get a 5+ combo,” and “Activate Fever once.”
- If no matching mascots can be connected, the board shuffles automatically.

---

## Languages, Sound, and Save Data

### Languages
- Supports **日本語 / English / 简体中文**.
- The browser language is detected at startup. Change the language from the buttons at the top of the title screen or in Settings at any time; your choice is saved.
- Missing translations are checked by the automated test (`i18n:` entries in `dev/cdp.js`).

### Sound On/Off
- Use the speaker icon at the top-right of the title screen to turn all sound effects and music on or off.
- In Settings, turn **sound effects (SE)** and **music (BGM)** on or off independently and adjust their volume with sliders.
- Audio is synthesized in real time using the Web Audio API; pitches rise with chain length.
- On mobile, AudioContext is resumed on user interaction to comply with autoplay restrictions.
- Vibration feedback (`navigator.vibrate`) is available on supported devices.

### Save Data (Local)
- `localStorage` key: **`mofutsumpop.save.v1`**
- Saved data: language, SE/BGM settings and volume / coins / unlocked stages / each stage's high score and stars / overall high score, longest chain, highest combo, Fever count, and play count
- Progress persists after closing the browser. If `localStorage` is unavailable (such as in some private browsing modes), the game automatically switches to in-memory storage and remains playable.
- To reset: Settings → Delete Data (confirmation dialog).

---

## Screen Layout (Portrait)

- The app area is up to 470px wide and fills the available height. It uses the full screen on phones and a centered phone-style frame on PC.
- The board is **7 columns × 8 rows**. The canvas is recalculated for `devicePixelRatio` for sharp rendering on Retina displays.
- Automated tests check that the board fits on screens from 320×568 (small phones) to 1280×860 (PC).
- Supports safe areas (notches); pinch zoom and scrolling are disabled.

---

## File Structure

```
mofu-tsum-pop/
├─ index.html        … Screen layout (title / stage selection / game / dialogs)
├─ css/style.css     … Design (pastel Candy UI, buttons, HUD, dialogs)
├─ js/i18n.js        … Japanese, English, and Chinese dictionaries and language switching
├─ js/audio.js       … Web Audio synthesis (12 sound effects + looping BGM), on/off and volume
├─ js/store.js       … localStorage saves (type guards, fallback, reset)
├─ js/art.js         … Draws 8 mascots with Canvas2D procedural graphics + particles
├─ js/levels.js      … 15 stage definitions, star ratings, coin calculations and costs
├─ js/game.js        … Board logic (input / chains / falling / refill / Fever / Special / scoring)
├─ js/app.js         … Integrates screen transitions, HUD, dialogs, and saves
└─ dev/cdp.js        … Automated smoke tests with Headless Edge + CDP
   dev/shots/*.png   … Screenshots captured by the tests
```

All `<script>` tags are regular scripts (not ES modules), so the game works when opened directly via `file://`.

---

## Automated Tests

```
cd mofu-tsum-pop
node dev/cdp.js
```

The test uses CDP to control Headless Edge (or Chrome). Logs are written to `dev/cdp-log.txt`, and screenshots to `dev/shots/`.

- No JavaScript exceptions or `console.error` messages
- Language switching (JA/EN/ZH) and missing translation key checks
- Title → stage selection → start → chain with real mouse input → Special → Fever → pause → results
- Failure → continue with coins (coin deduction, +15 seconds, and increased cost)
- Data deletion flow and save persistence after reload
- Board size and overflow checks at 320×568 and 1280×860
- Long-running auto-play (checks for cell and particle leaks)

---

## Technical Notes

- Rendering uses a single `<canvas>`. Eight mascot types (different ears, faces, and colors) are generated in advance as 128px offscreen sprites, then drawn with scaling and squash/stretch effects.
- Mascots fall using cell-based velocity integration (gravity + landing bounce). New mascots appear from above; some copy neighboring colors to make chains easier.
- Scoring: `n(n+1)/2 × 5 × size bonus × combo bonus × Fever×2` (`n` = chain length). Growth slows beyond 20 mascots, and each pop is capped at 9,000 points to prevent huge chains during Fever from dominating.
- Combos continue when the next pop happens within 3 seconds. They are shown in the HUD and as floating text over the board.
- A deadlock check (looks for adjacent mascots of the same color) triggers an automatic shuffle.
- Performance target: around 60 fps with 56 cells and particles; rendering primarily uses `drawImage` with pre-generated sprites.
