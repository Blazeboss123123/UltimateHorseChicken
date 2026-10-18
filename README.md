# Ultimate Horse Chicken

A build-it-then-race-it party platformer for friends, made with the **Phaser 3** game engine (v3.90, Arcade Physics).

## Play it

- **Online with friends:** open your Render link. One person presses **Host a game** on the title screen and gets a 6-letter **game code** (or copies the invite link from the bar at the bottom of the treehouse). Friends type the code under **Join**, or just open the invite link. The host picks the map; everyone plays on their own device. Up to 8 players.
- **On one computer (couch):** press **Play on this computer** — extra players join with Keyboard 2 or controllers.
- **Offline copy:** `dist/ultimate-horse-chicken.html` runs straight from a file (couch play only — online needs the server).
- **From this folder:** run `npm start` and open http://localhost:3000.

## Put it online (GitHub + Render, same as Overdrive)

1. Push this folder to a GitHub repo.
2. On Render: **New → Web Service**, pick the repo (or **New → Blueprint**, which reads `render.yaml`).
3. Settings: **Runtime** Node · **Build command** `npm install` · **Start command** `npm start` · if the game sits in a sub-folder, set **Root Directory** to that folder.
4. When it says **Live**, the link at the top is the game. Every push to the repo redeploys it.

No packages need installing — Phaser is included in `public/vendor` and the server (including its WebSocket code) has no dependencies. Free Render servers sleep when nobody is playing; the first visit can take up to a minute while it wakes up.

### How online play works

The server (`server.js`, `server/`) serves the game and keeps the rooms: it hands out game codes and passes messages between the players in a room. The **host's browser runs the match rules** — it rolls the items, decides whose turn it is, handles time-outs and decides when a race ends — and sends those decisions to everyone. Each player's own browser moves their own character and streams its position to the others, so movement always feels instant. If the host leaves, the game ends for everyone; if a guest leaves mid-match, the match carries on without them. Party and Creative modes are online; Challenge and Free Build are on-this-computer modes.

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
| `js/15_online.js` | Online play: connecting, game codes, syncing players and match events |
| `js/16_title.js` | The title screen (host / join with a code / play on this computer) |
| `server.js` | Web server + online rooms (`/ws`) for Render |
| `server/ws.js`, `server/rooms.js` | Dependency-free WebSocket server and the room / game-code logic |
| `render.yaml` | One-click Render setup |
| `tools/build-single.js` | `npm run build` → rebuilds the one-file version in `dist/` |

Progress, stats and saved levels are stored in the browser on each device.
