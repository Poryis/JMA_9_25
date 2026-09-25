# Jelly of the Month Club Music Academy (JMA) — PRD

## Latest (Jun 2026): **Electric guitar v10 — pitch by neck position, less wash** — Per user: on the drawn guitar, x-position picks the pitch: nut (x≈894, headstock side/right) = lowest, bridge (x≈163, left) = highest (`zoneAt` splits [BRIDGE_X, NUT_X] into 11 note zones or 6 chord zones; y must be within 392–522). Click = play, drag = glide through zones. Chords reordered by root pitch everywhere (pads + keys 1–6): Em F G Am C Dm. Every new guitar hit `release()`s the previous guitar voices (0.12 s fade) and guitar hits use a short `ring` (1.6–1.8 s exponential decay) instead of 3.5 s, killing the overtone pile-up. Pick shows a note/chord label bubble (e.g. "Am5") and the matching pad depresses while the finger is down. Removed per-string bands, selectedChord/notePos concepts and the white selection outline. Pads still hold/release as before.

## Jun 2026: **Electric guitar v9 — strummable strings + pick, new defaults, decluttered** — Per user: defaults are **Notes mode + Crunch tone**. Pads are now *selectors that also play*: chord pad → sets `selectedChord` (white outline) and strums; note pad → sets `notePos` (which 6 pentatonic notes the strings play, clamped to idx ≤ 5) and plays. **Strum zone** on the drawn guitar: pointer down/drag on the SVG maps to viewBox coords via `getScreenCTM().inverse()`; 6 string bands (top y 428, gap 11.4, zone x 150–480 / y 404–508 in viewBox space). Crossing bands plays every string passed (fast swipe = strum, slow = arpeggio), each string voice rings out (3.5 s) and is re-triggered per string. Crunch chord strums use a 6-string power voicing (root/5th/oct ×2 octaves). A yellow **Pick** (`PICK_PATH`) follows the finger while dragging; tapping a chord pad fires an auto pick sweep (`sweepId` keyed motion.g, 0.36 s). 11 notes now: A C D E G A C D E **G A** (added 784/880 Hz). Keyboard: notes 1–9,0,- ; chords 1–6; Q/W tone; Z/X mode (hints removed from UI). Removed: roman numerals, key hints, string-count dots, footer help text, POWER CHORDS badge. Guitar SVG enlarged to h-44 / md:h-64. Bug note: user's "not playing" report resolved on refresh and works on other devices — no code cause found (likely stale bundle / hot-reload state).

## Jun 2026: **Electric guitar v8.1 — strap removed, strap pins kept, cheap frame swap** — Strap fabric erased from all 3 traced frames pre-trace (scipy body-mask: flood-fill cream body → dilate 6px → erase non-body pixels in strap regions, repaint outline band black). Two `StrapPin` SVG groups (grey shank + cap, black outline) placed at the horn (427,392, -42°) and lower bout (157,814, 150°) in un-rotated guitar coords. Perf: all 3 frames now stay mounted (`GuitarFrame` memo) and strum just toggles `display` — no more re-parsing ~100 KB of SVG innerHTML 8× per strum (that main-thread stall was the likely cause of "controls stopped working" on slower/touch devices; desktop audio start/stop verified via AudioBufferSourceNode instrumentation: 6 voices start per chord, all released on pointer-up/key-up).

## Jun 2026: **Electric guitar v8 — user's actual hand-drawn guitar, vector-traced** — User rejected the hand-coded Tele SVG (v7) as "SOOO far afield" from their drawings. Replaced with the user's own artwork (`Guitar 1.webp` idle + `Guitar Strum1/2.webp` strum frames) auto-traced to SVG paths via `vtracer` (1000px source, ~70–130 KB per frame) and stored in `components/guitarFrames.js` (`GUITAR_VIEWBOX`, `GUITAR_ROTATE`, `GUITAR_FRAMES`). `GuitarArt` renders the paths inside `<g transform="rotate(44 500 445.5)">` so the diagonal drawing lays horizontal (headstock right), with a computed tight viewBox; vector so it scales crisply at every resolution (the user's explicit reason for not using raw PNGs). Strum = flip frames 1↔2 every 75 ms for ~0.5 s then back to idle (works for chords and single notes). Old per-string wobble / SkullKnob / GuitarStrings code removed. To re-trace new art: `pip install vtracer` → `vtracer.convert_image_to_svg_py(...)` → regenerate guitarFrames.js.

