# Ultimate Horse Chicken

A build-it-then-race-it party platformer for friends, made with the **Phaser 3** game engine (v3.90, Arcade Physics).

## Play it

- **Quickest:** open `dist/ultimate-horse-chicken.html` in Chrome, Edge or Firefox. Everything is inside that one file.
- **From this folder:** run `npm start` and open http://localhost:3000.

## Put it online (GitHub + Render, same as Overdrive)

1. Upload this whole folder to a GitHub repo (or a folder inside one).
2. On Render: **New → Web Service**, pick the repo.
3. Settings: **Build command** `npm install` · **Start command** `npm start` · if the game sits in a sub-folder, set **Root Directory** to that folder.
4. When it says **Live**, the link at the top is the game.

No packages need installing — Phaser is already included in `public/vendor`.

## Controls

| | Keyboard 1 | Keyboard 2 | Controller |
|---|---|---|---|
| Move | A/D or ←/→ | J/L | Stick / D-pad |
| Jump / confirm | Space | Right-Shift | A |
| Interact / place | E | Enter | X |
| Rotate | R (or mouse wheel) | . | Y |
| Undo / delete | Q | , | B |
| Change item (editor) | Z / X | [ / ] | LB / RB |
| Test level (editor) | Tab | \\ | Back |
| Pause | Esc | ` | Start |

Keyboard 2 joins by pressing **Enter** in the treehouse; each controller joins by pressing **A**. Up to 8 players. Every key can be rebound in Settings → Controls.

**Wall climbing:** jump at a wall, keep holding towards it and keep tapping jump. Each bounce kicks you a little away from the wall and a little higher, so you can scale it. Jumping off a wall while holding away (or nothing) gives a big kick for crossing between walls. The outer edges of a level can't be climbed.

## Project layout

| File | What it does |
|---|---|
| `public/index.html` | Page, menus' styling, loads Phaser + the game scripts |
| `public/vendor/phaser.min.js` | Phaser 3.90 (Arcade Physics build) |
| `js/01–03` | Save data, input (keyboard + controllers), synthesised sound |
| `js/04_art.js` | Character, hat and prop artwork (baked into textures at start-up) |
| `js/05_items_*.js` | All 29 placeable items: shapes, behaviour, hazards |
| `js/06_maps_*.js` | 16 maps, backgrounds and map mechanics (wind, lava, tide…) |
| `js/07_logic.js` | The game model: solids, hazards, placement rules, bombs |
| `js/07_textures.js` | Turns the artwork into Phaser textures, spritesheets and animations |
| `js/08_*.js` | Phaser world: Arcade bodies, player controller, item sprites, particles |
| `js/09_*.js` | Camera rig, split-screen cameras, HUD scene, challenge-course generator |
| `js/10_match_*.js` | Party / Creative: pick → build → race → results → winner |
| `js/11_*.js` | Achievements, Challenge scene, Free Build editor scene |
| `js/12_lobby_*.js` | The treehouse lobby scene |
| `js/13_main.js` | Phaser game config, scene flow, transitions, pause |
| `js/14_ui_*.js` | Menus (settings, rules, wardrobe, community shelf…) |
| `server.js` | Tiny web server for Render (online play will be added here) |
| `tools/build-single.js` | `npm run build` → rebuilds the one-file version in `dist/` |

Progress, stats and saved levels are stored in the browser on each device.