## Feb 2026 (superseded): **Electric guitar v7 — Telecaster cartoon body based on user reference sketch** — Rewrote `GuitarStrings` SVG component using the user's cartoon-guitar reference. Horizontal Tele silhouette: cream body (#F5EFDD) with single-cutaway shape + 3px chunky black outline, wooden tan fretboard (#B8956F) with 7 frets + 2 inlay dots, red Tele paddle headstock (#D62828), 6-inline tuning pegs (chrome caps + side wings, staggered zigzag), white pickguard with black outline, chunky black humbucker pickup with 6 pole pieces, bridge saddles with per-string metal blocks, output jack notch. Added two SVG **skull knobs** on the pickguard (cartoon skulls with eye sockets + jaw slit) matching the reference. **Black leather strap fragment** coming off the upper horn (partial arc + strap peg dot). Strings run 2 segments: static peg-to-nut convergence line (thin) + animated nut-to-bridge line (thicker, wobbles on strum). Background swapped from dark walnut to a warm cream gradient so the whole guitar reads as one cohesive cartoon illustration. viewBox 500×200, `preserveAspectRatio="xMidYMid meet"` so shape stays consistent across viewports.

## Feb 2026: **GarageBand-style electric guitar — Jam Session Stage 1 (deprecated)** — Added `components/GuitarInstrument.js`, initially with Web-Audio-synthesized (Karplus-Strong) audio. Replaced in Stage 2 above. Two modes toggleable at top: **Chords** (6 fat pads in A minor diatonic — Am · Dm · Em · G · C · F, each strummed as 6 KS voices with 25 ms per-string offsets so it reads as a real down-strum) and **Notes** (9-note pentatonic strip locked to A minor so kids can't hit a wrong note). **Tone toggle** (Clean / Crunch): Clean = 5.2 kHz LP for jangly surf/pop; Crunch = hyperbolic WaveShaper (k=400, 4× oversample) → 3 kHz LP for rock lead. Karplus-Strong plucked-string synthesis with 0.996 damping — cheap, authentic. Routes into the parent's masterNode via `getAudioGraph` so MP3 recorder captures it automatically. Sampled-audio migration path documented inline (swap `pluckChord()` for a one-shot buffer load from `assets/audio/guitar/{chord}.mp3` per chord). `FreePlayPage.js` INSTRUMENT_TABS updated + new `activeTab === 'guitar'` render branch. Placement: Stage 1 = Jam Session only; Beat Lab wiring deferred to Beat Lab rework.

## Latest (Feb 2026): **Scroll-collapsing back button (harp shield tucks away below the fold)** — `components/GameUI.js` `GameHeader` now listens to `window.scroll` and toggles a `collapsed` state at `scrollY > 24`. When collapsed, the harp / CRT shield inside the back-button motion.button is wrapped in an `AnimatePresence` and exits with a spring-tucked height + opacity + scale animation, leaving only the "BACK" text pill — which simultaneously grows its padding (8 → 12 px), font-size (10 → 12 px), and gains a soft drop-shadow so it stays tap-friendly on its own. At scroll top the shield returns with the reverse animation. Applies globally to every page using `GameHeader` (every game, JMAtv, lessons, etc.) so no per-page changes were needed. Verified: at y=0 back-button height 94px w/ 80px shield; at y=240 back-button collapses to 20px w/ shield removed from DOM; scrolling back to top restores the 80px shield.

## Prior (Feb 2026): **JMAtv phone-portrait logo stacking** — On viewports below the Tailwind `md` breakpoint (768px, i.e. phone-portrait), the JMAtv channel bug is lifted OUT of the CRT screen and rendered as a proper page header ABOVE the CRT (`clamp(120px, 42vw, 200px)` with drop-shadow + soft yellow glow). Desktop/tablet keeps the original in-screen bug at top-right (`hidden md:block` on the in-CRT img, `md:hidden` on the stacked header). Verified via DOM measurements: phone 390×844 renders stacked logo at y=96 above CRT at y=279 (`logo_above_crt=True`); desktop 1400×900 hides the stacked logo and shows the in-CRT bug. `pages/JMAtvPlayerPage.js`.

## Latest (Feb 2026): **Beat Lab canonical track order + Sight Reading tier rename + Clear-button width** — `LoopStudioPage.js` now sorts `activeTracks` through a `sortTracks` helper keyed on `TRACK_PRESETS` position so the deck always reads bells (Do → Re → Mi → Fa → So → La → Ti → High Do) → drums (Kick / Snare / Hi-Hat / Crash) → scratches (Pull / Push / P/P), regardless of the order kids tap `+ Add` chips or the order preset patterns dump tracks. Applied to initial state, `addTrack`, and `loadPreset`. Verified: adding `scratch_pull, bells_HC, drum_crash, bells_D` in that reversed order still renders `bells_C, bells_D, bells_E, bells_G, bells_HC, drum_kick, drum_snare, drum_hihat, drum_crash, scratch_pull`. Sight-Reading Sprint tiers renamed to Easy / Medium / Hard / Wizard (⚡ VERY HARD retained on Wizard) — internal LEVELS keys (`cadet/pro/master/wizard`) kept identical so existing best-score localStorage + achievement-tier mapping stay intact. Beat Lab Clear button changed from `w-9 h-9` fixed square (text overflowed the box) to `h-9 px-3` auto-width pill; measured `clear_text_fits_inside_button=true`.

## Prior (Feb 2026): **Beat Lab latency trim — deferred audio preload + memoized mascots** — `useAudio.js` moved the app-wide `preloadAudio()` off the mount critical path: instead of firing 26 fetch+decodeAudioData ops synchronously in a mount `useEffect` (one of the biggest first-tap latency contributors on mobile Beat Lab), preload now runs inside `requestIdleCallback` with a `setTimeout(250)` Safari fallback. Same buffers, same guarantees — decoded well before the first user gesture (kids can't hear anything before tapping the app-wide "Tap to Start the Music" gate anyway), just no longer competing with initial paint. In `LoopStudioPage.js`, the two full-color mascots (`charlie-rundmc.png` on the drum kit, `sharky-hiphop.png` on the turntable) were extracted into module-scope `React.memo` components (`CharlieMascot`, `SharkyMascot`), driven only by `{ isPlaying, bpm }`. Before, both `motion.img` subtrees reconciled every ~150ms during playback because `currentStep` + `activeHits` state changes forced the whole page to re-render. Now they only re-render on real prop changes (play/stop toggle, BPM adjust). Verified via automated smoke: play button toggles STOP, both mascots render exactly once, "Beat Builder Cadet" rank-up modal appears on first play (proves audio + state + progression all wired).

## Prior (Feb 2026): **Beta punch-list pass — Sneaky Note case-file card, Stew Kazoo win route, Robot Boogie arcade title, landscape crops, iPad unmute** — Sneaky Note "Bonus Mode" card in Detective menu redesigned as a dark-navy "case file" (dashed purple border, tape corner, red "CASE FILE" stamp, purple-gradient magnifier badge) so it visually reads as a separate mechanic, not an extra difficulty. `SimonSaysPage` post-level-8 win now routes back to `/simon-says` (Stew's own difficulty menu) instead of `/`. `RobotBoogiePage` swapped its custom chrome `RobotBoogieTitle` for the standard `"ROBOT BOOGIE"` string title so it renders through `GameHeader`'s arcade-marquee treatment like every other game. Robot Boogie active-band cropping fixed: `minHeight` clamped 150–220px, `maxHeight` uses `clamp(200px, calc(100vh - 260px), 640px)` so short landscape phones (~375px tall) don't clip characters. Beat Lab landscape back-button overlap fixed by bumping `main` padding to `pt-24 md:pt-28` and adding a `safe-area-inset-left` margin on the deck so the fixed back-pill can't collide with the PLAY transport button. JMAtv `JMAtvPlayerPage` now starts every episode with `autoplay=1&muted=1` (works on iOS Safari) and detects the muted state via `player.getMuted()`; when true, a full-screen "TAP FOR SOUND" overlay (chunky yellow volume badge) appears over the CRT and, on tap, unmutes + plays.

## Prior (Feb 2026): **Astronaut Jellybone v2 — full enclosure helmet + forward-facing drift** — `DrJellyboneAstronaut` helmet upgraded from a single floating bubble to a two-layer SVG rig: back-shell (dome silhouette + navy neck collar + oxygen tube + backpack tank with yellow valve) sits BEHIND the sprite; front-visor (transparent tinted glass + dark rim + inner white highlight + glints + side comm box with green LED + antenna with blinking red bulb) sits IN FRONT. Helmet enlarged (width 86% → 91%, top -2% → -4%) so fedora sits fully inside the dome. Fixed backwards-facing bug: `scaleX(${-direction})` → `scaleX(${direction})` so Jellybone always faces his direction of travel.

## Prior (Feb 2026): Astronaut Dr. Jellybone in the JMAtv sky — new `DrJellyboneAstronaut` component drifts across the space backdrop (blimp-style random-lap animation) on all JMAtv pages. Three user-provided "Jelly Man Jellybone no sax" frames resized 994×2000 → 300×604 and dropped in `public/assets/characters/dr-jellybone-astro-{1,2,3}.png` (~155 KB each); component cycles them every 480ms for an idle tentacle swap.

## Prior (Feb 2026): JMAtv antenna simplification — Music Videos back to coathanger, Variety Show → standard rabbit-ears, Lessons → wobble-ears. Arcade-marquee game titles + Detective ranks `Rookie / Sarge / Gumshoe`. Satellite signal waves cycle every 1.5s.

## Prior (Feb 2026): Arcade-marquee game titles + Detective rank rename — GameHeader renders string titles as chunky yellow-plate arcade marquees; Detective ranks renamed `Rookie / Sarge / Gumshoe`. Satellite signal waves cycle small-only → both → none on a 1.5s loop.

## Prior (Feb 2026): Arcade-marquee game titles + Detective rank rename — GameHeader now renders string titles as chunky yellow-plate arcade marquees with subtitle chips; Detective difficulties renamed `Rookie / Sarge / Gumshoe`.

## Prior (Feb 2026): Beat Lab mobile trim + JMAtv preview revert — Charlie + Sharky mascots hidden below 768px in `LoopStudioPage.js`; MiniCRT lazy-load reverted, muted previews auto-play again.

## Prior (Feb 2026): Perf pass — deleted 10 MB of unused assets (backup MP3s, AI-experiment PNGs, concept sketches). 67 MB → 57 MB public assets.

## Prior (Feb 2026): Shared backdrops — `SpaceBackdrop` reused across every JMAtv page; `UnderwaterBackdrop` mounted inside `SubMenuPage` so PLAY / LEARN / CREATE inherit the same undersea world as the HomePage lobby.

## Prior (Feb 2026): JMAtv per-set unique CRTs — every channel tile is a fully-rendered retro CRT with its own frame material (wood / metal / painted-red / purple-sparkle / chalkboard), antenna style (curly / ball-tips / coathanger / star-tips / apple), and knob color.

## Prior (Feb 2026): JMAtv overhaul v1 — home-page RetroTV is a single fully-clickable card; JMAtv page moved to an outer-space CSS background with `SatelliteFlyby`, and each channel embedded a mini-CRT preview.

## Prior (Feb 2026): Sub-menu tile-title clamp shrunk from `clamp(20px, 3.4vw, 38px)` → `clamp(17px, 2.6vw, 30px)` in `SubMenuPage.js` so "DETECTIVE DR. JELLYBONE" fits single-line on iPad portrait.

## Prior (Feb 2026): PLAY/LEARN/CREATE sub-menu pages now use the Finn·Shield·Charlie hero row for branding consistency; tile titles auto-fit on a single line at the top; heroes scaled 1.45× and centered at the bottom (see CHANGELOG for details).

## Prior (Jun 2026): Tablet overlap pass complete — see CHANGELOG.md. Header footprint rule: content under harp needs `pt-20 md:pt-24 lg:pt-32`.

## Original Problem Statement
Build a frontend-only rhythm/music education app for young children that feels like a **living musical academy**, not a menu of disconnected mini-games. Use the user's custom artwork (Jellybells, drum kit, xylophone, piano, turntable, kazoos, character cast, original songs).

The experience should evoke PBS Kids / Nintendo / Rhythm Heaven warmth — playful, exploratory, toy-like, personality-driven, with strong mobile responsiveness and progression that feels welcoming, not competitive.

## App Identity
- **Full name**: Jelly of the Month Club Music Academy
- **Short name**: JMA
- **Tagline**: "Where music friends play together"
- **HTML title**: `Jelly of the Month Club Music Academy (JMA)`

## 📎 Companion Documents (READ FIRST)
- **`/app/memory/INFRASTRUCTURE_ROADMAP.md`** — Long-term hosting/backend/payment strategy. User plans to self-host (GitHub Pages + Railway + MongoDB Atlas + Stripe). **DO NOT begin backend/auth/payment work until user explicitly says so.** Currently in polish + teacher-playtest phase.
- **`/app/memory/CHANGELOG.md`** — Running log of recent changes.

## Six Academy Destinations (rooms)
Replacing the legacy "6 mode tiles" grid with rich room-card destinations on the home page:

| Room | Path (kept for sticker compat) | Background | Character vibe |
|------|-------------------------------|------------|----------------|
| Jam Hall | `/free-play` | river.png | Drum Major Charlie + Finn |
| **Jelly Jukebox** (formerly "Who's Got the Rhythm?" / "Rhythm Arcade") | `/rhythm-game` | jelly-jukebox-scene.png (disco) | Disco Lou + Punk Charlie |
| Stew Kazoo Says (Kazoo Room) | `/simon-says` | underwater.png | Stew + Lou & Stew |
| Ear Quest | `/ear-trainer` | beach.png | Dr. Jellybone + Snorkel Sharky |
| Beat Lab | `/loop-studio` | graffiti-wall.jpg | Jelly Rap Trio |
| **Robot Boogie** (Incredibox-style stem mixer) | `/robot-boogie` | robot-boogie-scene.png (disco) | Full 8-character disco band |
| **Who's Got the Rhythm** (formerly "Stew's Rhythm Academy") | `/boom-garden` | jukebox-floor-1.png (disco tile) | Disco Chunk + Jazzy + Charlie |
| Fun Facts Clubhouse | `/fun-facts` | clubhouse.png | Jazzy + Charlie |

**Feb 2026 name-swap note**: The two rhythm games swapped names. What was "Who's Got the Rhythm?" (falling notes) became **Jelly Jukebox** (disco theme). What was "Stew's Rhythm Academy" (rhythm-reading rooms) became **Who's Got the Rhythm** (disco tile-floor theme). Inside that room, "Echo Stew" mode is now **Parrot Percussion** with tagline "Stew plays. You play it back." The internal route names `/rhythm-game` and `/boom-garden` were preserved for sticker/achievement compatibility.

**Feb 27, 2026 addition**: **Robot Boogie** — Incredibox-style stem mixer under CREATE. 8 characters, 12 audio stems (bass, 4 drums, guitar, 3 horns, 3 synths), preloaded and group-started on the first tap so they stay in perfect sync. Multi-stem characters (Chunk/Jellybone) cycle their variants on each click.

Each destination card features a full-bleed background scene, prominent character art, and an ALL-CAPS NES-cartridge title. Sign nameplates and taglines were removed Feb 2026 per the world-building direction.

## Academy Rank System (Polliwog → Maestro)
Driven by total stickers earned. Warm, non-competitive.

| Rank | Min Stickers | Icon |
|------|-------------|------|
| Polliwog | 0 | charlie-polliwog |
| Tadpole | 5 | finn-danger |
| Apprentice | 12 | dr-jellybone |
| Soloist | 20 | jazzy |
| Conductor | 30 | charlie-drum-major |
| Maestro | 45 | charlie-grad |

- `useRank({ withCelebration })` derives current rank from sticker count.
- `RankBadge` shows on Home + Sticker Book.
- `RankUpCelebration` overlay (with confetti + fanfare-style animation) fires once when crossing a tier; persisted via `localStorage.jma_rank_seen_v1`.

## Character Personality Layer
- `RoomCharacters` component drops 3-4 friendly characters into each game page corners. Tapping any character:
  - Cycles through the character's available outfit assets (10 looks for Charlie, 4 for Sharky, 3 for Chunk, 2 for Jazzy/Lou/Stew).
  - Pops a contextual speech bubble that auto-dismisses.
- Fun Facts mobile: scene wider than viewport (`minWidth: 720px`) so kids horizontally pan/swipe to discover characters. Desktop stays 16:9 capped at 1200px.
- Stew added as a 7th Fun Facts character (kazoo/birds-themed facts).

## Implemented (Feb 14, 2026 — Phase 1-4 cohesion pass)
### Renames
- HTML title now `Jelly of the Month Club Music Academy (JMA)`.
- `Stu Kazoo` → `Stew Kazoo` everywhere (page title, instructions, sticker hints).
- `Loop Studio` → `Beat Lab` (page header, sticker hints).
- `Free Play` → `Jam Hall` (page header, sticker hints).
- `Rhythm Game / Who's Got Rhythm` → `Rhythm Arcade` (menu title).
- `Ear Trainer` → `Ear Quest` (menu title).
- `Fun Facts` → `Fun Facts Clubhouse` (page header).

### New components & data
- `components/HarpIcon.js` — SVG harp (placeholder until user uploads custom artwork).
- `components/RoomCharacters.js` — per-page ambient cast with outfit cycling + speech bubbles.
- `components/RankBadge.js` — current rank pill + progress to next.
- `components/RankUpCelebration.js` — rank-up overlay (mounted in `App.js`).
- `hooks/useRank.js` — rank derivation + opt-in celebration tracking.
- `data/ranks.js` — Polliwog→Maestro ladder.
- `data/musicFacts.js` — added `Stew` entry with 10 kazoo/birds facts.

### Modified
- `pages/HomePage.js` — complete redesign as Academy Campus. 6 destination room-cards, banner, rank badge, sticker spotlight, sticker book button.
- `pages/StickerBookPage.js` — Home button now uses harp icon; RankBadge displayed.
- `pages/FunFactsPage.js` — title renamed; scene now horizontally pannable on mobile; 7 characters.
- `pages/SimonSaysPage.js` — name + RoomCharacters.
- `pages/LoopStudioPage.js`, `FreePlayPage.js`, `RhythmGamePage.js`, `EarTrainerPage.js` — names + RoomCharacters.
- `components/GameUI.js` — Home button replaced with harp + "Home" label.
- `App.js` — RankUpCelebration overlay mounted globally.

## Backlog
- **P0 (new, user-flagged as important)**: **Robot Boogie waiting area (bottom lineup) scrolls off-screen on some viewports** — the compact character lineup + Time Machine can be pushed below the fold on shorter phones / landscape / tablet-portrait. Fix so the waiting area is always visible without vertical scroll.
- **P1 (new)**: **GarageBand-style electric guitar** — add a strummable electric guitar instrument (à la GarageBand touch instruments). Placement TBD (Jam Session tab? new Beat Lab melody instrument? standalone?).
- **P0 (deferred, needs go)**: Beat Lab rework — swap instruments to Kick/Snare/Hat/Crash + Stand-up bass + Sax (A minor) + Piano; ditch bells; use `[Rhythm | Melody]` tabs.
- **P1**: Note Names label toggle audit — verify Solfège / Letters / Both across every mini-game.
- **P1**: JMAtv inline-modal player on iOS Safari (kill the per-episode "TAP FOR SOUND" tap).
- **P1**: Replace `HarpIcon.js` SVG with user's custom harp artwork once uploaded → `assets/ui/harp.png`.
- **P1**: Beat Lab grid-cell memoization — split 96-cell sequencer into memoized rows.
- **P2**: Beat Lab timer consolidation (merge 7 setTimeout/setInterval calls).
- **P2**: Robot Boogie "boop" SFX on pinch-scale complete.
- **P2**: Parent Page CREATE spotlight (DAW / Song Studio) on `ForParentsPage`.
- **P2**: Dynamic scale numbers on parent page (read from data files).
- **P2**: Mechanic tags on game cards ("Tap the notes" / "Match by ear").
- **P2**: Sticker Book preview strip on Home.
- **P2**: JMAtv "Puns and Funs" episode rename list (waiting on user's titles).
- **P2**: Note Match logo swap (waiting on white PNG upload).
- **P2**: Score multiplier (×2) for streaks of 5+ in Rhythm Arcade.
- **P2**: 0.5x / 1x tempo dial on Boom Garden mode-pick screen for struggling students.
- **P2**: Split `FreePlayPage.js` (>900 lines) and `BoomGardenPage.js` (>800 lines) into sub-components.
- **P2**: README.md with GitHub Pages deploy instructions.
- **P2**: Verify MP3 recording on real mobile devices.
- **P3**: Hide "For Grown-ups" home-page link after subscribe (waits on Path C).
- **P3**: 24/7 streaming channel (research phase, on hold).
- **P3**: Color-randomness audit (case-by-case, on hold).
- **P3**: Confetti celebration on Who's Got Rhythm / Ear Quest milestones.
- **P3**: "Maestro's Map" board-game journey using existing minigames as tiles (idea stage).

## Path C — Backend (PAUSED, do NOT start until user says so)
- **Stage 1**: FastAPI + MongoDB + Auth backbone (JWT email/password + Emergent Google Auth for teachers + Class Code + First Name for kids). Zero visible UI change.
- **Stage 2**: Optional login syncs stickers/ranks to DB. Guest play still frictionless.
- **Stage 3**: `/teacher-portal` (rosters, class codes, report cards).
- **Stage 4**: Stripe test-mode checkout + free-tier paywall (chill Jukebox, Note Match easy, Lesson 1, Cadet Rhythm, Jam Session, Beat Lab are free; rest locked with silhouette stickers as teasers).

## Implemented (Feb 20, 2026 — later) — Boom Garden round-cycle + Stew Kazoo animations
- **Tap Trail no longer breaks after one round** — added `roundKey` on `RhythmStrip` / `ScrollingRhythmStrip` so the framer-motion node fully remounts between rounds and re-applies `initial={{ x: startX }}`. Verified via DOM probe across 3 consecutive Tap Trail rounds.
- **Stew Kazoo Says animations fire reliably on every note** — replaced 4-stacked-img display-toggle (which got clobbered by React re-applying JSX style on every re-render) with a single `<img>` whose `src` is swapped imperatively. Same pattern proven by `StewDrummer` in Boom Garden. Verified 9 src cycles in 3 s of demo with correct frame order.
- **CI build unblocked** — added eslint-disable for the stable `useImperativeHandle` in `StewDrummer.js`.



## Implemented (Feb 30, 2026 — Robot Boogie v8 special sauce)
- **P0 layout fix**: n=4 dancers now render in a single row (widthPct 28% / maxW 340px / negMx 22px). Active band capped at `calc(100vh - 340px)` so 2-row layouts at n≥5 never push the Time Machine into the compact lineup. Metrics-verified `bandOverlapsMachine: false`.
- **SVG lightning bolts** (`components/LightningStage.js`): persistent, jittering, team-colored plasma paths shoot from the Time Machine's top vent to every active character. Bolts re-roll every 130ms for a crackling live-plasma feel and gain a bright branch on zap. Replaces the old PNG lightning frames the user hated.
- **Beat-locked visual clock**: `useRobotBoogieAudio.getAudioClock()` + new `hooks/useBeatPulse.js` derive beat/phase/pulse from the same Web Audio timeline the stems loop on. Consumers subscribe imperatively (zero rerenders at 60fps).
- **Beat-synced world**: active characters' glow pulses; Time Machine under-glow throbs; bottom lineup bobs left/right + hops on the downbeat with per-character offsets; subtle world + disco-floor pulses in the background.
- **Steam puffs** on every character toggle — CSS keyframe `robotBoogiePuff` rising blobs from the machine vent.
- **Llama Lou PNG cropped**: source frames had ~50% empty transparent space; all 6 dance frames now cropped to 250×288 identically (originals backed up under `/lou-dancing/originals/`). Lou now sits centered in his slot.


## Implemented (Feb 17, 2026 — Phase 3 Educational Wins)
Four new mini-features designed to boost real music learning while keeping it fun:

### 1. Practice Buddy (daily-return streak)
- `hooks/usePracticeStreak.js` tracks `{count, lastDate}` in `localStorage.jma_practice_streak_v1`. Same-day visits don't bump; previous-day visits +1; gaps reset to 1.
- Crossing 3 / 7 / 14 days unlocks **3 new collection stickers**: Practice Buddy / Weekly Wonder / Two-Week Trooper (under Fun Milestones — pure flair, doesn't gate rank).
- `components/PracticeStreakChip.js` shows on the Home page once streak ≥ 2 (hidden day 1 to avoid pressure).

### 2. Sight-Reading Sprint (new game in PLAY)
- New page `pages/SightReadingPage.js` + reusable `components/SolfegeStaff.js`.
- 3 difficulty tiers: Cadet (3 notes / 20 s / low bells), Pro (4 / 18 s / low bells), Master (5 / 16 s / full 8-bell range).
- Flow: demo plays the sequence once → kid taps bells in order → time bonus on completion → win modal.
- Earns **Music Scholar** achievement ladder (same domain as video lessons — proves reading-the-notation skill).
- Tile added to Play menu (`/play`) and route `/sight-reading` wired in `App.js`.

### 3. Rest Quiz (new Detective Dr. Jellybone mode)
- 4th difficulty in `pages/DetectivePage.js`: instead of swapping one note to a wrong pitch, the suspect tune has an **EXTRA** note inserted.
- 30-second countdown timer (`detective-timer`) starts when guess phase opens; timeout costs a life and reveals.
- The chip row renders the corrupted sequence (one extra chip vs original).
- Reveal text: *"Slot N (SOLFEGE) was the EXTRA note!"*

### 4. Tempo Quiz (new Ear Quest sub-mode)
- New component `components/TempoListeningGame.js`, accessible via the `ear-tempo-quiz-btn` on Ear Quest menu.
- Plays two short clips of the same tune at different BPMs. Kid picks **Faster** or **Slower**.
- 10 rounds per run with progressively narrower BPM deltas: ±40 → ±20 → ±10 BPM.
- Earns **Rhythm Reader** achievement ladder: Cadet at 5+ correct, Pro at 8+, Master at 10/10.

### Verified
- Frontend testing agent: **100% pass (6/6 acceptance criteria)**, zero pageerror exceptions, all 13 routes navigate cleanly.
- `CI=true yarn build` → Compiled successfully (263.25 KB gz, +8 KB for Phase 3).

## Implemented (Feb 2026 — Spacebar hold + Clubhouse Chatter)

### Spacebar hold in Who's Got The Rhythm (`BoomGardenPage.js`)
- Added `if (e.repeat) return;` guard in the keydown handler — holding Space now produces exactly ONE snare tap, not a repeat-storm. Verified Playwright: 1 press + 30 auto-repeat keydowns → 2 UI chips total (initial tap + one forward-walk auto-miss).
- Added a `spaceHeld` visual state: a soft purple pulse ring around Stew while Space is held, framer-motion exit-animated. Purely cosmetic — scoring is unchanged, so kids who don't hold "long enough" through half/whole notes are not punished.

### Clubhouse Chatter (`FunFactsPage.js`)
- Added a `chatter` field to each `SCENE_CHARS` entry mapping the character to an existing personality-appropriate SFX (Chunk → piano flourish, Finn → drum fill, Dr. Jellybone → detective sting, Stew → kazoo honk, Jazzy → bell pair, Charlie → DJ scratch, Lou → twinkle).
- On FIRST find only, `showFact` spawns a soft `new Audio(chatter)` at volume 0.55 with autoplay-rejection silently caught.
- Verified via Playwright Audio-constructor interception — correct SFX fires for each first find.

## Testing Credentials
N/A — frontend-only, no auth.

## Implemented (Feb 2026 — Fun Facts Clubhouse: standalone Lou + Stew)
- `FunFactsPage.js` `SCENE_CHARS` array split the legacy `Lou & Stew` entry into two standalone entries: **Lou** (`lou.png`, no Stew on shoulder) at his old spot, and a new **Stew** (`stew.png`) placed at the top-right tree area (left 88% / top 18%, swing anim).
- Intro copy: "Find all 6 friends!" → "Find all 7 friends!".
- `stickers.js`: replaced `char_loustew` with `char_lou` + `char_stew` character stickers.
- `musicFacts.js`: renamed `'Lou & Stew'` key → `'Lou'`; existing `Stew` facts (kazoo/bird facts) now wired to the standalone Stew.
- Verified via manual screenshot: all 7 characters found, Stew visible top-right on the palm, Lou standalone in bottom-right.

