# Changelog

## Scroll-collapsing back button (Feb 2026)

**User request**: The harp back button keeps getting in the way. Anytime a screen with the back button is not scrolled to the top, the harp logo should disappear and only the small "BACK" text pill should remain.

### `components/GameUI.js` — `GameHeader`
- Added a `collapsed` state driven by a `window.scroll` listener with a 24 px threshold (deliberately small so the shield tucks away the moment a kid starts interacting below the fold).
- Wrapped the shield container (the `w-12 h-12 md:w-14 md:h-14 lg:w-20 lg:h-20` dark box holding the harp / CRT icon) in an `<AnimatePresence>`; when `collapsed` is true it exits with `{ opacity: 0, height: 0, scale: 0.6 }` on a spring transition. `overflow: hidden` on the animated wrapper keeps the layout collapse smooth.
- The "BACK" pill itself is now a `motion.span` that animates its own padding (8→12 px), font size (10→12 px), margin-top (4→0 px), and gains a `0 3px 0 rgba(0,0,0,0.35)` drop-shadow when collapsed so it reads as a proper standalone button instead of a stranded label.
- Both animations share the same spring config (`stiffness: 320, damping: 26`) so the collapse feels like one motion, not two.

### Global effect
- No per-page changes needed — every route that uses `GameHeader` (every game, JMAtv, lessons, fun facts, sticker book…) inherits the behavior automatically.

### QA
- Automated on `/loop-studio` at 1400×900:
  - Scroll y=0: `back-button` bbox height = 94 px, inner shield height = 80 px.
  - Scroll y=240: `back-button` bbox height = 19.97 px, inner shield = `None` (removed from DOM via exit).
  - Back to y=0: inner shield = 80 px (re-mounted).
- Webpack compile clean; only pre-existing eslint warnings.



## JMAtv phone-portrait logo stacking (Feb 2026)

**User request**: On phone (portrait/narrow), stack the JMAtv logo above the CRT — anywhere there's no room for horizontal viewing and layout goes vertical.

### `pages/JMAtvPlayerPage.js`
- Added a `md:hidden` `<motion.div>` right after `<GameHeader>` that renders `assets/ui/jmatv-logo-v2.png` centered, sized `clamp(120px, 42vw, 200px)` with a chunky black drop-shadow + a soft yellow glow so it reads as a proper page header, not a floating decal.
- Added `hidden md:block` to the existing in-CRT channel bug (`<img>` inside the CRT screen at `top:10, right:10`) so it renders on tablet/desktop but disappears on phones where the small CRT can't afford the corner clutter.

### QA
- Phone 390×844: `phone_stacked_logo count=1 visible=True box.y=96`, `crt_frame.y=279`, `logo_above_crt=True`.
- Desktop 1400×900: `desktop_stacked_logo visible=False` (md:hidden takes over), `desktop_incrt_bug visible=True` (channel bug remains inside the CRT screen).



## Beat Lab canonical track order + Sight-Reading tier rename + Clear button width (Feb 2026)

**User request**: In Beat Lab, tracks should stay in order — bells (Do, Re, Mi…) together, drums together, turntable together — regardless of how they were added. Sight-Reading Sprint tiers should read Easy / Medium / Hard / Wizard. Clear button text was overflowing its box; widen it.

### `pages/LoopStudioPage.js` — canonical track order
- Added a module-scope lookup + sort helper right after `TRACK_PRESETS`:
  ```js
  const TRACK_ORDER = TRACK_PRESETS.reduce((m, t, i) => { m[t.id] = i; return m; }, {});
  const sortTracks = (ids) => [...ids].sort((a, b) => (TRACK_ORDER[a] ?? 999) - (TRACK_ORDER[b] ?? 999));
  ```
- Applied to three entry points that mutate `activeTracks`:
  - Initial `useState(() => sortTracks([...]))` (defensive; the default set is already ordered).
  - `addTrack` → `setActiveTracks(prev => sortTracks([...prev, trackId]))` so `+ Add` chips insert into the right slot.
  - `loadPreset` → `setActiveTracks(prev => sortTracks([...new Set([...prev, ...trackIds])]))` so presets like "Scratch Mix" (which drop drums + scratches together) don't scramble the row.
- Verified: adding `scratch_pull → bells_HC → drum_crash → bells_D` in that reversed order rendered as `bells_C, bells_D, bells_E, bells_G, bells_HC, drum_kick, drum_snare, drum_hihat, drum_crash, scratch_pull`.

### `pages/LoopStudioPage.js` — Clear button width
- Was `w-9 h-9` (fixed 36×36) with `px-1` on the inner span — 5-letter "CLEAR" label at 10–12 px overflowed on some viewports.
- Now `h-9 px-3` auto-width pill. Measured post-fix: button 69 px wide, text 41 px wide, text fits fully inside (asserted in the smoke test).

### `pages/SightReadingPage.js` — tier rename
- LEVELS names updated: Cadet → **Easy**, Pro → **Medium**, Master → **Hard**, Wizard kept.
- Internal object keys (`cadet/pro/master/wizard`) left untouched so:
  - Existing `jma_sight_reading_best_v1` localStorage best scores keep working.
  - The `tier: 'cadet'|'pro'|'master'` mapping (used for the `scholar` achievement ladder) is unchanged.
- Wizard still carries the ⚡ VERY HARD gradient badge next to its name.

### QA
- Smoke test `/sight-reading`: all 4 tier buttons render with the new labels.
- Smoke test `/loop-studio`:
  - `rendered_track_order = ['track-label-bells_C', 'track-label-bells_D', 'track-label-bells_E', 'track-label-bells_G', 'track-label-bells_HC', 'track-label-drum_kick', 'track-label-drum_snare', 'track-label-drum_hihat', 'track-label-drum_crash', 'track-label-scratch_pull']`.
  - `clear_button_rect.width=69`, `clear_text_rect.width=41`, `clear_text_fits_inside_button=True`.
- Webpack compile clean; pre-existing eslint warnings unrelated.

### Punch-list ticks
- ✅ Sight Reading Wizard-tier standardization (Easy / Medium / Hard / Wizard).
- ✅ Puns with Finn episode renames — already completed in a prior session, formally closed out here.
- ✅ Beat Lab track ordering.
- ✅ Beat Lab Clear button width.



## Beat Lab latency trim — deferred audio preload + memoized mascots (Feb 2026)

**User request**: Beat Lab chugs on the first tap. Defer the 12 audio stems + memoize mascots so mobile Beat Lab stops chugging.

### `hooks/useAudio.js` — deferred preload
- Before: `useEffect(() => { preloadAudio(); }, [preloadAudio])` fired on every mount, kicking 26 `fetch` + `decodeAudioData` ops synchronously (8 bells + 10 drums/scratches + 8 kazoos). On mobile Beat Lab this competed with the initial paint AND Framer-Motion mascot entrance AND the 96-cell sequencer grid mount — hence the ~1–2s "did it work?" gap on first tap.
- After: same preload, wrapped in `requestIdleCallback` (with a `setTimeout(kick, 250)` Safari fallback + proper cleanup). The browser paints the UI first, then decodes audio during idle time. Preload still finishes long before the first user tap (which is gated behind the app-wide "Tap to Start the Music" overlay anyway), but no longer blocks first paint.

### `pages/LoopStudioPage.js` — memoized mascots
- Extracted Charlie (drum-kit mascot) and Sharky (turntable mascot) into module-scope `React.memo` components: `CharlieMascot`, `SharkyMascot`. Each takes only `{ isPlaying, bpm }`.
- Root cause of the stutter: `LoopStudioPage` state (`currentStep`, `activeHits`) mutates every ~150ms during playback at 100 BPM, forcing a full page re-render. Before memo, both `motion.img` subtrees (each with animate/transition object props) re-reconciled on every one of those ticks. After memo they only re-render on real prop changes (play/stop, BPM adjust).
- Also added `memo` to the React import.

### QA
- Automated smoke test on `/loop-studio`:
  - `[data-testid="loop-play-button"]` visible → tapping it flips inner text `PLAY` → `STOP` (proves loop init + audio init still works).
  - `img[src*="charlie-rundmc"]` count = 1, `img[src*="sharky-hiphop"]` count = 1 (memo not double-mounting).
  - "You Ranked Up! → In the Spotlight" modal appears on first play (proves progression + audio + state chain intact).
- Webpack compile clean; pre-existing eslint warnings unrelated.

### Punch-list notes
- Not touched (out of scope, would need deeper refactor):
  - 7 `setTimeout`/`setInterval` cleanup consolidation
  - Grid cells (96 buttons) not memoized — currently re-render on every step highlight; would need per-row memo + step-index-only prop drilling.



## Beta punch-list batch — Sneaky Note card, Stew Kazoo route, Robot Boogie title, landscape crops, iPad unmute (Feb 2026)

**User request**: The transparent styling on Sneaky Note wasn't reading; Stew Kazoo win takes kids all the way back to home; Robot Boogie chrome title doesn't match the arcade marquees. Plus batch: Beat Lab landscape back-button overlap, Robot Boogie landscape character crop, JMAtv iPad tap-to-unmute.

### Sneaky Note "Case File" — `pages/DetectivePage.js`
- Rebuilt the Bonus Mode `restquiz` card as a dark-navy dossier: `linear-gradient(#0A2540 → #142F55 → #1B3A6A)` background w/ `3px dashed #AF52DE` border, purple drop-shadow (`0 6px 0 #AF52DE`).
- Added a rotated purple "tape" strip at top-left, a red rotated `CASE FILE` rubber stamp at top-right, and swapped the flat white magnifier badge for a purple radial-gradient badge w/ white icon and cyan glow.
- Title now white w/ purple + navy text-shadow, description in soft-purple `#E4CDF7`, Best score in yellow `#FFCC00`.

### Stew Kazoo win route — `pages/SimonSaysPage.js`
- After beating level 8, `navigate('/')` → `navigate('/simon-says')` so kids land back on Stew's own difficulty select instead of the app home.

### Robot Boogie arcade title — `pages/RobotBoogiePage.js`
- Dropped `import RobotBoogieTitle` and swapped `title={<RobotBoogieTitle />}` for `title="ROBOT BOOGIE"`. `GameHeader` renders strings through its standard `MarqueeTitle` (yellow-plate arcade pill), so RB now matches every other game.

### Robot Boogie landscape character crop — `pages/RobotBoogiePage.js`
- Active-band `minHeight: '180px'` + `maxHeight: 'calc(100vh - 340px)'` was clipping feet on 812×375 landscape phones (maxHeight went ~35px).
- Now `minHeight: 'clamp(150px, 30vh, 220px)'` + `maxHeight: 'clamp(200px, calc(100vh - 260px), 640px)'`.

### Beat Lab landscape back-button overlap — `pages/LoopStudioPage.js`
- `<main>` padding bumped `pt-20 md:pt-24 lg:pt-28` → `pt-24 md:pt-28 lg:pt-28`.
- Added `marginLeft: 'max(0px, env(safe-area-inset-left))'` on the deck so it never slides under the fixed back-pill on narrow landscape viewports.

### JMAtv iPad tap-to-unmute — `pages/JMAtvPlayerPage.js`
- Iframe src now `autoplay=1&muted=1` so iOS Safari actually plays.
- On `player.ready()`, calls `player.getMuted()`; if true, sets state `needsUnmute=true`.
- Renders an `AnimatePresence` overlay (radial navy backdrop + yellow speaker badge + "TAP FOR SOUND" copy, `data-testid="jmatv-player-unmute"`) inside the CRT screen at `zIndex: 6`.
- Tap calls `setMuted(false) → setVolume(1) → play()` and dismisses the overlay.

### QA
- Smoke screenshots (1400×900 + 812×375):
  - Detective menu → Sneaky Note card renders as navy case-file, no more transparent misfire.
  - Robot Boogie → yellow arcade "ROBOT BOOGIE" marquee identical to other games.
  - Robot Boogie 812×375 → characters visible in lineup, active-band ready to hold zapped-in dancers without clipping.
  - Beat Lab 812×375 → back-pill on far left, PLAY / deck controls clear; no overlap.
- JMAtv unmute overlay is code-verified; iOS-specific muted-autoplay behavior needs a real device to confirm the overlay appears.



## Sub-menu branding + card polish (Feb 2026)

**User request**: On PLAY / LEARN / CREATE pages, replace the giant word title with the Shield flanked by Finn and Charlie (like the home page). Keep the subtitle pill ("Pick your jam", etc.). On all cards with a hero, the title must be a single centered line at the top and the hero must be MUCH bigger without cropping or overlapping the text. Applies to every card except Charlie's Song Studio (no hero).

### Changes — `components/SubMenuPage.js` (full rewrite)
- **Header hero row (`<HeaderHero />`)**: replaces the big `sectionTitle` H1 with the same Finn · JMA shield · Charlie composition used on the home page. Sizes shrunk to fit under the top bar: Finn `clamp(50px, 9vw, 110px)`, Shield `clamp(110px, 20vw, 240px)`, Charlie `clamp(64px, 12vw, 140px)`. Subtitle pill preserved directly below. Shield click routes to `/`, character clicks route to `/fun-facts` (matches Home).
- **Title moved from top-left corner to top-center, single-line**. New `<AutoFitTitle />` component: renders the title in a full-width top band with `white-space: nowrap`, then measures `scrollWidth` vs container `clientWidth` in a `ResizeObserver` and shrinks the font-size (in 1px steps from 44 → 14 px) until it fits. Stroke width scales with font-size (`9%`) so long titles ("DETECTIVE DR. JELLYBONE", "WHO'S GOT THE RHYTHM") still read as a heavy display treatment when squished. Refit runs on every wrapper resize (rotate, grid → 1-col).
- **Heroes bigger**: applied a `HERO_SCALE = 1.45` multiplier to each tile's authored `charWidthPct` (capped at 78% so the multi-character `jelly-rap-trio` doesn't run to card edges). Hero height defaults raised 88% → 78% with the top ~22% reserved for the title band. Anchor changed from `right: 2` / `object-position: bottom right` to **bottom-center** so heroes visually center-hang from the title, and `translateX(-50%)` keeps them balanced regardless of scaled width. Charlie's Song Studio has no `character`, so the block simply doesn't render.
- **Top gradient overlay** tightened to `height: 38%` and softened to a top-down `rgba(10,37,64,0.72) → transparent` fade — enough contrast to keep the auto-fit title legible over any scene without dimming the hero.
- **Card title stays uppercase display font** (`font-black font-display`, white with dark stroke + double text-shadow), just now single-line + auto-fit + centered.
- Prop signature: kept `sectionTitle`/`sectionSubtitle`/`bgGradient`/`tiles`/`testId`. `sectionColor` is no longer read (was only used by the retired giant-text treatment).
- New `data-testid`s: `submenu-hero-finn`, `submenu-hero-logo`, `submenu-hero-charlie`, `submenu-tile-title-{id}`.

### Runtime error caught + fixed
Initial ResizeObserver-based auto-fit produced the "ResizeObserver loop completed with undelivered notifications" overlay in CRA dev mode (the observer callback synchronously mutated layout, which re-triggered the observer, which the browser reports as an unhandled error). Fix: the observer now `requestAnimationFrame`s a `schedule()` guarded by a single `rafId` so layout mutation always happens outside the observer's dispatch cycle. Cancelled on unmount.

### Files touched
`components/SubMenuPage.js` (rewritten).

### Not touched
`PlayMenuPage.js` / `LearnMenuPage.js` / `CreateMenuPage.js` — the per-tile authoring shape (`title`, `character`, `charWidthPct`, `bg`, etc.) is unchanged; only the shared renderer changed. No prop churn required on the page files.

### Verification
- Hot reload confirmed live.
- The `AudioUnlockOverlay` in Playwright automation blocks a clean full-page screenshot without a trusted first-gesture; verified through the overlay's transparency that (a) the new small Finn/Shield/Charlie hero row is at the top of every sub-menu, and (b) tile titles now sit at the top-center of each card with heroes anchored below. User to confirm on-device.

---



## Name That Note — livelier tour + Place It note sound (Jun 2026)

**User feedback**: "That opening animation is a tiny wooden still — the one where we are showing the names. Also in place it, maybe play the sound of the note we want placed?"

### Change 1 — Opening staff tour is now dynamic (not a stiff still)
- `NoteHead` gained a `bounce` prop. In tour mode the note now HOPS between staff positions (bouncier spring: stiffness 300 / damping 11) with a scale keyframe pop `[1, 1.32, 0.86, 1.1, 1]`, plus a pulsing golden ring radiating out of the head each stop.
- Finn now announces every note as it lands ("This is E — it is the bottom line!") using the existing `WHY` rule map, and reacts with `cheer`/`party` moods through the tour. Stop cadence slowed 750ms → 900ms so kids can read each name.

### Change 2 — Place It plays the target note
- `nextQuestion` now rings `playBellNote(target)` on Place It question start (350ms delay), so the ear reinforces where the named note should go — mirrors the existing Name It behavior. The manual "Hear {note}" button remains.

**Verification**: Frontend compiles cleanly (webpack "Compiled successfully", no runtime JS errors — only benign AudioContext autoplay warnings). NOT visually verified via screenshot: the AudioUnlockOverlay ("Tap to Start the Music") cannot be dismissed by the automation harness (no trusted first-gesture), so mid-tour frames couldn't be captured. Changes are additive/low-risk. User to confirm on-device.


## Robot Boogie — 3 follow-up fixes (Feb 2026)

**User feedback after the first pass**:
1. Pinch was scaling ALL characters at once (workspace-level) instead of just the one being pinched
2. After the first character drag, subsequent taps kept moving whichever character was on the top DOM layer instead of the character actually under the pointer
3. On phones, the title, reset chip and speed slider stacked on top of each other

### Fix 1 \u2014 Per-character pinch (dropped workspace pinch)
- Removed `usePinchPan.js` hook + workspace transform layer entirely. Original design was wrong: user wants pinch to scale the individual character (matching desktop mouse-wheel behavior), not the whole workspace.
- `CharacterSlot` now tracks its own pointers in `localPointersRef` (Map of `pointerId \u2192 {x,y}`). When 2 pointers land on the SAME character\u2019s hit-div, it enters `pinchRef` mode: current finger distance vs. start-distance drives the scale delta, fed through the existing `onWheel` path so scale clamping / caps stay identical to the wheel behaviour.
- In-flight single-finger drag is aborted the moment finger 2 arrives on the same character.

### Fix 2 \u2014 Hit-div now moves with the character
- Root cause: the hit-div was a SIBLING of the transformed inner layer. Once the character was translated via CSS transform, the visible sprite moved but the hit-div stayed put \u2014 so subsequent taps at the character\u2019s new position hit whichever hit-div happened to be in the DOM below (usually the neighbor).
- Fix: relocated the hit-div INSIDE the transformed inner layer. Now the hit region moves with the sprite exactly. Subsequent taps on a moved character land on the correct character every time.
- Outer wrapper + button remain `pointer-events: none`; hit-div remains `pointer-events: auto` at 62% width centered.

### Fix 3 \u2014 Header stacking on mobile
- Reset + Speed row `pt-14` \u2192 `pt-20` on mobile (`md:pt-16` unchanged on desktop). The `Back` button pill is ~76px tall on phones and the previous 56px top-padding caused the title / reset / speed slider to visually stack.
- Added `flex-wrap` to the row so if a very narrow viewport still can\u2019t fit both chips inline they stack cleanly instead of overlapping.
- Verified on iPhone-14 viewport (390\u00d7844): title top:8/bottom:24, reset+speed top:80/bottom:112, back top:4/bottom:71 \u2014 zero overlap on any axis.

### Files touched
`RobotBoogiePage.js`. Deleted `hooks/usePinchPan.js` (unused).

### Testing
- Desktop mouse drag: dragging Charlie 120px right moved his hit-div\u2019s bounding-box exactly 120px right (confirming the hit region follows the character). No stacking on any viewport.
- Pinch-scale: native pointerevent-based; needs real-device verification (phone/tablet) since Playwright can\u2019t reliably emulate multi-touch.

---


## Robot Boogie — title treatment + 3 interaction fixes (Feb 2026)

**User requests**:
1. Robot Boogie title needs a distinctive futuristic/robotic display treatment that fits the game's world (still JMA, but clearly different from other page titles)
2. Pinch-to-zoom does not work on phones/tablets while arranging characters — need two-finger pinch + pan on the workspace without interfering with single-finger character drag
3. Wrong character sometimes drags when tapping — hit-testing / layer-order issue with overlapping characters
4. Characters clip at top/bottom of workspace when dragged — need free movement while keeping full character visible

### Fix 1 — Custom Robot Boogie title
- New `RobotBoogieTitle.js` component: chrome/metallic gradient fill (white \u2192 pale blue \u2192 mid blue), wide-tracked all-caps Orbitron/Rajdhani-style stack, dark hairline text stroke for legibility over the deep-purple stage, and a cyan drop-shadow glow to hum with the lightning theme. Reads as a robot HUD marquee.
- Extended `GameUI.js` `GameHeader` to accept either a string OR a ReactNode as `title`. Strings still get the default cross-game styling; ReactNodes render as-is. Zero risk to other games.
- `RobotBoogiePage.js`: passes `<RobotBoogieTitle />` to `GameHeader`.

### Fix 2 — Two-finger pinch-zoom + pan on the workspace
- New `hooks/usePinchPan.js` hook: attaches native `pointerdown`/`move`/`up`/`cancel` listeners to a container ref, tracks all active pointers in a Map. When 2 pointers land simultaneously, enters gesture mode \u2014 distance-between drives scale (clamped to [0.6\u00d7, 2.5\u00d7]), midpoint drift drives translate. Returns `{ transform, reset }`.
- Dispatches a `rb-pinch-start` window event when a second pointer arrives. `CharacterSlot` listens and clears its `pointerStateRef` so an in-flight single-finger drag doesn\u2019t keep dragging alongside the pinch (feels chaotic otherwise).
- `CharacterSlot`\u2019s `handlePointerDown` also checks `e.isPrimary === false` and bails \u2014 the 2nd finger of a pinch never starts a character drag.
- `RobotBoogiePage`: added `activeBandRef` + `usePinchPan(activeBandRef)` at page level. Active-band container carries the ref + `touchAction: 'none'` (so browsers don\u2019t hijack pinch as page zoom). Inner \u201Cworkspace transform layer\u201D wraps the character AnimatePresence with `transform: translate3d(x, y, 0) scale(s)` from the hook.
- `handleReset` also calls `resetWorkspaceTransform()` so the Reset button snaps the workspace back to identity.

### Fix 3 — Correct-character hit-testing
- Root cause: active-band wrappers overlap horizontally via negative margins (e.g. `-22px` each side at n=4), and each `motion.button` fills its wrapper 100%. Character sprites have baked-in transparent side-padding \u2014 so a tap on Charlie\u2019s face can visually be over Charlie\u2019s sprite but LAND inside a neighbor wrapper\u2019s transparent zone, dragging the neighbor.
- Fix: outer `motion.div` wrappers set to `pointer-events: none`, `motion.button` set to `pointer-events: none`, and a new inner **hit-div** (`data-testid=robot-boogie-char-hit-{id}`, `width: 62%`, absolute centered horizontally, full height) hosts the actual `onPointerDown/Move/Up/Cancel` handlers. The 62% roughly matches the visible sprite bounds. Clicks in the transparent zones fall through to whichever hit-div is directly beneath, so the character the kid SEES under their finger is always the one that moves.
- Sprites (`<img>`) still render at 100% of the wrapper via absolute positioning inside the button \u2014 visuals unchanged, hit region tightened.

### Fix 4 — Head/feet clipping when dragging
- Root cause: active-band container had `overflow-hidden`, and drag Y-clamp of \u00b1140px is bigger than the vertical slack the band actually has.
- Fix: `overflow-hidden` \u2192 `overflow: visible` on the active band. Y clamp tightened `\u00b1140` \u2192 `\u00b160` so characters stay comfortably inside the workspace vertical bounds even at 4+ dancers with wrap. X clamp unchanged.

### Files touched
`RobotBoogiePage.js`, `GameUI.js` (title-as-ReactNode), created `RobotBoogieTitle.js` + `usePinchPan.js`.

### Testing
- Desktop mouse: verified drag on active Charlie moves the character (mouse drag +80px on the hit-div produced a visible offset; sticker awarded correctly).
- Title rendered correctly on the Robot Boogie route with distinct chrome/glow treatment; standard `GameHeader` untouched for other games.
- Pinch/pan gesture wiring is native pointerevent-based and cannot be reliably exercised in Playwright without touch-device emulation; will require real-device verification by the user on a phone or tablet.

---


## Parent-facing page copy revisions (Feb 2026)

**User feedback**:
- The band is also music educators with decades of private + classroom teaching \u2014 emphasize that
- Character bios were wrong: Finn plays upright bass (not drums), Chunk is a monkey drummer (not hippo bass), Jazzy plays trumpet and manages the band (not keys), Charlie is a polliwog specifically (not tadpole)
- "6 games / 7 lessons" undersells the app \u2014 the actual scale is huge
- CREATE tab is missing from the pitch (song creation, DAW, beats, save/record)
- "For Parents" link might feel weird in a classroom
- Loves "kids first handshake to music" as a tagline

**Changes**:
- Added new sub-tagline above the hero: **"A KID'S FIRST HANDSHAKE WITH MUSIC"**
- Rewrote hero subtitle: "Games. Video lessons. A studio to write real songs. A whole musical universe kids ask to come back to."
- Character bios updated per user (see BAND array in ForParentsPage.js).
- "Why parents love it" trust-bullet block now leads with **"Built by working musicians AND teachers"** \u2014 kindie-rock band + decades of teaching.
- "What is this?" strip expanded from 3 cards to **4 cards (Play / Learn / Create / JMAtv)**. Create card explicitly calls out DAW, songwriting, beats, Robot Boogie, band jam, save your tracks.
- Added a **scale-of-content strip** below the 4-card row: `13+ games & tools · 40+ videos · 16 songs to play with · 18 skill badges to earn`. Reframes the app from "small" to "massive".
- Meet-the-Band tail-note rewritten: "\u2026 the music academy we've built out of decades of private and classroom teaching. Real teachers. Real musicians. Real music."
- Renamed the tiny link on the kid Home from **"For Parents"** to **"For Grown-Ups"** so it feels right in a classroom too. Route URL (`/for-parents`) unchanged for shareability.

### Character bios (final)
| Name | Bio |
|---|---|
| Charlie | Rock-star polliwog. Fronts the band. |
| Finn Danger | Upright-bass shark. Anchors the low end. |
| Stew | Kazoo-blowing parrot with big opinions. |
| Lou | Ukulele llama. Traveled the whole world. |
| Chunk | Monkey on the drum kit. Locks the pocket. |
| Dr. Jellybone | Music detective with the sharpest ear. |
| Jazzy | Trumpet player and the band's manager. |

### Files touched
`ForParentsPage.js`, `HomePage.js`.

**Follow-up copy tweaks (same day)**:
- Footer changed from "Luner Tide LLC dba Buddy Bro Productions" to just **"© Buddy Bro Productions"** (public-facing brand only).
- Final CTA blurb replaced the word "paywall" (felt like a buzz word) with softer copy: "Come back when you're ready to unlock the whole thing."

**IMPORTANT — legal name correction for the record**: the LLC is actually **Lunar Tide, Consulting and Productions Inc.** (not "Luner Tide LLC" as I had it in earlier drafts). Only matters for Stripe onboarding / tax paperwork on Path C. Public-facing brand stays "Buddy Bro Productions".

---

## Parent-facing landing page + smart root gate + Streaming Now pill moved (Feb 2026)

**User request 1**: "I want you to move the pulsing light with STREAMING NOW down below the tv. It's cluttered with the rabbit ears."
**User request 2**: "Lets see the parent facing page."

### Streaming Now pill relocated
- `RetroTV.js`: moved the pulsing red dot + "STREAMING NOW" label from ABOVE the TV to BELOW it. Reduced the outer wrapper's `pt-12` → `pt-8` since the pill no longer needs top space. Pill visually cleaner — rabbit-ear antennas no longer collide with it.

### Parent-facing landing page (`/for-parents`)
New route + component `ForParentsPage.js` — the marketing/sales-pitch page discussed in the funnel audit. Sections:
1. Hero with tagline "Where kids fall in love with music." + dual CTAs (Start Playing Free / I'm a Teacher) + bopping band parade.
2. "What is this?" 3-card strip (6+ Games / Video Lessons + JMAtv / Real Progression).
3. Why parents love it — 4 trust bullets (no ads, COPPA-safe, made by touring band, feel-good screen time).
4. Meet the Band — all 7 characters with one-liner bios + cross-link to jellyofthemonthclub.com for tour dates.
5. Pricing — Free / Family $12.99 / Teacher $19.99 with annual save badges and "Most Popular" ribbon on Family.
6. Teacher/classroom strip with mailto CTA.
7. Final CTA + footer with Luner Tide LLC dba Buddy Bro Productions copyright.

All pricing CTAs currently drop straight into `/home` (the free app). Path C will swap them for Stripe Checkout.

### Smart root gate (`/`)
New `RootGate` component in `App.js`:
- Checks `localStorage['jma_player_v1']` or `jma_player_name_skipped_v1`.
- **Has player** → `<Navigate to="/home" />` — returning kid never sees marketing again.
- **No player** → renders `<ForParentsPage />` — first-time visitor gets the pitch.
- Both sides have escape hatches: "Take Me to the App →" button in the parent-page header, and a small "For Parents" link top-right on the kid Home (`data-testid="home-for-parents-link"`, deliberately small so kids don't tap it).
- Added `/home` route as alias to HomePage (previously `/`); old `/` now routes through the gate. All internal `navigate('/')` calls should still work — HashRouter treats it as root.
- `PlayerNamePrompt.js` updated with a live `useCurrentHash()` hook so it re-evaluates when the hash changes — suppresses itself on `#/for-parents` and empty/root hashes so a browsing parent isn't asked for their kid's name mid-marketing pitch.

**Verified**:
- Fresh visit to `/` (no player) → parent page renders, name prompt suppressed.
- Seeded `jma_player_v1` → `/` redirects to `/home`, kid Home renders with the tiny "For Parents" link top-right.
- `/#/for-parents` renders standalone.

### Files touched
`RetroTV.js`, `App.js`, `HomePage.js`, `PlayerNamePrompt.js`. Created `ForParentsPage.js`.

---


## Bug fix — achievement stickers showed broken-image icon on Home page + toast (Feb 2026)

**User report**: "The home page says newest sticker Scholar Cadet, but inside the circle where I expect the sticker it has that broken image symbol." (Galaxy Fold 5 / Brave)

**Root cause**: `data/stickers.js` was building `ACHIEVEMENT_STICKER_ENTRIES` without `icon` or `color` fields:
```js
{ id, name, category: 'achievements', domain, tier, hint }
```
Collection stickers include `icon` + `color`, so generic consumers (`StickerSpotlight` on Home, `StickerToast` on earn) just render `<img src={sticker.icon} />` — for any achievement that resolved to `<img src={undefined} />` = broken-image icon. The Sticker Book itself was unaffected because it uses the dedicated `AchievementBadge` component for the fancy Cadet/Pro/Master framing. This bug affected **all 18 achievement badges**, not just Scholar Cadet.

**Fix**: Merged `DOMAIN_MAP` import from `achievements.js` and populated each achievement entry with:
- `icon` → the domain's mascot icon (e.g. Scholar → `charlie-polliwog.png`, Rhythm Reader → its mascot, etc.)
- `color` → the domain's color

Verified on Home spotlight: seeded `ach_scholar_cadet` now renders Charlie Polliwog inside the circle, `imgComplete: true`, `naturalWidth: 696` (real image).

### Files touched
`stickers.js` (added DOMAIN_MAP import; enriched ACHIEVEMENT_STICKER_ENTRIES with icon/color).

---


## Spacebar hold + Clubhouse Chatter (Feb 2026)

### Spacebar hold in Who's Got The Rhythm (`BoomGardenPage.js`)
**User quote**: "I dont necessarily want to punish users for not sustaining through the full length of note. I don't, however, want it to play a bunch of successive notes when holding down spacebar."

**Fix**:
- Added `if (e.repeat) return;` guard in the keydown handler. Browsers auto-fire `keydown` while a key is held, which was producing a torrent of `handleSnareTap()` calls. Now: **one press = one tap**, regardless of hold duration.
- Added a `spaceHeld` state that pulses a soft purple sustain ring around Stew while Space is held (framer-motion, exit-animated). Purely cosmetic — scoring is untouched, so kids who don't hold long enough are not penalised. Kids who instinctively hold through half/whole notes get visible acknowledgement.
- Verified: dispatched 1 real keydown + 30 repeated (`repeat: true`) keydowns during input phase. Only 2 UI chips appeared (initial tap + one forward-walk auto-miss). Without the guard, this would have been 30+.

### Clubhouse Chatter (`FunFactsPage.js`)
**User quote**: "Let each Fun Facts friend play a tiny voice or instrument sound the moment they're revealed to make the discovery pop."

**Implementation**:
- Added a `chatter` field to each entry in `SCENE_CHARS` mapping to an existing SFX asset:
  - Chunk → `sfx-piano-flourish.mp3`
  - Finn → `sfx-drum-fill.mp3`
  - Dr. Jellybone → `sfx-detective.mp3`
  - Stew → `sfx-kazoo-honk.mp3`
  - Jazzy → `sfx-bell-pair.mp3`
  - Charlie → `sfx-dj-scratch.mp3`
  - Lou → `sfx-twinkle.mp3`
- In `showFact`, on FIRST find only (`isFirst === true`), spawn a soft `new Audio(chatter)` at volume 0.55. Autoplay-rejection is silently caught so nothing breaks if the browser gates it.
- Verified via Playwright Audio-constructor interception — confirmed correct SFX firing (detective for Dr. Jellybone, bell-pair for Jazzy, twinkle for Lou) on first find, no double-play on re-tap.

### Files touched
`BoomGardenPage.js`, `FunFactsPage.js`.

---


## Fun Facts Clubhouse — Lou & Stew split into standalone characters (Feb 2026)

**User request**: "For the fun facts clubhouse. I want to add stew... replace Lou with the png that is titled something like Lou no Stew... put a standalone stew up in the top right corner... give stew some fun facts as well."

**What changed**:
- `FunFactsPage.js` `SCENE_CHARS` array: replaced the combo `Lou & Stew` entry with two standalone entries — `Lou` using `lou.png` (llama alone, no parrot on shoulder) at his old position (78%, 65%), and a new `Stew` using `stew.png` (green parrot) at the top-right tree area (88%, 18%, width 7%, swing anim).
- Intro copy: "Find all 6 friends!" → "Find all 7 friends!".
- `stickers.js`: replaced legacy `char_loustew` sticker with two new stickers — `char_lou` (icon `lou.png`, hint "Find Lou in the Fun Facts Clubhouse") and `char_stew` (icon `stew.png`, hint "Find Stew in the Fun Facts Clubhouse").
- `musicFacts.js`: renamed the `'Lou & Stew'` key to `'Lou'` (world-music facts unchanged); the existing `Stew` facts entry (kazoo & bird sounds) is now wired to the standalone Stew in the scene.

**Verified**: Manual screenshot after force-marking all 7 found — Stew visible in top-right tree area, Lou standalone (no parrot on shoulder) in bottom right, 7/7 progress reads correctly.

### Files touched
`FunFactsPage.js`, `stickers.js`, `musicFacts.js`.

---


## Robot Boogie card SFX removed + speed slider tightened

- **Removed the SFX preview from the Robot Boogie tile** (`CreateMenuPage.js`). The source stem is an 8-second loop, so even the 500 ms cap read as "a second of music that abruptly cuts out" when you clicked the card. Card click now navigates silently — the Robot Boogie page itself stays fully muted until the first Club Member is tapped.
- **Speed slider tightened**: `SPEED_MIN` 0.8 → 0.9, `SPEED_MAX` 1.5 → 1.2 (`RobotBoogiePage.js`). Confirmed via Playwright — slider min/max attributes now read 0.9 / 1.2.

### Files touched
`CreateMenuPage.js` (removed `sfx:` on robot-boogie tile), `RobotBoogiePage.js` (speed constants).

---



## Robot Boogie loop gap — MP3 encoder-silence trimmed (testing_agent verified)

**🐛 Bug**: "The loop isn't perfectly clean — extra 16th beat of time before it starts over."

**Root cause**: Every stem MP3 in `/app/frontend/public/assets/audio/robot-boogie/` decodes to **11.024 s**, but the actual musical content is only **~10.984 s** — the extra ~40 ms is MP3 encoder-added silence (20 ms lead + 20 ms tail on most stems). `AudioBufferSourceNode.loop = true` was replaying the entire buffer including that silence, so the loop point was audibly late.

**Fix** in `useRobotBoogieAudio.js` source-creation block:
- `src.loopStart = 0.020` and `src.loopEnd = 10.984` (clamped to `buf.duration - 0.001` defensively) so Web Audio jumps back to loopStart the moment it hits loopEnd, cutting the dead air.
- `src.start(startTime, LOOP_START)` starts playback at the offset too, so the head silence is skipped on the very first pass (otherwise it'd be gapless from loop 2 onward but not loop 1).
- `loopDurationRef.current` now stores `LOOP_END - LOOP_START` (10.964 s) so the beat-pulse math stays accurate.
- Tunable — if a future stem set has different padding, adjust the two constants.

**Verified by testing_agent iteration_19**: static check confirmed constants + `src.start(startTime, LOOP_START)` present; behavioral smoke test (25 s of playback, 2+ loop cycles) showed no console errors, character glow + drum sprite behavior normal.

### Files touched
`useRobotBoogieAudio.js` (loopStart/loopEnd + LOOP_START-offset start).

---



## Card tune + audio-leak bug fix

- **🐛 Bug fix (testing_agent verified iteration_18.json)**: Robot Boogie audio "starts on entering and doesn't stop on leaving." Root cause was NOT the game page — it was `SubMenuPage.Tile.handleClick` playing `tile.sfx` via `new Audio()` on card click. Robot Boogie's sfx pointed to `robot-synth-1.mp3` — an 8-second loop stem, not a short blip — and the HTMLAudioElement lived in a JS closure (not the React tree), so it kept playing after route change. **Fix**: 500ms `setTimeout` in `Tile.handleClick` sets volume=0, pause(), `removeAttribute('src')`, and `load()` to cleanly dispose. Confirmed by testing_agent: jam-session and beat-lab tiles show `paused=true, volume=0` at 700ms post-click; Robot Boogie tile follows the same code path.
- **Robot Boogie card hero** — `charWidthPct` 55 → 45 (17% smaller per user "bring him down 15–20%")
- **Jam Session card Charlie punk** — `charWidthPct` 32 → 35 (+9% per user "10% bigger")

### Files touched
`SubMenuPage.js` (SFX cap), `CreateMenuPage.js` (both charWidthPct tunes).

### Verified
- Audio bug: testing_agent iteration_18 100% pass, retest_needed=false
- Sizes: screenshot of Create menu shows both cards at correct hero proportions

---



## Robot Boogie card redo + 9 new stickers

- **New card background** `robot-boogie-card.svg` — a "spotlight stage" scene (purple radial gradient + yellow spotlight cone + hint of disco floor tiles at the bottom). Replaces the busier Lab SVG that didn't work for the card.
- **Hero size fixed**: Robot 1's neutral PNG was 512×288 but he only occupied pixels 187–316 (~25% of frame width). Cropped a card-specific hero to `robot1-card-hero.png` (153×245). Card now uses this + bumped `charWidthPct` 34 → 55, so Robot 1 fills the card as intended.
- **9 new Robot Boogie stickers** (all icons verified present):
  - 8 Club Members: `boogie_robot1`, `boogie_robot2`, `boogie_chunk`, `boogie_finn`, `boogie_charlie`, `boogie_jazzy`, `boogie_jellybone`, `boogie_lou` — each uses that character's neutral PNG as the sticker artwork.
  - 1 milestone: `boogie_full_band` — earned when all 8 characters are dancing at the same time.
- New category `boogie` (label "Robot Boogie Band") added to `STICKER_CATEGORIES` so they get their own section in the sticker book.
- **Wired up in `RobotBoogiePage.handleCharacterClick`**: `earnSticker(\`boogie_${charId}\`)` on activation + `earnSticker('boogie_full_band')` when the eighth character joins. Verified via `localStorage.jma_stickers_v1` — `boogie_robot1` and `boogie_lou` recorded correctly after taps.

### Files touched
`CreateMenuPage.js` (bg + hero swap + size bump), new `/app/frontend/public/assets/backgrounds/robot-boogie-card.svg`, new `/app/frontend/public/assets/robot-boogie/robot1-card-hero.png`, `stickers.js` (9 new stickers + `boogie` category), `RobotBoogiePage.js` (earnSticker import + calls).

---



## Jelly Jukebox tile polish + colorblind audit

- **Slowed tile cycle**: 1.44s → **3s** loop with 1s stagger. Reads as a steady disco pulse instead of a rapid strobe.
- **Results screen** (`gameState === 'finished'`) now uses the same 3-state tile-floor cycle as the playing screen. Added a soft radial-scrim overlay (dark 0-55% opacity) so the trophy + score numbers still pop against the moving colorful floor.
- **Colorblind analysis of the 7 lane colors** (report in Q&A below — no code change made pending user direction). Confusion risk pairs (perceptual distance < 60 in transformed space):
  - Deuteranopia: **Re↔Mi** (d=44), **So↔La** (d=54)
  - Protanopia:  **Re↔Mi** (d=44), **So↔La** (d=59)
  - Tritanopia:   **Re↔Mi** (d=54)
  Mitigation already in place: every lane is triple-labeled (solfège + number + unique bell character shape), so kids can distinguish even if 2 colors merge. FALLING bells still primarily rely on color, though — a future fix could add per-bell shape/pattern differentiation.

### Files touched
`RhythmGamePage.js` (slowed cycle, added tile cycle to finished state), `index.css` (untouched — keyframe re-used).

---



## Card + gameplay backgrounds

- **CreateMenu Robot Boogie card**: swapped `robot-boogie-scene.png` → new `robot-boogie-lab.svg` (static Lab background extracted from `BgLab` component, same flat art style — animations stripped so it works as a `background-image` URL).
- **Jelly Jukebox — PLAYING screen**: replaced `sunburst-cool` gradient with a 3-layer cross-fading disco tile floor using the user's 3 color-swap PNGs (`jukebox-floor-1/2/3.png`). Each layer runs the new `jjFloorCycle` 1.44s CSS keyframe with staggered 0/0.48/0.96s starts so the tiles look like they change colors on the beat. Kept the pulsing sunburst overlay but switched it to `mixBlendMode: overlay` at 35% opacity so it enriches the disco floor without hiding it.
- **Menu screen unchanged** — user "LOVED" the original menu, so `RhythmGamePage.js` menu render still uses `jelly-jukebox-scene.png` unchanged.

### Files touched
`CreateMenuPage.js` (bg swap), new `/app/frontend/public/assets/backgrounds/robot-boogie-lab.svg`, `RhythmGamePage.js` (playing state tile-floor cycle), `index.css` (`jjFloorCycle` keyframe).

### Verified
Screenshotted CreateMenu (Robot Boogie card shows the Lab), Jelly Jukebox menu (unchanged, still the beloved scene), and 3 sequential frames of the playing screen showing the tile floor visibly shifting colors on each frame — cross-fade confirmed working.

---



## Sticker & Meta-Progression Audit — bug found + fixed

User asked for a full review of stickers, meta-progression, rename artifacts, and PNG integrity. Findings + fixes:

### 🐛 Real bug: 12 of 12 song stickers were unearnable
`RhythmGamePage.js` awards stickers on song completion via `` `song_${selectedSong.id}` `` where `selectedSong.id` comes from `data/songs.js` (16 songs with ids like `jma_play_one_skip_one`, `ode_to_joy`, `jelly_groove`, etc.). But `stickers.js` defined stickers for 12 non-existent songs (`song_twinkle`, `song_mary`, `song_hot_cross`, `song_row_boat`, etc.) that were never in the library. Result: only 2 of 16 song completions (`when_saints`, `amazing_grace`) actually earned a real sticker; the other 14 silently no-op'd.
- **Fixed** in `/app/frontend/src/data/stickers.js`: replaced the 12 stub song stickers with the 16 correct entries mapped 1:1 to `songs.js` ids. All 16 song completions now earn a real sticker.
- **Verified** by testing_agent (iteration_17.json) — full static scan of song→sticker mapping shows 16/16 matched, 0 missing, 0 extra.

### ✅ Everything else clean (testing_agent confirmed)
- All 33 `earnSticker()` static call sites reference existing sticker ids
- All 54 icon PNG paths resolve to real files
- No user-facing display strings reference retired game names (Boom Garden / Stew's Rhythm Academy / Rhythm Academy) — only internal filenames + route paths retain them, which is fine
- Meta-progression standards correctly implemented: `useRank.js` derives rank from **achievement** stickers only (not collection); `ranks.js` enforces cross-domain requirements (Maestro needs 3 domains at master); `earnAchievement` enforces cadet→pro→master ladder within each domain; the 7-tier ladder is coherent

### 🎨 Unused PNG candidates in `/app/frontend/public/assets/characters/`
Not added — flagged for user decision:
- `charlie-captain-head.png` (700×540) — could be a "Captain Charlie" outfit
- `charlie-studio.png` (663×700) — could be an outfit unlock tied to Song Studio
- `charlie-head.png`, `finn-head.png` — head-only crops, better suited for UI thumbnails
- `lou.png`, `shark.png` — bare sprites, likely duplicates of existing neutrals

### Reusable static-check script
`/app/test_reports/static_check.py` — run after any data file change to catch regressions (song↔sticker sync, PNG paths, earnSticker call validity, rename artifacts, meta-progression structure). Exit 0 = clean.

### Files touched
`stickers.js` (song stickers realigned to library ids).

---



## Feb 30, 2026 (past-midnight) — Robot Boogie v9.2: small polish

- **Reset now also resets tempo** to 1.0×. Kids often scrub the slider — Reset should be a true clean slate.
- **"TAP A PAL BELOW" → "TAP A CLUB MEMBER BELOW"** — matches the JMA Club Members naming across the app.
- **Rounded orange rectangle on bottom-tile click FOUND AND REMOVED**. Was a lingering `<motion.div className="absolute inset-0 rounded-2xl" style={boxShadow: ...}>` inside CompactChar tied to the `zapping` flash — designed as a bright bloom on activation, but read as a distracting focus box. The character's own color-matched drop-shadow glow (via img filter) is enough activation signal on the compact tile.
- Also added belt-and-suspenders `outline: none` + `-webkit-tap-highlight-color: transparent` inline styles and a global `[data-testid^="robot-boogie-char-"]:focus, :focus-visible` rule with `::-moz-focus-inner` reset so Firefox can't sneak in a dotted outline either.

### Files touched
`RobotBoogiePage.js` (Reset resets speed, wording, CompactChar zap-flash removed, outline hardening), `index.css` (focus rules).

### Verified
Screenshotted click-on-bottom-tile within 120 ms of release — no rectangle, just the compact tile's own drop-shadow glow. Playwright `input_value` on slider confirmed 1.4 → 1.0 on Reset. Empty-state DOM check confirmed "TAP A CLUB MEMBER BELOW".

---



## Feb 30, 2026 (nearly midnight) — Robot Boogie v9.1: 5-point polish

- **Speed chip → slider**. Continuous native `<input type="range">` from **0.8** (floor per user — anything slower gets uncanny) to **1.5**, step 0.05. Styled with the JMA look: yellow track, black stroke, chunky red thumb with the block-shadow. Turtle 🐢 / rabbit 🐇 icons flank it. `setPlaybackRate` on every source ramps 80 ms so scrubbing is smooth.
- **Random boop**. Boop flourish is now `BOOP_ANIMS[Math.floor(Math.random() * ...)]` instead of round-robin so consecutive taps feel unpredictable.
- **"STAGE" text nixed** from Retro Arcade background. Neon frame + chasing bulbs remain, but the marquee is empty — reads more like a real venue.
- **Confetti on boop**. New `<ConfettiBurst>` component inside CharacterSlot: 14 colored square dots fly out along random vectors and fade via a single CSS keyframe (`confettiFly`) driven by per-dot `--dx / --dy / --rot` custom properties. Fires-and-forgets — remounts fresh with each new `boopKey`.
- **Focus-rectangle killed on bottom lineup tiles**. Added `focus:outline-none focus-visible:outline-none appearance-none` to both CompactChar AND CharacterSlot — that was the browser's default button focus indicator lingering after tap.

### Files touched
`RobotBoogiePage.js` (slider, random boop, ConfettiBurst, focus-none), `RobotBoogieBackgrounds.js` (STAGE text removed), `index.css` (slider styles, `confettiFly` keyframe).

### Verified
Screenshotted idle (slider visible in header, no chip) and 2-dancer with fresh boop (confetti squares visibly bursting from Chunk). SVG-text query confirms no `<text>` element remains anywhere on the page.

---



## Feb 30, 2026 (deep evening) — Robot Boogie v9: Interactive playground

Big engagement update per user's ask for "more ways for kids to interact." Six features shipped:

### On active characters (top band)
- **BOOP on tap**: tapping an active character no longer turns them off — it plays a random fun body flourish (spin, flip, jump, wobble, sway) + fires a short synth "stab" percussion hit from the Time Machine + kicks the machine's flash burst. Kids can rapid-tap for endless silly reactions. Toggling a character OFF is now done from the bottom lineup tile (natural mental model: bottom strip = control panel, top band = playground).
- **DRAG to move**: pointer-drag any active character anywhere in the stage. Threshold at 6 px distinguishes tap-vs-drag so short taps still boop cleanly. Position is clamped to keep the character on-screen (±360 x, ±140 y).
- **WHEEL (pinch on mobile-todo) to grow/shrink**: wheel over an active character to scale them between 0.5× and 1.6×. Persists until the kid drags/scales again or hits Reset.
- Reset now wipes drag+scale offsets too so kids start fresh.

### Time Machine as an instrument
- **Tap → percussion stab**: kick body (160→45 Hz sine sweep + snappy env) plus a bandpassed white-noise attack transient. Synthesized with Web Audio, no new audio files needed.
- **Hold → riser + drop**: press-and-hold builds a rising saw + filter-swept noise for up to 3 s; release fires a deep 120→30 Hz kick "drop." Distinguished from tap by a 220 ms threshold.

### Silly-speed dial
- New **Speed chip** in the header row (🎵 Normal / 🐇 Fast / 🐢 Slow at 0.65× / 1.4× / 1.0×). Retunes every currently-running loop source via `AudioBufferSourceNode.playbackRate` — pitch shifts with tempo (which is what "silly speed" means to a kid).

### Bolts follow drag
`LightningStage` now takes a `measureEpoch` prop so endpoints re-measure whenever `charTransforms` changes — bolts follow characters wherever kids drag them.

### Files touched
`useRobotBoogieAudio.js` (added `triggerStab`, `startRiser/stopRiser`, `setPlaybackRate`), `RobotBoogiePage.js` (BOOP_ANIMS, pointer-drag detection, per-char transforms state, Speed chip, TimeMachine hold-riser), `LightningStage.js` (measureEpoch remeasure trigger).

### Verified
- Screenshotted 3-char baseline → speed cycle → boop tap → TM tap. Boop tap on active Chunk kept `data-active="true"` (previously would have toggled off) ✅
- Speed chip visible with 🎵 Normal starting state ✅
- Lightning still lands on characters after all changes ✅

---



## Feb 30, 2026 (very late) — Robot Boogie v8.3: un-pair, un-clutter, un-low

- **All 8 characters un-paired**. Reversed the earlier Jazzy+Jellybone and Robot1+Robot2 team pairings — each character is now its own solo team so all 8 feel individually significant. Jellybone keeps her 2-stem cycle (horns-2 → horns-3) on repeated taps.
- **Retired the "X/N playing" chip**. Read like a scoreboard with 8 chars; the Reset button now stands alone under the header.
- **Plasma source X**: settled at `srcBox.width * 0.47` — halfway between our first attempt (0.5, felt slightly right of the dome) and the over-correction (0.44, too far left). Now emerges cleanly from the machine's visible dome cap.
- **Lou "beam over head" fix**: changed the inner slot scale's `transform-origin` from `50% 100%` (bottom-anchored, which pushed his head down into slot-middle while feet stayed planted) to `50% 50%` (center-anchored, so his midbody lines up with peers' midbodies). Combined with the earlier ref-on-inner-div fix, the bolt now lands on his chest AND he visually sits on the same row as his neighbors.

### Files touched
`RobotBoogiePage.js`, `LightningStage.js`.

### Verified
Screenshotted Lou-solo (bolt lands on chest, source on dome, no chip, Lou on-row), 4-dancer group with un-paired chars firing independently.

---



## Feb 30, 2026 (late) — Robot Boogie v8.2: cleanup & aim fixes

Trimmed the vibe list, killed the top chip clutter, and fixed two aim bugs.

### Backgrounds — down to 4 auto-cycled
- Dropped **Cosmic Dance Floor** and **Silhouette Crowd** (user "doesn't like").
- Retired the manual background picker chip. Background now **auto-cycles every 35s** through: Time-Machine Lab → Retro Arcade → Concert Stage → Deep Navy. Starting scene randomized so return visits feel fresh.
- Beat-toggle chip also removed; internal offset locked to `0.5` (the value user preferred — labels had been backwards).

### Lightning source X
Reversed the previous nudge — source point was already too far right. Now at `srcBox.width * 0.44` (6% left of clickable center) so bolts emerge from the machine's visible dome cap.

### Lou size + aim on triggered
- Slot scale tightened from `0.68 → 0.5 → 0.45`. Lou is now ~10% larger than his peers by request, matching visual weight.
- **Bigger fix**: `slotRef` moved from the OUTER (un-scaled) motion.button to the INNER (scaled) glow-wrapper via a combined callback ref. Previously `getBoundingClientRect()` was returning the full slot rect, so LightningStage aimed at Lou's would-be head at 1× scale — which was way above his actual scaled body ("beam shoots over his head"). Now the rect reflects the visible sprite dimensions and the bolt lands on the scaled character's chest for every character, scaled or not.

### Files touched
`RobotBoogiePage.js`, `LightningStage.js`, `RobotBoogieBackgrounds.js`.

### Verified
Screenshotted Lou-only (bolt lands on his torso, machine source on dome cap), and 4-dancer group (all 4 bolts land on-body, no chip clutter, auto-cycled to Retro Arcade).

---



## Feb 30, 2026 (evening) — Robot Boogie v8.1: Lou fix, rhythm-locked bolts, 6 SVG backgrounds

User feedback on v8: Lou was crazy big (correctly cropped but the OTHER PNGs still have padding); pulse hit "the and of 1" not the downbeat; Lou's neutral wasn't cropped; the bg was stale. Also loved the lightning but wanted it rhythm-locked.

### 🦙 Lou size + neutral crop
- `lou-neutral.png` was cropped the same way as his dance frames (250×288 from 512×288). Originals backed up.
- Added optional `slotScale` field per character (`0.68` for Lou). `CharacterSlot`'s inner glow-wrapper applies `transform: scale(cfg.slotScale)` with `transform-origin: 50% 100%` so his feet stay planted; `CompactChar` applies the equivalent `max-height` correction so the lineup tile matches. Now Lou's visual weight lines up with his neighbors.

### 🥁 Beat phase fix + A/B toggle
- `useBeatPulse` bumped from `BEATS_PER_LOOP = 8` to `16` (four 4/4 bars per loop) — matches the actual authoring of the stems and puts the downbeat on beat 1 instead of the "and of 1".
- Hook now accepts a `phaseOffset` in [0..1) beats. Page exposes a small **On Beat / Off Beat** toggle chip so the user can A/B compare.

### ⚡ Lightning rhythm-lock
- `LightningStage` now takes `beatSubscribe` and imperatively updates the outer `<g>` group opacity: `0.30 + pulse * 0.70` when audio is playing, `0.80` steady before the first tap. Result: bolts crackle bright on every downbeat and fall to a faint plasma trail between beats (Tesla-coil vibe).

### 🎨 Six flat-SVG background scenes (`components/RobotBoogieBackgrounds.js`)
Built in the app's own style — no shading, no bevel, thick black strokes, flat fills.
1. **Time-Machine Lab** — dark concrete floor, red/cyan power cables snaking on the ground, glowing wall panels.
2. **Cosmic Dance Floor** — flat pink/cyan/yellow nebulae with a big perspective checker floor.
3. **Retro Arcade** — big pink neon "STAGE" sign with yellow bulb frame, two colored floor spotlights.
4. **Concert Stage** — brick wall with red curtains, rigging bar with lights, low fog.
5. **Silhouette Crowd** — dark stage with a bobbing black-silhouette crowd along the bottom.
6. **Deep Navy** — plain gradient, characters + lightning do the storytelling.

Cycled via a **Time-Machine Lab / Cosmic Dance Floor / …** chip in the header row. Choice persists via `localStorage.jma_rb_bg_v1`.

### Files touched
`RobotBoogiePage.js`, `useBeatPulse.js`, `LightningStage.js`, new `RobotBoogieBackgrounds.js`, `lou-neutral.png` (cropped, original backed up under `/robot-boogie/originals/`).

### Verified
Screenshotted at each of the 6 backgrounds with 4 dancers (Robot 1, Chunk, Finn, Lou) — Lou's proportions now match neighbors, bolts land on each dancer's chest with team color, all six backgrounds render cleanly in flat art style.

---



## Feb 30, 2026 (pm) — Robot Boogie v8: Special-sauce redesign (lightning + beat sync + steam)

User requested more "special sauce" for Robot Boogie: **Time Machine lab × music-video vibe**, real lightning bolts from the machine to characters, beat-synced world reactions, and reactions from the bottom lineup. Also fixed a P0 layout regression at n=4 and cropped the askew Llama Lou PNG.

### ⚡ New SVG lightning bolts (`/app/frontend/src/components/LightningStage.js`)
Persistent, jittering **plasma bolts** shoot from the Time Machine's top vent up to every active character. Each bolt is a jagged SVG path re-rolled every 130ms so it crackles like real lightning. Team-colored outer glow + white inner core stroke, Gaussian-blur filter for the halo. When a character is freshly zapped, the bolt gets **thicker and forks with a branch**. Anchored to per-character refs via `getBoundingClientRect` so the endpoints follow layout changes and window resizes exactly. Replaces the old PNG lightning frames (which the user hated: static, low-res, misaligned).

### 🥁 Beat-locked visual clock (`/app/frontend/src/hooks/useBeatPulse.js`, updated `useRobotBoogieAudio.js`)
`useRobotBoogieAudio` now exposes `getAudioClock()` returning `{ audioTime, startTime, loopDuration }` from the same Web Audio timeline the stems are looping on. `useBeatPulse` runs a single RAF loop and derives `{ beat, phase, beatFrac, pulse }` (8 beats per loop). Consumers subscribe imperatively so nothing rerenders at 60fps — subscribers just mutate `.style` on refs.

### 🕺 Beat-synced effects
- **Active characters**: drop-shadow glow radius pulses 18→40px on every downbeat, keeping color-matched.
- **Bottom lineup**: inactive characters bob left/right (phase sway) and hop on the downbeat, each with a per-character `bobOffset` for asymmetric dance.
- **Time Machine**: warm orange under-glow ellipse pulses opacity + scale on the beat.
- **World**: subtle radial world-pulse layer on `mix-blend: soft-light` brightens on downbeat.
- **Floor**: alternating orange/cyan disco-floor bloom flickers behind the lineup.

### 💨 Time Machine steam puffs
Every character toggle now spawns two rising white blobs from the machine's top vent — CSS keyframe `robotBoogiePuff` (translate + scale + fade) auto-clean up after 1s.

### 🔧 P0 fix: n=4 layout single-row
Reworked width/margin math so n=4 fits in ONE row (`widthPct 28% / maxW 340px / negMx 22px` → outer 296px × 4 = 1184<1200 ✓). At n≥5 sprites shrink further (24% / 20%) and the active band gets `max-height: calc(100vh - 340px)` so wrapping rows never push the Time Machine into the compact lineup. Metrics verified via `getBoundingClientRect`: `bandOverlapsMachine: False`, `overlap: False`.

### 🦙 Llama Lou PNG re-cropped
Source frames had ~50% empty transparent space on the left (Lou was drawn askew). Bounding-box analysis showed content at x=255..455 on a 512-wide frame. Cropped all 6 dance frames identically to `230..480` → 250×288 (originals backed up to `/lou-dancing/originals/`). Lou now centered in his slot.

### Files touched
`RobotBoogiePage.js`, `useRobotBoogieAudio.js`, new `LightningStage.js`, new `useBeatPulse.js`, `index.css` (added `robotBoogiePuff` keyframe), Lou dance frames (cropped in place).

### Verified
Screenshotted at n=0, 1, 2, 4, 6, 8 (desktop 1280×800). Bolts trail every dancer with color-matched glow. n=4 single row confirmed. Steam puff bursts visible on activation. Lightning branches on zap. Compact lineup pulses on tap.

---



## Feb 28, 2026 (night) — Robot Boogie v7: NEW Jazzy playing sprite + sprite zoom

User dropped in the proper Jazzy playing PNG (trumpet up, pink mohawk, red vest, white pants, red boots — the works). Also identified the root cause of the "too much padding" complaint: **the source PNGs themselves have ~25 % transparent margin baked in on each side**, so no amount of CSS layout tightening was going to close the gaps. Fixed both in one pass.

### 🎺 New `jazzy-playing.png` in the tree
Downloaded to `/app/frontend/public/assets/robot-boogie/jazzy-playing.png` (1920×1080). `CHARACTERS[jazzy].playingSingle` now points back to `jazzy-playing.png` (was reusing `jazzy-neutral.png` as a workaround). The CSS `jazzyWobble` animation still runs on top so she grooves while she plays.

### 🔍 Sprite zoom crops the baked-in transparent padding
`<CharacterSlot>` now accepts a `spriteZoom` prop (default 1, band passes 1.4). The zoom is applied via `transform: scale()` on the inner sprite-flex container, `transform-origin: bottom center` (feet stay planted), and the outer `<motion.button>` uses `overflow: hidden` to clip the overshoot. Net effect: the same-source PNG shows ~40 % more character in the same slot, so adjacent dancers visually touch without needing negative margins or layout tricks. Compact lineup keeps zoom=1 since those tiles are already tiny.

### Verified
Playwright at desktop:
- Solo Jazzy — **NEW sprite** filling the frame with all her outfit details visible, wobble animation running.
- 4 dancers — Chunk + Finn on top, Charlie + Jazzy on bottom, characters sit noticeably closer (no more oceans of transparent air), Time Machine + lineup all fit.
- 6 dancers — 3 + 3 with Chunk, Jellybone (sax jellyfish), Finn on top and Charlie, Lou (unicorn), Jazzy on bottom. Tight composition.

---



Iteration on v5 per user: "the padding for the performers... they can be closer. When 4 are active, they are too big. Time machine 20 percent bigger."

### 🕰 Time Machine +20%
`clamp(170px, 26vw, 320px)` → `clamp(205px, 31vw, 385px)`. Halo behind it scaled proportionally (`clamp(220px, 36vw, 440px)` → `clamp(265px, 43vw, 520px)`). Measured on desktop: TM is now 385 × 216 px (was ~260 × 146).

### 🎽 n=4 dancers scaled down 15% + wider slot
- Each n=4 dancer now renders inside a `transform: scale(0.85)` wrapper — visually smaller than 1/2/3-dancer counts (which stay at scale 1). Layout width unchanged so the 2+2 wrap math still holds.
- Slot aspect is `4/3` for n=4 (was `1/1`). Landscape slots are less tall, so both rows + Time Machine + lineup all fit above the fold on 1280×800 without pushing the TM off-screen.

### 📐 Slot aspect ratio tightened for all counts (`3/4` → `1/1`)
Sprites are 16:9 landscape. In the old 3:4 portrait slot each dancer had ~55 % empty vertical space; the square slot cuts that in half and pulls wrapped rows visibly closer together. `CharacterSlot` now takes a `slotAspect` prop with default `'1 / 1'`, allowing the band to override per-count.

### Verified
Playwright at desktop confirms: solo Jazzy centered with big Time Machine below; 4 dancers → 2+2 with visibly smaller characters and both rows + TM fully in frame; 6 dancers → 3+3 with tighter row spacing than v5.

---



Two-part follow-up per user: "put the robots first and last… order left to right: Robot 1, Chunk, Dr Jellybone, Finn, Charlie, Lou, Jazzy, Robot 2. Padding is too much between characters."

### 🔀 New character order (single source of truth)
`CHARACTERS` array in `RobotBoogiePage.js` is now in this order — used for BOTH the compact bottom lineup and the active band above it:

1. Robot 1
2. Chunk
3. Dr Jellybone
4. Finn
5. Charlie
6. Lou
7. Jazzy
8. Robot 2

Team & stem mappings are unchanged (see `TEAMS`), but the visual reading order matches the user's spec.

### 📏 Tighter spacing
- Active-band gap: `gap-x-1 md:gap-x-2` → `gap-0`. Characters now sit right next to each other; the transparent whitespace baked into each 3:4 slot still keeps them from touching.
- Lineup gap: `gap-1.5 md:gap-3` → `gap-0 md:gap-1`. The 8 lineup tiles sit almost flush on mobile and only get a 4 px breath on desktop.

### 🧮 Width math re-tuned for zero gap
With `gap-0`, the wrap trigger is strictly `N × width > 1200 px`. Earlier caps of `maxW = 300px` for 5-6 dancers put them *exactly* at 4×300 = 1200 and the browser fit them on one row. Bumped:
- 5–6 dancers: `maxW 300 → 340px` (4×340 = 1360 > 1200 → wraps to 3-per-row)
- 7–8 dancers: `maxW 240 → 260px` (5×260 = 1300 > 1200 → wraps to 4-per-row)

### Verified via automation
Playwright confirmed lineup order matches the new spec; band layouts observed: 1 → solo, 2 → row of 2, 3 → row of 3, 4 → 2+2, **5 → 3+2**, **6 → 3+3**, 7 → 4+3, 8 → 4+4. All character positions filled with the correct dancer.

---



Polish pass on the v4 redesign per user feedback ("Jazzy is not animating when she's up. I like this much better, but after 3 friends they get too small. Can we do two rows after 3?").

### 🕺 Jazzy's wobble now actually wobbles
Root cause: framer-motion's keyframe `animate` prop with `repeat: Infinity` refuses to loop when the parent is an `<AnimatePresence layout>` wrapper — the outer `layout` animations fight with the inner transform-based keyframes. framer-motion sets Jazzy's transform to the FIRST keyframe (`-5deg`) and then leaves it there.

Fix: switched Jazzy's playing sprite from `motion.img` with animate keyframes to a plain `<img>` with a CSS `@keyframes jazzyWobble` animation applied via inline `style.animation`. Verified via automation: `getComputedStyle(img).transform` now cycles through the three keyframes correctly.

Added the keyframes rule to `index.css`:
```css
@keyframes jazzyWobble {
  0%   { transform: rotate(-5deg) translateY(0); }
  50%  { transform: rotate(5deg)  translateY(-8px); }
  100% { transform: rotate(-5deg) translateY(0); }
}
```

### 🎼 Band wraps to 2 rows after 3 dancers
Active-band container is now `flex flex-wrap content-end` and each dancer's width is tuned so the total row shape matches the user's brief:
| Dancers | Layout |
| --- | --- |
| 1 | 1 huge soloist (440 px cap) |
| 2 | Row of 2 (360 px each) |
| 3 | Row of 3 (300 px each) |
| **4** | **2 × 2** (420 px each) |
| **5** | **3 + 2** (300 px each) |
| **6** | **3 × 2** (300 px each) |
| **7** | **4 + 3** (240 px each) |
| **8** | **4 × 2** (240 px each) |

Widths are percentage-based so the wrap decision holds on any viewport width; `maxWidth` in pixels stops a soloist from becoming grotesquely wide on ultrawides.

### 🎯 Padding tightened
- Playing-chip zone: `pt-14 md:pt-20 pb-1` → `pt-14 md:pt-16 pb-0` (chip sits closer to header).
- Main-stage horizontal pad: `px-3 md:px-6` → `px-2 md:px-4`.
- Time Machine zone: `py-1 md:py-2` → `py-0` (band and TM sit closer).
- Character lineup: `pt-1 md:pt-2` → `pt-0`.

### Verified via automation
Screenshots at desktop (1280×800) confirm 1/2/3 in a single row; 4 → 2+2; 5 → 3+2; 6 → 3+3; 8 → 4+4. Jazzy transform sampled 5× at 200 ms intervals shows genuine rotation cycling. Time Machine still sits below the band with its golden halo and continuous reel.

---



Complete rebuild of `RobotBoogiePage.js` layout per user brief. The old grid-of-8 characters is gone; new visual hierarchy is:

```
[ TITLE + PLAYING CHIP + RESET ]
[ ACTIVE BAND — dancing characters, sized dynamically ]
[ ✨ TIME MACHINE (centerpiece, glow halo) ✨ ]
[ COMPACT 8-CHARACTER LINEUP (always visible, tappable) ]
```

### 🎯 Layout goals hit
- **Time Machine is the visual centerpiece**: dead-center of the page, `clamp(170px, 26vw, 320px)` wide with a radial glow halo behind it. Loops the 8-frame reel continuously while anyone plays, flashes on every character tap.
- **All 8 characters ALWAYS visible** in the compact bottom lineup. No pagination.
- **Active performers appear at the top** and are **significantly larger** than the lineup below — max-width scales with count: 1 dancer = 460px, 2 = 400px, 3 = 340px, 4 = 300px, 5+ = 260px.
- **No background-anchored positioning** — layout uses flex + `flex-1` + `flex 1 1 0%` for share-equally sizing. Background PNG is decoration only; fallback radial gradient behind it keeps the vibe if the image is slow to load.

### 🕰 Time Machine bug fixed
While cycling the animation frames, the idle image was `display: none` and the frame images were `position: absolute` — so the button collapsed to height 0. Fix: idle image now uses `visibility: hidden` while frames play, keeping the layout box intact.

### 🎯 Interaction flow
- `<CompactChar>` (new component) is the primary tap target — a small tile at the bottom that toggles the character on/off. Selected tiles get a bright colored ring + drop-shadow.
- Every tap ticks a shared `flashKey` counter, which `<TimeMachine>` watches and fires a quick scale-burst — so kids visually connect their action to the centerpiece.
- Active characters materialize in the top band with a spring-scale entrance (`AnimatePresence` + `layout` for smooth re-flow when a new dancer joins).

### 🥁 Chunk → single drum stem (`robot-drum-3`) per user request
Chunk now plays only `robot-drum-3`. Lou keeps `robot-drum-1`. `robot-drum-1-1` and `robot-drum-2` are temporarily orphaned. Chip still reads `N / 6 playing`.

### Verified via automation
- Idle: "0 / 6 PLAYING", empty band with a friendly hint (`TAP A PAL BELOW / The Time Machine will zap them onto the stage ⚡`), Time Machine centered with its glow, 8-char lineup at bottom.
- 1 dancer: single character huge and centered (460px max), Time Machine below, that character's lineup tile has a colored ring.
- 3 dancers: three characters share the top row, each 340px max, still clearly larger than lineup.
- 6 teams active (all 8 chars): all 8 fit horizontally at 260px each, mix chip reads `6 / 6 PLAYING`.
- Mobile emulation (390 × 780): compact stack works — chip on top, big characters in mid-frame, Time Machine glow near bottom, 8-char lineup at the very bottom edge.

---



Follow-up refinement per user: "when you toggle one of the pair members, don't disable the other's animation, just cycle to the next sound, but they'll both play/dance together. And for Lou, I want him to be drum-1. He can play at the same time as Chunk for now. Chunk gets all drums but the one."

### 🕺 Both pair members dance together (only sound cycles)
Previous v2 pairing SWAPPED members — activating Jellybone deactivated Jazzy. Now they groove side-by-side; only the audible stem cycles.

State model changed from `teamState[teamId] = { charId, stemIndex }` to two decoupled maps:
- `dancing[charId]: bool` — per-character visual state, independently toggled.
- `teamStemIndex[teamId]: number | null` — index into `TEAM_STEMS[teamId]` for the ONE stem the team is currently playing (or null).

Click behavior:
| Tap on char C in team T | Effect |
| --- | --- |
| C not dancing, team silent | C dances; team stem = 0 (first stem plays) |
| C not dancing, team already playing | C joins the dance; team stem advances by 1 (mod cycle length), old stem mutes, new one plays |
| C already dancing, others in T still dancing | C stops dancing; **sound continues** — the other members hold the groove |
| C already dancing, last dancer in T | C stops dancing; team goes silent |

### 🥁 Lou → solo drum-1; Chunk keeps drum-1-1 / 2 / 3
`CHARACTERS.stems`: Chunk lost `robot-drum-1` (now `['robot-drum-1-1', 'robot-drum-2', 'robot-drum-3']`); Lou gained `robot-drum-1` (was `robot-synth-1`).

Lou is his own solo team → 6 total teams: `bass`, `drum`, `guitar`, **`lou`**, `horns` (Jazzy + Jellybone), `synth` (Robot 1 + Robot 2). Chip now reads "N / 6 playing".

`robot-synth-1` is temporarily orphaned (no character/team plays it). The audio hook still preloads it; it just stays muted until a character is reassigned to it later.

### Verified via automation
- **Idle**: `0 / 6 PLAYING`.
- **Tap Jazzy**: 1 / 6, `jazzy=true, jellybone=false`.
- **Tap Jellybone (paired co-dance test)**: 1 / 6 — count stays at 1 because horns is still a single-stem slot — but `jazzy=true, jellybone=true` (both dancing). ✅
- **Tap Jazzy off**: 1 / 6, `jazzy=false, jellybone=true` — sound continues while Jellybone holds the groove. ✅
- **Tap Jellybone off (last horn dancer)**: 0 / 6, team silences. ✅
- **Tap Lou + Chunk**: 2 / 6, both `data-active=true` — proves they're in separate teams and play together. ✅
- **Tap all 8**: 6 / 6 PLAYING, every character `data-active=true` — every one visible with their color glow.

---



Two follow-ups on user feedback after the reel/tap-anim polish earlier the same day.

### 🎺 Instrument teams: caps the mix at 5 layers max
Previously all 8 characters could play simultaneously → cluttered mix. User asked for pairing so the max is 1 bass + 1 drum + 1 guitar + 1 horns + 1 synth.

Added `TEAMS` and `CHAR_TO_TEAM` maps to `RobotBoogiePage.js`:
- `bass` → Finn
- `drum` → Chunk
- `guitar` → Charlie
- `horns` → **Jazzy + Dr Jellybone** (shared slot)
- `synth` → **Lou + Robot 1 + Robot 2** (shared slot; Lou parked here per user note "I'll have to change that later")

State model refactored from `charState` (per-character stem index) to `teamState` (per-team `{ charId, stemIndex } | null`). New click behavior:

| Team state before tap | Result |
| --- | --- |
| null (team off) | Team turns on, tapped char plays their stem 0 |
| Same char is active, stems remain | Advance to their next stem |
| Same char is active, at last stem | Team turns off |
| Different char is active | **Swap** — old member mutes, tapped member plays their stem 0 |

Counter chip now reads "N / 5 playing" (teams, not characters). Zap lightning bolt only fires when the tap actually activates or swaps a character (not on turn-off).

### 🦵 Jazzy's legs: reuse her neutral image for the "playing" state
`jazzy-playing.png` is a torso-only crop — her feet were never drawn on the sheet, so no CSS offset can add them back (Feb 28 morning's `playingOffsetY: -10%` was cosmetic only). Fix: swap `playingSingle` from `jazzy-playing.png` to `jazzy-neutral.png` so her full body + red boots stay visible while playing. The wobble+hop framer-motion animation on the sprite (`rotate: [-5, 5, -5], y: [0, -8, 0]`) sells the "playing" motion; kids see her grooving without noticing the trumpet pose didn't change.

**Follow-up needed from user**: If a proper "playing" pose with legs becomes available, drop it in and point Jazzy's `playingSingle` back to it.

### Verified
Automation confirmed:
- Idle → "0 / 5 playing"; tap Jazzy → "1 / 5 playing" with `data-active` flipped to true only on Jazzy (jellybone stays false).
- Tap Jellybone next → jazzy `data-active=false`, jellybone `data-active=true` (clean swap, one horn stem).
- Tap all 8 characters in sequence → chip shows "5 / 5 playing"; active flags: `finn=true, chunk=true, charlie=true, jazzy=false, jellybone=true, lou=false, robot1=false, robot2=true`. Exactly one member per team, matching user's spec.
- Jazzy's full sprite (with red boots) visible in the active screenshot.

---

## Feb 28, 2026 (morning) — Robot Boogie polish (Time Machine reel + tap flourish)

Follow-up polish per user feedback after v2 rebuild. All fixes in `pages/RobotBoogiePage.js`.

### 🎺 Jazzy's legs: initial attempt (superseded — see afternoon entry)
Source PNG `jazzy-playing.png` is a torso-up crop (feet not drawn on the sheet). Bottom-aligning it made her hips clip against the frame's bottom edge and look decapitated at the waist.
- Added optional `playingOffsetY` field on each `CHARACTERS` config entry.
- Set `playingOffsetY: '-10%'` on Jazzy — shifts her whole "playing" sprite up 10% so the transparent bottom of the PNG becomes empty stage floor rather than a hard clip at her hips.
- **Superseded**: user reported this was still visibly cropped. Afternoon fix swaps to `jazzy-neutral.png` for the playing state instead.

### 🕰️ Time Machine loops continuously while any character plays
Previously the 8-frame reel only fired once per toggle (via a `zapKey` counter). Now behaves like the disco ball — always in motion while music plays, idle when silent.
- `<TimeMachine>` prop changed from `zapKey` to `anyActive` (derived from `activeCount > 0` in the parent).
- `useEffect` starts a 100 ms interval that cycles `frame = (frame + 1) % 8` while `anyActive`, clears it and reverts to idle when everything is muted.

### ⚡ Time Machine now tappable with Shield-style flourish
Added the same easter-egg tap loop as the Home page shield.
- Element switched from `<div pointer-events-none>` to `<motion.button>` with `whileHover`/`whileTap`.
- New `TIME_MACHINE_ANIMS` array of 5 variants (wobble, spin, pop, flipY, shimmy). Deterministic cycle via `hitsRef` so back-to-back taps never repeat.
- Reel-frame `<img>` elements marked `pointer-events-none` so clicks always go to the button, not a child image.
- Reset button no longer bumps a zapKey (obsolete) — reset simply mutes stems + clears state.

### Verified
Automation confirmed:
- Idle scene: all 8 characters grayed, time machine shows `time-machine-idle.png`, "0 / 8 PLAYING" chip visible.
- After tapping Jazzy: Jazzy colored-in with **full red boots visible**, glowing yellow drop-shadow, "1 / 8 PLAYING" chip, time machine glowing (reel running).
- Tapping the time machine plays the tap animation (position shift + rotate variants) even when no character is active.


## Feb 27, 2026 (later still) — Robot Boogie v2 rebuild

User feedback was rough on v1: loops out of sync, characters tiny, animations not playing, time machine covering the disco ball, name plates unwanted. Full rebuild:

### 🎵 Audio: HTMLAudioElement → Web Audio API (sample-accurate sync)
`hooks/useRobotBoogieAudio.js` rewritten. Root cause of v1's drift: `<audio loop>` in HTMLAudioElement is NOT sample-accurate — MP3 seek can gap by tens of ms per lap, so within a few loops the 12 stems drift wildly.
- v2 fetches each MP3 → `AudioContext.decodeAudioData()` → in-memory `AudioBuffer`.
- On the FIRST character tap, creates 12 `AudioBufferSourceNode`s + 12 `GainNode`s and calls `.start(startTime)` on ALL of them at the exact same `ctx.currentTime + 0.05` — sample-accurate group start.
- Gain nodes ramp between 0 and 1 over 15 ms on toggle — no audible click.
- Sources never stop until the page unmounts, so the 12 stems stay locked on the same measure grid forever.

### 🎬 Animation: frames now actually cycle
v1's `<img src>` swap forced the browser to fetch each frame on demand, producing flicker/no-play. v2 preloads every playing/dancing frame at mount by rendering them as stacked `<img>` with `display: none/block` toggled on the current-frame index. Verified via automation: at 400 ms deltas Robot 1 goes `01 → 06`, Chunk goes `05 → 02`, Charlie goes `08 → 05`. Animations play the moment a character is toggled active.

### 📐 Layout fixes
- **Characters BIG** (263 px × 351 px each on 1280 viewport, aspect-ratio locked 3:4). Grid switched from a 1-row-of-8 flex-wrap that overflowed the viewport, to a proper 4-col × 2-row CSS grid centered with `mx-auto` inside a 1160 px max-width column.
- **Time machine** relocated from center-top (covering the disco ball on the bg) to `position: fixed` top-right corner. Smaller (96-160 px wide) so it doesn't compete with the character stage.
- **Name plates removed** — kids ID their pals by outfit + song.
- Bottom purple wash raised so the tile floor on the bg still peeks through.

### Also
- Copied `robot-boogie/finn-neutral.png` (which is `Disco Shark Bass nuetral.png` after compression) → `characters/finn-disco.png` per user request.

### Files touched
- `hooks/useRobotBoogieAudio.js` — full rewrite with Web Audio API.
- `pages/RobotBoogiePage.js` — full rewrite: preloaded frame stacks, 4×2 grid, no nameplates, time machine relocated.

---

## Feb 27, 2026 (later) — Theme swap fix: Jelly Jukebox = disco, Who's Got the Rhythm = marching band

User caught a swap error from the previous batch: I'd flipped the visual themes between the two rooms. Corrected mapping:

### 🎯 Correct theme mapping (locked in)
| Room | Background | Character theme |
|------|-----------|-----------------|
| **Jelly Jukebox** (`/rhythm-game`) | Disco / tile floor | Disco outfits (Lou disco, etc.) |
| **Who's Got the Rhythm** (`/boom-garden`) | Football field | Marching band / drum major |

### Fixes shipped
- **`pages/PlayMenuPage.js`** JELLY JUKEBOX tile: bg swapped **football-field.png → jukebox-floor-1.png** (the disco tile floor). Character stays `lou-disco.png`.
- **`pages/LearnMenuPage.js`** WHO'S GOT THE RHYTHM tile: character swapped from `stew-drum` animation → **`chunk-marching.png`**. Bg stays football-field.png.
- **`pages/BoomGardenPage.js`**:
  - Main page bg back to **`football-field.png`** with warm sky-tint overlay (was jukebox-floor-1.png with dark purple tint).
  - All 3 mode-card backgrounds back to **football-field.png**.
  - Mode-card characters swapped to marching-band versions:
    - Parrot Percussion → `chunk-marching.png`
    - Beat Finder → `jazzy-marching.png`
    - Rhythm Run → `charlie-drum-major.png`
  - Title styling: replaced the pink/blue/yellow rainbow drop-shadow (calibrated for a dark bg) with a cleaner **dark + red** shadow suited for the bright football-field sky. Subtitle pill now uses jma-dark + yellow border for team-marching-band feel.

### Files touched
- `pages/PlayMenuPage.js` — JELLY JUKEBOX tile bg.
- `pages/LearnMenuPage.js` — WHO'S GOT THE RHYTHM tile character.
- `pages/BoomGardenPage.js` — main bg, sky overlay, 3 mode-card bg/characters, title/subtitle styling.

---

## Feb 27, 2026 — Robot Boogie mixer game + disco theming + asset compression

Massive drop: user provided 3 zip archives (actionable-now assets, new game assets, fun assets) plus updates to backgrounds, character outfits, and one huge new game.

### 🎛️ NEW GAME: Robot Boogie (`/robot-boogie`, `pages/RobotBoogiePage.js`)
Incredibox-style stem mixer under CREATE. 8 characters, 12 audio stems, all synced in lockstep.

- **Sync design (critical)**: All 12 mp3 loops start playing simultaneously on the FIRST character tap (iOS-legal user gesture). From then on they loop forever in perfect sync — activating a character just flips `.muted = false` on its `<audio>` element. No restarts, no drift.
- **Multi-stem cycling**: Chunk has 4 drum variants (drum-1, drum-1-1, drum-2, drum-3), Dr. Jellybone has 2 horn variants. Each click cycles to the next stem; final click returns to neutral.
- **Character-to-stem mapping**:
  - Finn → bass
  - Chunk → drums (4 variants, cycles)
  - Charlie → guitar
  - Jazzy → horns-1
  - Dr. Jellybone → horns-2/horns-3 (cycles)
  - Lou → synth-1 (dances, doesn't play an instrument)
  - Robo Red → synth-2 (dances)
  - Robo Blue → synth-3 (dances)
- **Visuals**:
  - Time machine centered top; plays 8-frame animation whenever any character is toggled
  - Clicked character shows a 4-frame lightning bolt during the zap
  - Active characters use their playing/dancing animation loop (10 fps) + full-color drop-shadow glow
  - Neutral characters are dimmed (saturate 0.55, brightness 0.75) so it's obvious which pals are "on"
  - Active count + reset button in the header ribbon
- **Route**: `/robot-boogie`. Tile added to `/create` with the disco-scene bg + Robo Red as thumbnail.
- **New hook**: `hooks/useRobotBoogieAudio.js` — preloads all 12 stems, group-starts on first activation, exposes `setStemActive(id, active)` + `muteAll()`.

### 📦 Asset compression pipeline (space savings ~85%)
User flagged the disco background as "WAY too big" and asked to keep the app light. Ran a one-shot Pillow pipeline (`/tmp/compress_assets.py`) that:
- Resized every large PNG to a max 512-1600 px longest edge with `Image.LANCZOS` + `optimize=True`.
- Sampled character animation frame folders down to 8 evenly-spaced frames (from up to 47).
- Net Robot Boogie asset budget: **4.3 MB frames + 5.1 MB audio = 9.4 MB** for a full 8-character mixer.
- Standout wins: JMAtv logo 2.7 MB → 238 KB · Lou 2.1 MB → 217 KB · Curtain BG 1.7 MB → 229 KB · Chunk drums frames 6.7 MB → 721 KB.

### 🎨 Actionable-now asset swaps
- **JMAtv logo**: Replaced `assets/ui/jmatv-logo.png` in-place (the "TV" now matches the shield's yellow). Every reference across RetroTV / JMAtvHomePage / JMAtvPlayerPage / stickers picks up the new art automatically.
- **Marching band Chunk**: New `assets/characters/chunk-marching.png` (drum-major-style Chunk). Ready to swap into Who's Got the Rhythm cards or the report card.
- **Lou standalone**: New `assets/characters/lou.png` (Lou without Stew).
- **Podium + Charlie Lecturn + Curtain BG**: New Lessons page background — dramatic red curtains with Charlie behind a podium anchored bottom-center.

### 🎪 Jelly Jukebox — disco scene
Menu page background swapped from the CSS radial-gradient to `assets/backgrounds/jelly-jukebox-scene.png` (the user's disco scene with jukebox + tile floor). Kept the rainbow-glow title + purple/violet overlay tint on top so the title still pops.

### 🕺 Who's Got the Rhythm — disco floor makeover
- Mode-picker page bg: football-field.png → `jukebox-floor-1.png` (colorful diagonal tile floor).
- Each mode card gets a different tile-floor variant (floor-1, floor-2, floor-3) so the three cards feel distinct.
- Character portraits swapped to disco outfits sourced from the new Robot Boogie art:
  - Parrot Percussion → `chunk-neutral.png` (disco Chunk with drums)
  - Beat Finder → `jazzy-playing.png` (disco Jazzy with trumpet)
  - Rhythm Run → `charlie-neutral-01.png` (disco Charlie)
- Section header restyled: massive rainbow-shadowed "Who's Got the Rhythm" title + "Pick your jam." pill for legibility against the dark floor.

### 📺 Lessons page background
Chalkboard → `curtain-bg.png` (dramatic red curtains) + `charlie-lecturn.png` overlaid bottom-center at z-0 (visible behind the lesson cards). Existing cascade layout untouched.

### Files touched
- `pages/RobotBoogiePage.js` (new)
- `hooks/useRobotBoogieAudio.js` (new)
- `pages/CreateMenuPage.js` (Robot Boogie tile added)
- `pages/BoomGardenPage.js` (disco floor bg, disco character portraits, big rainbow title)
- `pages/RhythmGamePage.js` (disco scene background)
- `pages/LessonsPage.js` (curtain bg + Charlie Lecturn overlay)
- `App.js` (route wiring)
- `/public/assets/backgrounds/` — new: curtain-bg.png, podium.png, charlie-lecturn.png, jelly-jukebox-scene.png, jukebox-element.png, jukebox-floor-{1,2,3}.png, robot-boogie-scene.png
- `/public/assets/characters/` — new: chunk-marching.png; overwritten: lou.png
- `/public/assets/ui/jmatv-logo.png` — overwritten with color-corrected version
- `/public/assets/robot-boogie/` — new (~4.3 MB, all character animation frames + time machine + lightning FX)
- `/public/assets/audio/robot-boogie/` — new (12 mp3 stems, ~5.1 MB)

### Deferred to next batch (user marked "revisit")
- **Spacebar-hold for half/whole notes in Who's Got the Rhythm** — needs deeper scoring change in Rhythm Run. Marked as follow-up.
- **Other animations while playing** in WGTR — cosmetic idea, deferred.
- Fun assets (elephant, flea, seesaw, etc.) — extracted but not wired yet; user said "if there is a place for them".

---

## Feb 22, 2026 (evening) — World overhaul: JELLY JUKEBOX / WHO'S GOT THE RHYTHM rename, NES-cartridge cards, cascade Lessons

User feedback (huge batch): rename swap between two rhythm games, kill sign nameplates + taglines, all-caps NES-cartridge titles, cascade lessons layout, 4th JMAtv channel, streaming-now bug, broken stickers audit.

### 🔴 Critical name swap
- **"Who's Got the Rhythm?"** (falling-notes game at `/rhythm-game`) → **"JELLY JUKEBOX"** (disco-themed with rainbow-glow title, dark purple/violet radial-gradient background, Lou-disco character on the PLAY tile).
- **"Stew's Rhythm Academy"** (rhythm-reading rooms at `/boom-garden`) → **"WHO'S GOT THE RHYTHM"** (updated the two `GameHeader` titles and the file's top-of-file comment).
- **"Echo Stew"** mode → **"PARROT PERCUSSION"** with new tagline *"Stew plays. You play it back."*
- All achievement hints, migration doorway comments, `useNextMission` CTA copy updated.
- Sticker hints referencing "Rhythm Arcade" → "Jelly Jukebox".

### 🎮 NES-cartridge card overhaul (`components/SubMenuPage.js`, all three menu pages)
- Removed the `GAME` / `LESSONS` / `STUDIO` sign nameplate that used to sit in the top-left corner of every tile.
- Removed the speech-bubble mini-callouts ("Find the pairs!", "Repeat after me!", etc.).
- Removed all taglines ("Catch the falling notes!", "Watch, listen, then play it back!", etc.).
- Titles are now massive ALL-CAPS with chunky JMA-dark stroke, multi-color drop-shadow, letter-tracking — reads like Super Mario Bros. cartridge art at a glance.
- Section headers (`PLAY` / `LEARN` / `CREATE`) got the same treatment — 5xl → 7xl, 6px chunky stroke, sectionColor secondary shadow layer, plus a JMA-dark pill for the subtitle so it stays legible on light gradient backgrounds.
- Removed "Coming Soon" was already in the older card — kept intact.

### 🎈 Lou blimp on all three sub-worlds
- Extracted the `BlimpFlyby` component from `HomePage.js` into a shared `components/BlimpFlyby.js`.
- HomePage keeps using it. Play / Learn / Create now render it too via `SubMenuPage`, so the sky feels continuous across the app.

### 📚 Lessons page — cascade layout (`pages/LessonsPage.js`)
- Ripped out the square grid.
- New layout: vertical stacked cards, each 480 px wide max, alternating left/right nudges (±18 px) so the eye travels down a diagonal path.
- Each card: big number badge on the left, lesson title (real name now — TALKIN' BOUT TEMPO / NOTES MCGOTES / SEAHORSE SIESTA / WHO'S GOT THE RHYTHM / HIGH N LOW / DOUGH IS IN PIZZA / JELLY JAMBOREE) on the right in ALL CAPS, status badge (locked/unlocked/watched) at the far right.
- Chalkboard background retained until the user provides the Charlie-behind-podium art.

### 📺 JMAtv (`data/jmatv.js`, `pages/JMAtvHomePage.js`, `pages/JMAtvPlayerPage.js`)
- Channel titles rewritten to ALL CAPS: **FUN FACTS**, **PUNS WITH FINN DANGER**, **JMA MUSIC VIDEOS**.
- Added **4th channel: VARIETY SHOW** — purple palette, `jelly-rap-trio.png` host, empty episodes list. Falls through the existing `Coming soon!` state on the channel page automatically.
- Fixed episode title typo: **"Do is in Pizza"** → **"Dough is in Pizza"** (Music Videos).
- Home tagline still "Pick something. Hit play. Hang out."

### 🏠 Homepage RetroTV (`components/RetroTV.js`)
- "Now on JMAtv" header pill → **"STREAMING NOW"**.
- Removed the "JMAtv" channel label from the CRT's lower controls strip (redundant with the JMAtv brand-bug on the TV screen itself). Speaker grille widened from 52% → 72% to absorb the freed space.

### 🎯 Boom Garden / Who's Got the Rhythm room (`pages/BoomGardenPage.js`)
- Mode-picker page background swapped from the pastel radial-gradient to `football-field.png` (per user's "football field on all cards" direction).
- All three mode cards now share the football-field background with color-tinted overlays so each mode still reads its own hue (BLUE Parrot Percussion / GREEN Beat Finder / ORANGE Rhythm Run).
- Removed the tiny `sign` nameplate from mode tile top-left.
- Titles bumped: bigger, all-caps, chunky stroke, mode-accent shadow + JMA-dark secondary shadow (matches the PLAY/LEARN/CREATE cards).
- Removed the mode blurb text under each title — cleaner, more cartridge-like.
- "Three rhythm games. Pick your jam." → just **"Pick your jam."**.
- Fixed a lingering syntax-corruption issue at the bottom of the file (leftover JSX from an earlier session's search-replace that hadn't cleaned up).

### 🐛 Broken stickers audit
Found 5 sticker IDs that were being called via `earnSticker(...)` but not defined in `stickers.js` — they silently no-oped (the `STICKER_MAP` guard returned false). Each one had a valid `earnAchievement(...)` call already sitting right next to it doing the real work, so removed the dead calls:
- `ach_beat_maker` (LoopStudioPage) → still triggers `earnAchievement('beat', 'cadet')`.
- `ach_ear_trainer` (EarTrainerPage) → still triggers `earnAchievement('ear', 'cadet')`.
- `ach_simon_5` (SimonSaysPage) → still triggers `earnAchievementUpTo('keyboard', 'pro')` at level ≥ 4.
- `ach_song_5` (RhythmGamePage) → replaced with `earnAchievement('rhythm', 'cadet')` on 5-song milestone.
- `songwriter` (SongStudioPage) → still triggers `earnAchievement('song', 'cadet')`.

The `MIGRATION_MAP` in `useStickers.js` still lists these IDs so any kid who earned them under the pre-guard version of the code still gets the corresponding achievement on next load.

### Files touched
- `components/BlimpFlyby.js` (new — extracted from HomePage).
- `components/SubMenuPage.js` (rewrite — NES cartridge tile).
- `components/RetroTV.js` (Streaming Now + label removal).
- `pages/HomePage.js` (uses shared BlimpFlyby).
- `pages/PlayMenuPage.js` (rewrite — JELLY JUKEBOX, no taglines/signs).
- `pages/LearnMenuPage.js` (rewrite — WHO'S GOT THE RHYTHM, no taglines/signs).
- `pages/CreateMenuPage.js` (rewrite — all caps, no taglines/signs).
- `pages/LessonsPage.js` (rewrite — vertical cascade).
- `pages/RhythmGamePage.js` (JELLY JUKEBOX title, disco palette, dead sticker call removed).
- `pages/BoomGardenPage.js` (WHO'S GOT THE RHYTHM, PARROT PERCUSSION, football-field bg, mode tile cleanup, syntax fix).
- `pages/LoopStudioPage.js` (dead sticker call removed).
- `pages/EarTrainerPage.js` (dead sticker call removed).
- `pages/SimonSaysPage.js` (dead sticker call removed).
- `pages/SongStudioPage.js` (dead sticker call removed).
- `data/jmatv.js` (all caps titles, VARIETY SHOW added, Dough is in Pizza fixed).
- `data/lessons.js` (real subtitles).
- `data/achievements.js` (hint copy refresh).
- `data/stickers.js` (hint copy refresh).
- `hooks/useNextMission.js` (CTA copy).

### Not yet done (deferred to next batch per user)
- Jelly Jukebox background scene selection.
- Drum-major outfits for every hero on the Who's-Got-the-Rhythm cards.
- Charlie-behind-podium curtain background for Lessons.
- Hold-spacebar-for-longer-note-values in Who's Got the Rhythm.
- Scoring-timing tolerance audit in Who's Got the Rhythm (needs an actual on-device play session).
- Silly names for Puns episodes (waiting on user).
- JMAtv logo color inconsistency (user is uploading new art).

---

## Feb 22, 2026 — Nav simplification, iOS silent-switch bypass, JMAtv copy cleanup

User feedback (3-item batch): *"For apple devices... they have to turn the ringer on for the app to work. I want to replace navigation to only have back. Keep the harp, but have it say back instead of home. For JMAtv, can we get rid of the word channel wherever it appears."*

### iOS Ring/Silent switch bypass (`src/hooks/useAudioUnlock.js`, `public/assets/audio/silence.wav`)
- **Root cause**: iOS Safari respects the physical mute switch for Web Audio API by default — kids with the ringer OFF hear nothing from the bells, drums, kazoos, etc.
- **Fix**: On the very first user gesture (via the existing `AudioUnlockOverlay` OR any page-wide pointerdown), we now also start a background HTMLAudioElement that loops a 2-second silent WAV at `volume: 0.001`. iOS reclassifies the tab's audio session as `AVAudioSessionCategoryPlayback`, which ignores the mute switch. Web Audio then plays regardless of switch position.
- **Persistence**: The silent-audio element is held in a module-level ref so it survives StrictMode double-mounts and route changes without garbage-collection. A second `useEffect` primes the loop on refresh/deep-link visits (where session is already unlocked but the audio element hasn't been created yet).
- **Zero user-visible change**: No new UI, no audible artifact, no battery hit worth measuring.

### Nav: harp → Back (`src/components/GameUI.js`)
- Harp button label swapped from **"Home"** → **"Back"**.
- Behavior swapped from `navigate('/')` → `navigate(-1)` (browser history back).
- `aria-label` and `data-testid` renamed to `back-button` accordingly.
- On the actual home route (`/`), the harp is now hidden entirely so kids can't accidentally back out of the app.
- Removed the secondary `BackButton` chip that used to sit beside the harp — one Back control instead of two. The `backLink` prop is now ignored; callers can leave it in place harmlessly.

### JMAtv: drop the word "channel" (`pages/JMAtvHomePage.js`, `pages/JMAtvChannelPage.js`, `pages/JMAtvPlayerPage.js`)
- Home tagline: *"Pick a channel. Hit play. Hang out."* → *"Pick something. Hit play. Hang out."*
- Tile subtitle: *"JMAtv • Channel {n}"* → just **"JMAtv"** on each tile.
- Player CRT chassis: *"JMAtv • CH 1/2/3"* → just **"JMAtv"** on the retro TV controls strip.
- Error state: *"Channel not found"* → *"Not found"*.

### Files touched
- `src/hooks/useAudioUnlock.js` — added silent-audio-loop mechanic on top of the existing WebAudio unlock.
- `src/components/GameUI.js` — harp behavior + label; removed BackButton dependency.
- `src/pages/JMAtvHomePage.js` — tagline + tile subtitle copy.
- `src/pages/JMAtvChannelPage.js` — error copy.
- `src/pages/JMAtvPlayerPage.js` — CRT chassis label copy.
- `public/assets/audio/silence.wav` — new 2 s silent WAV (~32 KB) used by the ring-off bypass.

### Verified
- Home page (`/`): no back button rendered. ✅
- Rhythm Arcade (`/rhythm-game`): back button visible labeled **BACK**. ✅
- JMAtv home (`/jmatv`): zero occurrences of "channel" in visible text; tagline reads *"Pick something. Hit play. Hang out."* ✅
- Lint: clean across all touched files.

---

## Feb 21, 2026 (continued) — JMAtv polish: hosts, desktop layout, custom scrollbar

User feedback: *"can we have Puns with Finn Danger have Finn as the hero, Fun Facts have professor Charlie, and JMA Music Videos have Llama Lou. Also the cards are weird on desktop now. Stuff is all cut off. And the scroll bar can we have it look cooler"*

### Channel host swaps (`src/data/jmatv.js`)
- **Fun Facts** → `charlie-grad.png` (Professor Charlie — graduation cap)
- **Puns with Finn Danger** → `finn-danger.png` (unchanged, already correct)
- **JMA Music Videos** → `llama-lou-stew.png` (Llama Lou with Stew)

### Desktop layout fix (`pages/JMAtvHomePage.js`)
- Removed the rigid `aspectRatio: '5 / 3'` that was squashing cards into too-short rectangles on wide screens (text + tagline + episode badge clipped off the bottom).
- Replaced with `minHeight: 220` so each card grows to fit its content while still feeling chunky.
- Restructured inner layout to a flex two-column body: text on the left (`flex-1`, `min-w-0` for truncation safety), host art column on the right at a fixed `width: 38%`. Character art is absolute-positioned within its column so it can extend slightly past the card edge for the "popping out of the TV" feel without overlapping the title/tagline.

### Custom retro scrollbar on the "Up Next" carousel (`pages/JMAtvPlayerPage.js`)
- Swapped `overflow-x: auto` → `overflow-x: scroll` so the bar is always present (some OSes hide auto-scrollbars until interaction).
- Channel-tinted gradient thumb: orange→darker-orange for Fun Facts, blue→darker-blue for Puns, red→darker-red for Music Videos. CSS vars (`--jmatv-scroll-fill`, `--jmatv-scroll-accent`) set inline on the scroller pass the active channel's palette into both the Firefox (`scrollbar-color`) and WebKit (`::-webkit-scrollbar-thumb`) branches.
- Track: dark gradient with a subtle vertical-line pattern + soft cream border — reads like film-strip frame edges.
- Thumb: chunky 12 px tall, pill-shaped, JMA-dark outline, with inset highlights for a cartoon-glossy 3D look. Brightness shifts on hover/active for tactile feedback.
- Runtime verified: `scrollWidth: 1636 / clientWidth: 896` (so it does overflow), `scrollbar-color` applied = `rgb(255, 149, 0) rgba(255, 231, 194, 0.12)` ✓.

### Autoplay-with-sound on home RetroTV — explained, not fixed
- This is a **browser policy**, not a Vimeo setting. Chrome / Safari / Firefox all block `autoplay` of media WITH audio when there hasn't been a user gesture on the page yet. Vimeo's `background=1` flag is specifically the "muted ambient autoplay" mode — the only reliable way to get the preview to actually start playing without a manual tap.
- If we removed the `muted=1` / `background=1`, the iframe would just show a black screen with a play icon until the kid taps — defeating the purpose of the ambient TV vibe.
- The episode page (`/jmatv/:channel/:ep`) loads with `autoplay=1` (no muted flag); that page is reached via a tap, so the browser allows sound. So sound DOES work once they pick an episode.

### Files touched
- `src/data/jmatv.js` — 3 character-icon swaps.
- `src/pages/JMAtvHomePage.js` — desktop card layout, removed aspect-ratio, two-column flex body.
- `src/pages/JMAtvPlayerPage.js` — custom retro scrollbar via CSS vars + `<style>` block.


## Feb 21, 2026 (continued) — JMAtv (TV channel) shipped

User: *"Ok I want another place to go - JMAtv!!! I'll upload Jelly of the Month Club and JMA music videos, puns with Finn Danger, and Fun Facts for kids."*

After two rounds of placement design — business partner flagged that a 4th homepage tile would clash visually with the main JMA shield; user worried kids would skip games for passive video — landed on **option 4: small RetroTV widget, deliberately placed below the 3 PLAY/LEARN/CREATE cards** so kids see interactive content first.

### Data model (`src/data/jmatv.js`)
- `JMATV_CHANNELS` array with 3 channels: `fun-facts` (9 Vimeo IDs from user, auto-numbered #1-8 since one was duplicated), `puns-finn-danger` and `jma-music-videos` (both `comingSoon: true` placeholders).
- `pickFeaturedEpisode()` stable-random pick used by the home RetroTV preview.
- `getChannel()` / `getEpisode()` helpers for the channel + player pages.

### Components & pages
- **`components/RetroTV.js`** — cartoon CRT TV (wood-grain frame via CSS gradients, rabbit ears, knobs, speaker grille). Plays a muted, looping, background-mode Vimeo preview on the home page; tap → `/jmatv`. JMAtv logo bug in screen corner so kids learn the channel name even without tapping. Pulse animation on the "ON AIR" dot via a CSS keyframe (no JS).
- **`pages/JMAtvHomePage.js`** (`/jmatv`) — dark TV-guide background with the JMAtv shield logo + tagline. Three big TV-card channel tiles; locked channels show a "Coming Soon" badge.
- **`pages/JMAtvChannelPage.js`** (`/jmatv/:channelId`) — episode grid with auto-fetched Vimeo poster thumbnails via `vumbnail.com/<id>.jpg` (no API key needed, works on static hosting). Big play icon + channel-tinted gradient.
- **`pages/JMAtvPlayerPage.js`** (`/jmatv/:channelId/:episodeIndex`) — chunky CRT-styled Vimeo embed (same wooden frame as the home TV, scaled up). JMAtv channel bug top-right, scanlines overlay, fullscreen button, "Up Next on …" horizontal carousel below.

### Stickers
- New `jmatv-first-watch` (TV Time!) sticker in `data/stickers.js`, fired on episode mount via `earnSticker('jmatv-first-watch')`. Idempotent — safe to re-fire on repeat visits.

### Routes (`App.js`)
- `/jmatv`, `/jmatv/:channelId`, `/jmatv/:channelId/:episodeIndex` — all behind the existing HashRouter so GitHub Pages deeplinks keep working.

### Visual verification
- Home page screenshot: TV widget renders below the 3 cards at the bottom edge (~752px y) of the viewport on a 1280×1400 simulated mobile-long view.
- JMAtv home: 3 channel tiles render with correct colors, Finn/Charlie character art, "Coming Soon" badges on the placeholder channels.
- Fun Facts channel: all 8 episodes show with Vimeo posters auto-pulled from vumbnail.com.
- Player page: full CRT chassis, "Up Next" carousel of remaining episodes, JMAtv bug in the screen corner.

### Known caveat (NOT a code bug)
Vimeo returns *"We couldn't verify the security of your connection — access has been restricted"* when embedding the user's Fun Facts videos on the preview domain. This is a **Vimeo privacy setting** on the source videos (likely "Specific domains" privacy mode without our preview domain whitelisted). User needs to either:
- Set those videos to "Anyone with the link" privacy on Vimeo, OR
- Whitelist `*.preview.emergentagent.com` AND the production GitHub Pages domain in each video's "Embed Privacy" settings.

### Files touched
- New: `src/data/jmatv.js`, `src/components/RetroTV.js`, `src/pages/JMAtvHomePage.js`, `src/pages/JMAtvChannelPage.js`, `src/pages/JMAtvPlayerPage.js`.
- Edited: `src/App.js` (routes), `src/pages/HomePage.js` (RetroTV import + render below the 3 cards), `src/data/stickers.js` (jmatv-first-watch sticker).
- Asset: `public/assets/ui/jmatv-logo.png` (downloaded from user's upload).


## Feb 21, 2026 (later still) — Sticker Toast: batching + corner positioning

User: *"there are just too many sticker popups to first start. I LOVE the sticker system... it's just that it's too overwhelming when first exploring through the app."*

User picked option (d): batch consecutive earns AND make the toast quieter / smaller / corner-positioned.

### Batching mechanism (`useStickers.js`)
- Replaced single-id `notify(id)` with a module-level queue + 700 ms debounce. Any `notify(id)` calls landing within that window are coalesced into a single batch.
- Listeners now receive an **array of newly-earned IDs** (or `null` for the reset path) instead of a single ID. Single earns naturally arrive as `[id]`, multi-earns like `earnAchievementUpTo('rhythm', 'master')` (which fires cadet+pro+master back-to-back) arrive as `[cadet, pro, master]`.
- Reset path (`resetAllStickers`) fires `notify(null)` immediately, clearing both the pending batch and any visible toast.

### Toast (`StickerToast.js`)
- Repositioned from center-top to **top-right corner** with slide-in-from-right animation. Doesn't sit on top of gameplay anymore.
- Shrunk: 3px border (was 4), smaller icon (40×40 single / 36×36 batch), tighter padding, `max-w-[280px]`.
- Auto-dismiss reduced from 3.2 s → **2.5 s** for less on-screen time per pop.
- **Two render modes** keyed on batch size:
  - **Single (1 sticker)**: rotating icon + "New Sticker!" + sticker name. Same dopamine hit, just quieter and out-of-the-way.
  - **Batch (2+ stickers)**: row of overlapping mini icons (up to 4 visible) + "N unlocked" + "Tap to view →". One toast for the whole onboarding earn-cluster.
- Tap-anywhere navigates to `/sticker-book` so the kid can savour the new collection in context.

### Files touched
- `src/hooks/useStickers.js` — batch queue, debounce, listener payload swap, reset clear.
- `src/components/StickerToast.js` — full rewrite for corner positioning + single/batch render modes.

### If still too much
User said: *"if thats too crazy, remind me of c if I offer the same complain later"* — option (c) is the **first-session quiet mode** (suppress toasts entirely on a fresh device, show one consolidated "You earned N stickers! Check your Sticker Book →" celebration when the session ends).


## Feb 21, 2026 (even later) — Tempo bug FIXED: visual count-in + BeatPulse now respect tempo dial

User: *"They metronome lights and the count in are at 80 bpm even if you are expecting and sounding everything at 100bpm..."*

### The actual bug
- `BeatPulse` and `CountInOverlay` both imported the **constant** `BEAT_MS` (750ms) directly from `data/rhythms.js` and used it as the timing divisor inside their requestAnimationFrame loops.
- So no matter what tempo the player picked, the visual metronome dots and the 1-2-3-4 count-in tiles **always pulsed at 80 BPM**, while the audio (click track, snare hits, count-in beeps) ran at the tempo-adjusted speed.
- Result: hearing 100 BPM but seeing 80 BPM = total cognitive whiplash for elementary kids trying to lock in the beat.

### Fix
- Both components now accept a `beatMs` prop (defaulting to the imported constant for safety).
- `BoomGardenPage` passes the live `BEAT_MS` (already tempo-adjusted via `BASE_BEAT_MS / tempoMul`) to both `<BeatPulse beatMs={BEAT_MS} />` and `<CountInOverlay beatMs={BEAT_MS} />`.
- The rAF loops inside both components now compute `Math.floor(elapsed / beatMs)` against the prop, so the visual cadence matches the audio cadence at every tempo.

### Verified empirically via playwright
- **Easy (60 BPM)**: count-in tile transitions at 1059ms / 1034ms / 999ms (target 1000ms). ✅
- **Turbo (100 BPM)**: count-in tile transitions at 682ms / 601ms / 587ms (target 600ms). ✅
- Before this fix both tempos showed ~750ms deltas regardless of dial.

### Files touched
- `src/components/BeatPulse.js` — accepts `beatMs` prop, threads it through the rAF closure deps.
- `src/components/CountInOverlay.js` — accepts `beatMs` prop, same treatment.
- `src/pages/BoomGardenPage.js` — passes `beatMs={BEAT_MS}` to both components.


## Feb 21, 2026 (later) — How-to-Play modal + tempo-bug investigation

User: *"The tempo that checks if we're right or not is stuck at i think 80 bpm... so thats a bug. I also think we need instruction screen. Remember its for elementary. But jumping right into the game is probably too much?"*

### How-to-Play modal (Boom Garden)
- Brand-new pre-round overlay that pops the moment the kid enters a mode. Shows the mode title, the relevant character (Stew / Dr. Jellybone / Charlie), and three numbered kid-friendly steps with emoji bullets.
- Each mode has its own `howToPlay` array (3 steps each) defined on the MODES config.
- Big "Got it — let's go! →" CTA + a small "← Back to modes" escape hatch.
- `useEffect` gate ensures the demo + count-in does NOT auto-start while the modal is visible — otherwise the kid would miss round 1 entirely.

### Tempo investigation
- User reported the tap-timing check feels "stuck at 80 BPM" regardless of tempo dial.
- Live runtime probe (`window.__boomDebug` capturing `tapTime`, `expectedStarts`, `beatMs`, `tol`) confirms expected times scale correctly: at Easy `beatMs=1000`, `expectedStarts=[4000,5000,6000,7000]` (1000ms apart). At Turbo, input phase opens at ~4.8s (4 demo beats + 4 count-in beats × 600ms). So the timing MATH is correctly applied.
- Likely "feel" reasons the user perceived a bug: (1) `TOLERANCE_MS` is fixed in absolute ms (400/275/175 by level) and does NOT scale with tempo, so at slower tempos the tolerance window covers a smaller % of each beat; (2) the round-summary "X of Y on time" only counts taps with diff ≤ 30% of tolerance (PERFECT tier), GREAT/GOOD taps don't count. Both worth iterating on if the user confirms the feel issue.

### Files touched
- `src/pages/BoomGardenPage.js` — `MODES[i].howToPlay`, `showInstructions` state, useEffect gating, How-to-Play overlay JSX.


## Feb 21, 2026 — Tempo Dial + Fixed-length Sessions + Measure-aligned Patterns

User: *"I like a tempo dial... for the count-in only, I think it should be beeps. I fear the user STILL potentially being a bit confused on when to start."*
User: *"finish tempo dial. Count in beeps are good, I think tempo dial should be .75 1.0 and 1.25 easy med and turbo. Also I think there should be a specified amount of rounds. Lastly I dont like that so many patterns are 6 beats long. Maybe the copycat hard is 2 measures? It would be nice, if not too hard to have some marking of measures as well..."*

### Tempo Dial (Boom Garden)
- New three-button tempo dial on the mode-pick screen below Difficulty: **Easy 0.75x (60 BPM)**, **Medium 1.0x (80 BPM)**, **Turbo 1.25x (100 BPM)**. Each button shows the BPM as a subtitle and uses the same chunky-pill aesthetic as the level picker.
- Multiplier flows through every timing path: `scheduleMetronome`, `schedulePatternAudio`, `scheduleVisualPlayhead`, `noteStartTimes` and all count-in beep schedulers.
- Used a `beatMsRef = useRef(BEAT_MS)` so the existing useCallbacks pick up the live tempo without bumping their dep-arrays (avoids cascading re-binds across `startCopy` / `startTrail` / `finishCopyRound`).
- `ScrollingRhythmStrip` now accepts a `beatMs` prop so Tap Trail's scroll duration scales with tempo too.

### Synthesised Beep Count-In (already wired in previous job, verified)
- 4-beat count-in uses `playCountInBeep` (synthesised oscillator: 660 Hz on beats 1-3, 990 Hz "GO" tone on beat 4) instead of the hi-hat click track. Kids can now hear the distinct shift from "count-in beeps" → "play-along clicks" the instant input opens.

### Fixed-Length Sessions
- `ROUNDS_PER_SESSION = 5` constant exported from `data/rhythms.js`.
- Live `Round X / 5` counter chip in the play screen (next to the phase banner, colored to the active mode).
- Round-summary "Play another →" button auto-flips to "See session score →" on the final round.
- New Session Summary modal: total score, on-time %, "Play another 5" + "Back to modes" CTAs.
- `sessionTallyRef` tracks perfects + total notes across rounds; reset on `enterMode` / `restartSession`.

### Measure-Aligned Patterns
- Master (Copy Cat hard) patterns rewritten to be **exactly 8 beats (2 measures)** each — no more lop-sided 6-beat phrases.
- Pro patterns already 4 beats; verified.
- Added `BEATS_PER_MEASURE = 4` constant and `measureBoundaryAfterIndices()` helper for visual barline placement.

### Visual Barlines
- `RhythmStrip` (Copy Cat / Twin Beats): chunky 6px-wide solid dark barline with a white outline pops between blocks where a measure ends. Uses `Fragment` so layout proportions stay accurate.
- `ScrollingRhythmStrip` (Tap Trail): the dashed inter-note divider swaps to a 4px solid dark `border-right` at measure boundaries — preserves the exact `BEAT_PX` width so audio/visual timing stays locked.

### Files touched
- `src/data/rhythms.js` — `ROUNDS_PER_SESSION`, `BEATS_PER_MEASURE`, `measureBoundaryAfterIndices()`, rewritten master PATTERNS to 8 beats.
- `src/pages/BoomGardenPage.js` — TEMPOS array, tempo-dial JSX, `beatMsRef`, round counter chip, session summary modal, `restartSession`, session tally.
- `src/components/RhythmStrip.js` — barline rendering between measure-ending blocks.
- `src/components/ScrollingRhythmStrip.js` — `beatMs` prop, solid-barline border swap.


## Feb 20, 2026 (later ++++++++) — Gamification batch (a/b/c/d/e/g) + quick fixes

User: *"Let's try em all... I HATE the cards for the games AND the names. Just remember that for something to address next."*

### Quick fixes
- "Listening to Doc..." → "Listening..." everywhere (Doc isn't in Boom Garden, only Stew). Mode blurb also updated to "Stew plays it. You copy back on the snare."
- **Fullscreen button moved** from `top-2 right-2` to `bottom-3 right-3` so it stops covering the score chip on both desktop and mobile.

### a. Score multiplier badge
- Live `×1.5` / `×2` / `×3` badge appears beside Stew when streak ≥ 3 / 5 / 7. Per-tap score is multiplied accordingly (base 25/15/10 × current multiplier). Color shifts green → amber → red as the multiplier grows. Probe: `×1.5` at streak 3.

### b. PERFECT-only sparkle burst
- Every PERFECT tap (≤30 % of tolerance from centre) fires a small 14-piece Confetti burst centred on Stew. Goods and greats stay quiet; perfects feel distinctly punchier.

### c. Cymbal crash + Stew scale-pop on streak milestone
- On streak ≥ 3 milestone, `playDrumSound('crash')` triggers the existing crash-cymbal audio sample and Stew's wrapper motion.div pops to scale 1.15 for 220 ms before springing back. Audio leads visual by ~50 ms (the cinematic trick) so the burst feels physical.

### d. Stew victory dance on a clean round
- When `correct === total` in `finishCopyRound`, schedule 4 successive `snareRef.flash()` calls one per beat. Stew physically swings L → R → L → R for 3 seconds. Hint badge below him changes to "✨ Encore!" during the dance. Verified.

### g. Streak arc (3 chips above Stew)
- Three small red chips above Stew's head fill in as the kid lands consecutive scored taps (modulo 3 within the current streak). When a milestone burst fires they're all fully lit. Glowing red box-shadow on the lit chips. Pure visual goal kids chase mid-tap.

### Files touched
- `src/pages/BoomGardenPage.js` — multiplier, perfect-sparks, stewPop, victoryDance state + JSX; tier scoring × multiplier; cymbal + scale-pop trigger; victory-dance flash loop in finishCopyRound; "Listening..." copy.
- `src/components/FullscreenButton.js` — repositioned to bottom-right.

### Skipped from the batch
- **e. Crowd silhouettes in bleachers** — punted to a follow-up; needs an artwork choice (PNG silhouettes vs CSS-drawn). Easy to layer in once we know the style.
- **f. Boss rounds every 5th round** — punted; needs pattern-pool choices (do bosses pull harder patterns from the existing level, or new "boss" patterns?). Will spec next time.
- **h. Stew costume unlocks** — explicitly skipped (user's "not the hats").

### Outstanding (user noted for later)
- "I HATE the cards for the games AND the names" — to be addressed in a dedicated UI/copy pass.

## Feb 20, 2026 (later +++++++) — Streak confetti

User: *"love the confetti on a streak idea!"*

### Streak burst at 3 / 5 / 7 / 10 perfects in a row
- New `streakBurst` state in BoomGardenPage, populated inside the `setStreak` updater when the next streak value crosses a milestone (3, 5, 7, then every multiple of 5 thereafter).
- Re-uses the existing `Confetti.js` component (the same one used by Who's Got Rhythm's full-round celebration). Mega variant — double the pieces, wider spread — at streaks of 7 +.
- "🔥 N IN A ROW!" banner pops in above Stew with a spring scale-in, lifts up, fades out. Color gradient shifts from amber (3, 5) to red-amber-yellow (7+) so kids see the rarity.
- Self-clearing via a tracked timer ref so rapid streaks don't queue indefinitely.

### Verified
- Programmatic 4-tap test landed a 3-streak: `streakConfetti = true`, banner text `"🔥 3 IN A ROW!"`, +10 chips for each scored tap. Round summary + Tadpole rank-up celebration fire alongside without conflict.

### Files touched
- `src/pages/BoomGardenPage.js` — `streakBurst` state + streak-milestone detection inside `setStreak` updater + Confetti and banner render slots in the Stew section.

## Feb 20, 2026 (later ++++++) — Boom Garden fun-factor pass

User report: *"k we need these games to be more fun! Maybe feedback like who's got the rhtyhm game? Also, its time to let you know stew is floating in midair, and not at all on the field. He is two of his body lengths too high"*

### Stew on the field (no more midair float)
The Stew section was just `flex justify-center items-center py-3` with no vertical bias — he settled wherever the flex column landed him. Wrapped him in `flex justify-center items-end mt-auto pt-4 pb-2` so flex pushes him to the **bottom** of the play column. His drum now visually touches the football field background.

### Per-tap PERFECT! / GREAT! / GOOD! / MISS! popup (Who's Got Rhythm style)
- New `[hitFeedback, setHitFeedback]` state, populated in `handleSnareTap`.
- Tier from how close the tap was to the centre: `≤30% tol → perfect`, `≤60% tol → great`, `≤100% tol → good`. Anything outside tol doesn't claim (kid keeps trying).
- Re-uses the existing `FeedbackPopup` component from `components/GameUI.js` so the visual language matches Who's Got Rhythm exactly.
- Auto-clears after 380 ms via a single tracked timer ref so rapid taps don't pile up.

### Floating "+25 / +15 / +10 / Miss" score chips
- `floatingScores` queue with unique IDs. Each tap pushes a chip that drifts up 90 px over 0.85 s and self-destructs.
- Per-tap score bump: +25 perfect, +15 great, +10 good, 0 miss. Stacks on top of the existing end-of-round +100 bonus.
- Per-tap streak bump too — `setStreak(s => s + 1)` on every scored tap, `setStreak(0)` on any auto-miss.

### Verified
- DOM probe across 4 taps: each tap → popup text `"GOOD!"` rendered + a `+10` chip mounted. Multiple chips stack and animate up. Tap 2 hit the 80 ms window between popups (timer cleared but new one not yet set) — not a bug.
- Round summary still fires (`"3 of 3 on time!"`) + the Tadpole rank-up unlocks after the first clean round, confirming the existing achievement plumbing still works alongside the new per-tap feedback.

### Files touched
- `src/pages/BoomGardenPage.js` — `hitFeedback`, `floatingScores`, `popHitFeedback`, tap tiering, FeedbackPopup wired into JSX, Stew section uses `mt-auto items-end`.

## Feb 20, 2026 (later +++++) — The REAL Stew bug + musical count-in row

User report: *"stew is still completely broken. Ive now dropped 200 credits on this one bug. Also, I like the idea of the 4,3,2,1 GO, but it doesnt quite work either. It's too unmusical of a count in, and the GO is covering what i have to tap"*

### The actual Stew bug — container-collapse on display swap
After multiple rounds of Beat-Lab refactors and L/R-counter fixes, the *root cause* of "Stew is broken" turned out to be a **layout collapse**, not React reconciliation. In `StewDrummer.js`:

- Frame 0 (left-1.png) had `className="... w-full h-auto"` (no `absolute`) → it sat in normal flow and **defined the button's height** (PNG is 1920×1080 = 16:9, so 360 px wide → 202 px tall).
- Frames 1–7 had `className="... absolute inset-0"` → they overlapped frame 0 but contributed nothing to layout.

The instant `showFrame(N>0)` set frame 0's `display: none`, the button collapsed to **0 px tall**. Frames 1–7 (positioned absolutely against a 0-height parent) had nothing to render into → Stew literally vanished. Subsequent showFrame calls flipped invisible elements. The animation chain ran, but the visual result was "Stew freezes" or "Stew disappears".

### Fix
1. All 8 frames now `absolute inset-0 w-full h-full`.
2. The `<motion.button>` gets an explicit `aspectRatio: '16 / 9'` style so it always has height regardless of which child is visible.
3. Verified: across 5 sequential taps, button stays 360×202 px, each tap increments `dataset.hits` by exactly +1, and `right-3 → left-3 → right-2 → left-3 → right-3` alternates cleanly. Visible image is always the full button size — no collapse.

### Count-in rewrite — musical row of 4 numbered tiles
Replaced the centered "4 → 3 → 2 → 1 → GO!" badge with a **horizontal row of 4 numbered tiles** (`1 · 2 · 3 · 4`) that lives directly below the rhythm strip. Each tile pops large + brightens + lifts on its own beat (cool blue → green → orange → red as the heat builds toward beat 1). Reasons:

- **Musical**: real teachers count UP in tempo ("1, 2, 3, 4, *play*"), not down like a movie. Kids feel the meter instead of a panic countdown.
- **Doesn't cover the strip**: the previous fixed-overlay badge sat dead-center, hiding the Ta/Ta/Shh/Ta pattern the kid is about to tap. The new row sits beneath the strip in dedicated vertical space.
- **No "GO!" needed**: the strip's input-phase visual playhead (added last iteration) lights up beat 1 the instant the kid's window opens. "GO" was redundant and worse, was the thing covering the strip.

### Files touched
- `src/components/StewDrummer.js` — `aspectRatio: '16 / 9'` on the button + all 8 frames `absolute inset-0 w-full h-full`.
- `src/components/CountInOverlay.js` — rewritten as a horizontal row of 4 motion.div tiles, no longer a fixed full-screen overlay.

## Feb 20, 2026 (later ++++) — Boom Garden 4 P0 fixes

User report: *"Stew is a new kind of broken. You play only once or twice and he becomes totally un tappable. Also it still doesnt let me start before the exact downbeat. Also, i see all the efforts made to help the kids know when to start, and where they are. I want those even MORE obvious."*

### 1. Stew is now ALWAYS tappable (except Twin Beats picking mode)
The previous `disabled={phase !== 'input' && phase !== 'countin'}` meant Stew was inert during demo / reveal — but kids tapping in anticipation experience that as "Stew is broken". `disabled` is now only `mode === 'match'`. Audio + L/R-alternating animation fires on every tap regardless of phase. `handleSnareTap` silently no-ops during demo/reveal so non-scoring taps don't corrupt the round.

### 2. 600 ms gap between demo and count-in removed
The breath that lived between "Doc finishes playing" and "click track starts" had `phase='demo'` (Stew disabled). Kids tap-anticipating during the silence got nothing. Now the count-in starts the *instant* the demo audio ends — `countInDelay` is just `demoMs`, no `+ 600`.

### 3. Stop-timer race-condition in the metronome
A subtler bug introduced by the back-to-back metronome sessions: when the **demo's** `setMetronomeRunning(false)` timer fired ~375 ms INTO the count-in, it killed `metronomeRunning` and silenced the CountInOverlay halfway through (you'd see "4" pop up then nothing). `scheduleMetronome` now tracks its latest stop timer in `metronomeStopTimerRef` and **cancels the previous one** before scheduling a new one. The 4/3/2/1/GO! sequence now plays out fully.

### 4. Big "4 → 3 → 2 → 1 → GO!" count-in overlay
New component: `CountInOverlay.js`. A huge, can't-miss-it colored badge bounces in on each count-in beat, color-shifts cool→warm→green, then pops out as the next number arrives. Replaces the tiny 4-dot BeatPulse as the primary visual cue during count-in (BeatPulse still pulses underneath). Dedicated `countinStartMs` + `showCountIn` state in BoomGardenPage so the overlay can stay mounted ~600 ms into the input phase — long enough for "GO!" to actually land before unmounting.

### 5. Visual playhead during INPUT phase (kids see where they are)
Added `scheduleVisualPlayhead(pat, 0)` to both `startCopy` and `startTrail` at the handoff into input. Same `setHighlightIndex(i)` schedule as the demo, just without the audio — so the strip block the kid is SUPPOSED to be tapping lights up in real-time, mirroring the demo's playhead. The claim-based highlight (handleSnareTap → setHighlightIndex on a successful tap) takes precedence when the kid is on time.

### Verified
- Programmatic single-pointerdown test: every tap increments `dataset.hits` by exactly +1, alternation runs `right-1 → left-1 → right-1 → left-1 → right-1` across the round AND across multiple rounds. No "untappable" — pointer events fire on every phase.
- Count-in overlay polled at 50 ms across two rounds: full sequence `4 → 3 → 2 → 1 → GO!` rendered every time. "GO!" lands ~600 ms into input then auto-unmounts.
- Visual playhead during input: strip blocks highlight `0 → 1 → 2 → 3` in lockstep with the click track during the kid's input window.

## Feb 20, 2026 (later +++) — Beat Lab pattern for Stew + lockout fix

User report (in order): *"stews animations is still broken... He'll play twice at most, then freeze"* and *"stew is locked for too long. It's not really possible for a human to nail perfectly on the beat, and will often play even a couple miliseconds before you unlock"*

### Root cause of the freeze
React's reconciliation was clobbering imperative DOM updates. The previous "single img + src swap" pattern in SimonSaysPage relied on React's prop-diffing being smart enough to skip src updates when the JSX prop reference was unchanged — which mostly worked, but the parent's conditional `{gameState === 'playing' && <div>}` sibling was shifting the Stew container's position in the parent's child array, sometimes triggering a remount that reset the imperative src.

### Fix: Beat Lab pattern
Same trick the Beat Lab drum kit already used successfully — and exactly what the user suggested we look at:
- Mount **all frames** at once (4 imgs for Stu Kazoo Says, 8 imgs for Boom Garden StewDrummer).
- Put the default visibility in **CSS classes** (`.stew-frame` / `.stew-frame-default`, `.stew-drum-frame` / `.stew-drum-frame-default`), NOT in inline JSX `style={{ display }}`.
- Imperative `el.style.display = 'block' / 'none'` flips visibility.
- Because the JSX never has a `style.display`, React reconciliation never overwrites the imperative overrides. They survive every re-render — including ones triggered by setState calls in the same tick as the animation start.

### "Stew locked too long" fix (count-in tap window)
The kid was being silently rejected for tapping a few ms before the official `phase === 'input'` transition — an objectively impossible standard against a click track. Fixed:
1. `inputStartRef.current` and `expectedStartsRef.current` are now set at **count-in start** (not at input start). Note expected times are shifted forward by `countInMs` so beat 1's wall-clock target is unchanged.
2. `handleSnareTap` now fires during `'countin'` as well as `'input'`.
3. The drummer's `disabled` prop now includes `'countin'` as an active phase, so Stew is tappable starting at the first count-in click.
4. If a tap is more than `tol` ms outside the next note's expected time (e.g. a beat-1 click track tap), the note is **not claimed** — kid gets audio + Stew animation feedback and can still hit that note within the tolerance window.
5. Hint text during count-in changed from `'1 · 2 · 3 · 4'` to `'Get ready...'` — clearer that they CAN tap now (warm-up taps) rather than implying they must wait.

### Verified via programmatic single-pointerdown probe
Across 5 input-phase taps, each delta was exactly +1 and visible frame alternated cleanly `right-1 → left-1 → right-1 → left-1 → right-1`. Round summary showed `3 of 3 on time!` despite test injecting anticipatory taps during the count-in — confirming the tap window now extends earlier. No freeze across multiple rounds.

### Files touched
- `src/components/StewDrummer.js` — rewritten with 8-frame Beat Lab pattern + dataset counter on the button container.
- `src/pages/SimonSaysPage.js` — Stew rebuilt as 4-frame Beat Lab pattern, single img + src swap retired.
- `src/pages/BoomGardenPage.js` — `startCopy` / `startTrail` open the tap window at count-in start; `handleSnareTap` accepts `'countin'` taps and skips claiming on out-of-tolerance early taps; StewDrummer `disabled` and hint updated.
- `src/index.css` — added `.stew-frame{,-default}` and `.stew-drum-frame{,-default}` class defaults.

## Feb 20, 2026 (later +) — Stew double-tap fix in Boom Garden

User report: *"stews animations is still breaking, and even when it works, it doesnt switch between left and right"*

### Root cause
Every kid-tap on Stew was triggering **TWO** `playHit()` calls in rapid succession:
1. `StewDrummer.handleDown` → `playHit()` (kid pressed Stew → swing one stick)
2. `onTap?.()` → `handleSnareTap` → `snareRef.current?.flash(100)` → `playHit()` (page handler asked Stew to flash AGAIN)

`playHit()` reads `dataset.hits`, picks L or R based on parity, increments. With two calls per tap, the counter jumped by 2 each time → parity never flipped between taps → Stew stayed on one side. The second (right-stick) call also clobbered the first (left-stick) animation chain mid-frame, masking the visual swing entirely on slower devices.

### Fix
Removed the redundant `snareRef.current?.flash()` call from:
- `handleSnareTap` (Copy Cat / Tap Trail input phase) — the kid's tap already animates Stew via `handleDown`.
- `handleMatchPick` (Twin Beats input phase) — the kid is picking a strip, Stew shouldn't animate at all on a Twin Beats pick (he's disabled there too).

Demo path is unchanged: `schedulePatternAudio` still calls `flash()` on every scheduled snare hit, so Doc's "play it for you" cycles cleanly through L/R.

### Verified via DOM probe
Pre-tap hits=3 (3 demo flashes). Taps then incremented `dataset.hits` by exactly +1, with src alternating `right-1 → left-1 → right-1 → left-1` across taps. Mid-test some +4 jumps appeared when a round auto-advanced and the next demo's flashes added to the counter — expected behaviour, not a bug.

## Feb 20, 2026 (later) — Boom Garden round-cycle fix + Stew Kazoo animation fix

User report: *"fix boom garden and stew kazoo in the same. His animations arent working. Also Tap trail just does one level and breaks"*

### Tap Trail — strip now resets between rounds
- **Root cause**: `ScrollingRhythmStrip`'s inner `<motion.div>` is driven by `kickOff` (true during countin/input/reveal). Between rounds, `kickOff` stayed true (round-1 ended in `reveal`, round-2 started in `countin`), so the framer-motion node never re-applied its `initial={{x: startX}}`. Result: the new pattern was already parked at `endX` from the previous round and no notes scrolled into view.
- **Fix**: Added a `roundKey` counter in `BoomGardenPage` that bumps every time `startCopy / startMatch / startTrail` runs. Passed as `key={roundKey}` on both `RhythmStrip` and `ScrollingRhythmStrip`, forcing React to unmount + remount the strip between rounds. The motion node then properly initialises to `startX` and scrolls cleanly into the strike line on round 2, 3, 4, …
- **Verified via DOM probe**: transform jumps from `matrix(1, 0, 0, 1, -720, 0)` (round-1 end) → `matrix(1, 0, 0, 1, +337, 0)` (round-2 start) → scrolls through to -720 again over 8 beats. Repeats for round 3.

### Boom Garden — Copy Cat / Twin Beats auto-advance verified working
- Confirmed the 3 s auto-advance from `finishCopyRound` (Copy Cat / Tap Trail) and `handleMatchPick` (Twin Beats) properly transitions `reveal → listen/countin/demo` on the next round. The `Play another →` button inside `boom-round-summary` lets kids skip ahead. Lifecycle probe: phase cycles `Listen → Count in → Your turn → Round complete → Listen` continuously without a soft-lock.

### Stew Kazoo Says — animations fire on every note again
- **Root cause**: the demo + tap handler called `cycleStew()` which imperatively toggled `display: block/none` on 4 stacked `<img>` refs. But each `<img>` had an inline `style={{ display: idx === 0 ? 'block' : 'none' }}` in its JSX. Whenever React re-rendered (which happens at the start of each demo step because `setHighlightedNote()` and `setMusicalNotes()` fire setState in the same handler), React re-applied the JSX style and clobbered the imperative DOM changes — frame 0 snapped back to visible, frames 1/2/3 went hidden. Kid saw the neutral pose almost the entire time.
- **Fix**: Refactored to a single `<img ref={stewImgRef}>` whose `src` is swapped imperatively. Same pattern that `StewDrummer` already uses successfully. React doesn't reconcile prop values that match the previous render, so imperative `.src = STEW_FRAMES[i]` survives re-renders. Preload of all 4 frames stays so the first hit doesn't stutter.
- **Verified via DOM probe**: `<img>.src` cycles cleanly `neutral → plays-1 → plays-2 → plays-3 → neutral` at 110 ms intervals during the demo, and again on every kid's tap. Detected 9 src changes in 3 s with the expected timing.

### Pre-existing CI lint
- Added `// eslint-disable-line react-hooks/exhaustive-deps` to the `useImperativeHandle` line in `StewDrummer.js` (the static `flash` ref doesn't need re-binding to a fresh `playHit` closure — refs to ImperativeHandle are intentionally stable). Build was broken at HEAD before my changes due to this; unblocking it was necessary to verify the fixes compile.

## Feb 20, 2026 — Boom Garden v4 — football field, visual metronome, forward-walking timing, alternation fix, end-of-round card
Round 4 of user feedback on Boom Garden:
- "Can we make the background for all of these the football field?"
- "At the end of the game nothing happens"
- "He only animates on one of the two animations when I tap him, not alternating"
- "I would like to see him perform the rhythms for Twin Beats as well"
- "Copy Cat is still impossible for a human to play... we have to have some visual or audio metronome or something"
- "I also think its bugged to expect the wrong note"

### What changed
- **Football field background** on every Boom-Garden play screen (Copy Cat, Twin Beats, Tap Trail) with a per-mode color tint laid over for legibility. Stew now sits ON the field, on the 50-yard line.
- **Visual metronome (`BeatPulse`)** above Stew — four chunky-bordered dots (yellow downbeat + 3 orange offbeats), one brightens & pops on each beat. Driven by a single `requestAnimationFrame` loop reading from `Date.now() - metronomeStartMs` so it stays perfectly locked to the hi-hat click underneath. Active during count-in, demo, AND the kid's input window — they can SEE the tempo, not just hear it.
- **Stew now performs in Twin Beats** too — same `schedulePatternAudio` call flashes him on every demo beat. He sits there disabled during the kid's pick (correct UX: they pick a strip, not tap Stew).
- **Stew alternation fixed** — root cause was React StrictMode invalidating the `useRef` counter on every dev re-mount. Switched to a DOM-dataset counter (`imgRef.current.dataset.hits`) that survives any mount/strict-mode re-render. Verified by automation: dataHits increments cleanly, sides truly alternate.
- **Forward-walking sequential timing detection** replaces the prior nearest-neighbour heuristic. At each tap, the system scans unclaimed non-rest notes IN ORDER: any whose expected time has already passed by more than `tol` are auto-marked MISS (the kid walked past them), then the tap is scored against the first beat that's still "current or upcoming". This mirrors how a real teacher judges timing — missed beats stay missed, and the next tap targets the NEXT beat, not the one the kid just abandoned. Fixes the "expect the wrong note" bug.
- **End-of-round summary card** (`boom-round-summary`) — a chunky bordered card slides down on reveal with "ROUND COMPLETE / X of Y on time!" and a "Play another →" button. Green tint for ≥80 % hits, gold otherwise. Auto-advance after 3 s, but the button lets the kid skip ahead. No more silent restart.

### Verified
- Build clean. Screenshots show football-field bg, BeatPulse dots above Stew (active beat brighter), Stew rendered in Twin Beats demo with "Listening..." hint, alternation confirmed by automation (dataHits counter increments, src cycles left/right).


Round 3 of user feedback:
- "Snare has both states showing at the same time" — visual bug.
- "When it's the student's turn to perform they need something to give them the timing... they can't just copy with perfect tempo, or whatever you currently have testing if its right or not" — timing detection broken + needs reference pulse.
- "Tap Trail to be reading in time. For more than a measure at a time. So have something scrolling or something?" — Tap Trail needs to be a real sight-reading exercise.
- "For rests lets keep my seahorse rest and put Shh under it. For all the others, accompany the rhythm words with these notes I've attached" — real musical notation per user-provided PNGs.
- Final v3: "Instead of the snare, lets have Stew perform the drums. I have given you two animations... For each hit have him alternate between those animations."

## Feb 20, 2026 — Boom Garden v3 (superseded by v4)
Note: v4 above replaces the timing and visual elements below; the v3 notes are retained for changelog completeness.

### Round 3 fixes (v3)
- **Stew the drum-major now performs every drum hit**. New `StewDrummer` component uses the 8 PNG frames the user provided (left-stick + right-stick × 4 each, shared neutral pose). Each hit (demo or kid tap) alternates between left/right animations. Direct-DOM `src` swap chain at 45 ms/frame keeps the animation in sync with the audio with no React re-renders. Preloads all 8 frames so the first hit doesn't stutter. `BigSnare` retired.
- **Tap Trail rewritten as a scrolling sight-reading reader**. New `ScrollingRhythmStrip` component shows notes scrolling right-to-left through a fixed gold "TAP HERE" strike line. Multi-measure patterns (8–12 beats Cadet, up to 16+ beats Master) via new `TRAIL_PATTERNS` data. The 4-beat count-in is now visually integrated — the strip starts 4 beats off-screen-right and scrolls into the strike line during the click count-in, so kids see the music approaching as they hear the pulse.
- **Timing detection rewritten with nearest-neighbour matching**. Old logic forced strictly sequential taps — a missed beat broke the whole round because beat-2's tap was compared against beat-1's expected time. New logic finds the closest UNCLAIMED non-rest note in time at each tap and scores against that, so kids can recover from a missed beat without the round desyncing.
- **Per-difficulty timing tolerance** in `TOLERANCE_MS`: Cadet ±400 ms (~53 % of a beat — very forgiving for 5-year-olds with a click reference), Pro ±275 ms, Master ±175 ms.
- **Round-pass threshold loosened** from "every note perfect" to "≥80 % of non-rest notes in window" — celebration is now achievable without being given away.
- **Copy Cat now has its own 4-beat count-in** between demo and input — kids hear the click for a full measure before they're expected to play, anchoring them to the tempo.
- **BigSnare double-state bug fixed**: pressed-frame `display` was being cleared to `''` on pointerUp (defaulting to `block`); explicitly set to `'none'` now. Component retired in favour of `StewDrummer` regardless.

### Verified
- Build clean. Copy Cat strip shows real quarter-note PNGs with "Ta" syllables; demo highlights the playhead block in bright yellow. Stew drum-major character renders below with "TAP STEW!" / "Listen..." / "1 · 2 · 3 · 4" hint badge per phase. Tap Trail scrolling strip shows notes parked to the right of the gold strike line during count-in, with "TAP HERE" gold badge labelling the strike line. Pro patterns visibly mix half / eighth-pair / quarter notes with proportional widths.


User feedback on the v1: "These games are SO lackluster... the ct and twins and trail crap is awful, not in line with our art at all... lets not do that... Instead of tap let's use my snare or something... When it's the student's turn to perform, have the beat in time... Also on twin beats, if it's rest-ta-ta-ta or ta-ta-ta-rest there is no way to tell the difference."

### What changed
- **Mode-picker artwork**: dropped the 🐱 👯 🛤️ emojis entirely. Each mode card now matches the LearnMenuPage tile recipe — background scene, chunky border, drop shadow, sign nameplate, character peeking from the bottom-right.
  - **Copy Cat** — recording-studio bg + Dr. Jellybone (the listening / demoing octopus)
  - **Twin Beats** — clubhouse bg + Llama Lou & Stew (the literal twins)
  - **Tap Trail** — graffiti-wall bg + Charlie RunDMC (the rhythm performer)
- **Big snare drum** replaces the generic red TAP button. New `BigSnare` component uses `assets/drums/Snare 1.png` and `Snare 2.png` with direct-DOM frame swap on press. Exposes an imperative `flash()` ref so the demo can pulse the snare in time with each scheduled snare-hit. Floating "HIT IT!" / "Listen..." / "1 · 2 · 3 · 4" hint badge under the drum.
- **Click track during every input phase** — Copy Cat and Tap Trail now run a steady hi-hat tick on every beat while the kid is performing, so they have an audible pulse to lock onto. Tap Trail also plays a 1-measure (4-beat) count-in before the pattern starts.
- **Twin Beats audio-ambiguity fixed** — the hi-hat click track now runs UNDERNEATH the demo snare hits too, so leading-rest vs trailing-rest mirror patterns are audibly distinguishable: kids hear all 4 clicks and can tell which beat was "covered" by a snare vs which was silent. No need to filter pattern pairs.
- Hit window tightened slightly from ±300 ms → ±275 ms now that the kid has a click reference to follow.

### Verified
- Build clean. Mode picker shows three JMA-style cards with character art and matching backgrounds. Copy Cat shows full big-snare with active red state. Twin Beats shows three distinct strips with proportional block widths (half = 2× wide, eighth = ½ wide). Tap Trail count-in banner + snare are visible.


## Feb 19, 2026 — Mobile playability boost in Who's Got the Rhythm
Two compounding fixes for the "I don't know when to tap, and I want to tap the bell, not a button" mobile pain:

### Beat Lab — direct-tap on drum kit and turntable
- Kids can now jam on Beat Lab WITHOUT touching the sequencer grid. Each individual drum piece (kick, snare, hi-hat, crash, ride, tom, low-tom) is tappable and fires its sound + visual flash. Same `playDrumSound` audio path as the loop sequencer — zero new audio plumbing.
- Turntable records are tappable too: left record → `scratchPull`, right record → `scratchPush`. The record briefly halts spinning via the existing `activeHits` mechanism so the kid sees the scratch land.
- `DrumKitVisual` now takes an `onHit(drumId)` prop and exposes the shared `flashDrum` routine via the existing imperative ref (so the sequencer's flash trigger stays identical).
- `TurntableVisual` takes an `onScratch(scratchId)` prop.
- Both visuals: `cursor-pointer`, `touchAction: 'none'`, pointer capture to prevent mid-tap interruption. Toms-base decoration explicitly `pointer-events: none` so it never intercepts a tom tap.

### Beat Lab + Ear Trainer composition cleanup
- User flagged Beat Lab as a "compositional nightmare" — two Charlies and two Chunks at the bottom-right, plus Chunk blocking the top-left of the beat lab area.
- **Root cause**: two character systems stacked on the same page. `PageCharacters` (older, fixed bottom-3 corners, picked Charlie + Chunk for both Beat Lab and Ear Trainer) was rendering on top of `RoomCharacters` (newer per-room cast with outfit cycling and speech bubbles). Result: duplicates at the bottom corners.
- **Fix**: removed `PageCharacters` import + render from `LoopStudioPage.js` and `EarTrainerPage.js`. The superior `RoomCharacters` system stays.
- Beat Lab is intentionally left with an empty room-cast (`'beat-lab': []`) because the scene already has the drum kit, turntable, JMA-branded pulsing speakers, sequencer grid, and controls bar — adding floating characters made it cluttered instead of charming. `RoomCharacters` now early-returns null when the cast is empty.
- Other rooms (Jam Hall, Rhythm Arcade, Kazoo Room, Ear Quest, Note Match, Detective) keep their RoomCharacters casts.

### Round 3 — Threw out the time math, switched to position-based hit detection
- User feedback: "I'm a professional musician and didn't get one perfect... very unintuitive now" + "can't have the target be that low on the screen visually, at least on the phone."
- **Root cause**: my `IDEAL_PROGRESS` constant was a guess that depended on screen size, bell heights, breakpoints, etc. — fragile by design. A pro can FEEL when bells visually meet, so if the algorithm disagrees, the algorithm is wrong.
- **Fix**: `FallingBellNote` now forwards its motion.div ref to the parent via `registerFallingRef`. At tap time, `handlePlayNote` measures the actual `getBoundingClientRect()` of the falling bell AND the static target, computes the vertical distance between centers, and awards:
  - PERFECT (100) — distance ≤ 40 % of target-bell height (the bells visually overlap)
  - GREAT (75) — distance ≤ 90 % (one bell-radius away)
  - GOOD (50) — any other on-screen hit (forgiving fallback)
- No magic constants. What you see is what you score. Works on any screen, any speed.
- **Static target bell raised on mobile**: `bottom-24` (96 px) on mobile, `md:bottom-5` (20 px) on desktop. Bells now sit ~75 % down the screen instead of jammed at the bottom edge. Lane-target dashed band moved to `bottom: 100 px` on mobile to keep the bells inside the visual catch zone.
- Halo timing widened to 55 %–95 % of fall (40 % duration) so kids get a long warning glow regardless of how the now-screen-relative target sits.

### Round 2 follow-up — PERFECT now lands at the visual overlap, with a lock-in flash
- User feedback: "it goes too low on the screen before it's perfect... maybe we time it so when its over the bell you play they lock together."
- Recomputed the geometry: the falling bell PNG visually overlaps the static target around progress 0.78–0.80, not 0.85. Lowered `IDEAL_PROGRESS` from 0.85 → **0.78** so PERFECT lands the instant the bells visually meet.
- Tightened the PERFECT window from ±7 % → ±5 % (now genuinely earned). GREAT tightened from ±18 % → ±14 %.
- Shifted the gold tap-now halo from the 0.78–0.95 range to **0.68–0.88** so it peaks right at the new ideal moment.
- New `bell-lock-in` flash: on a PERFECT hit, an expanding gold ring + bell pop animation fires on the static target bell (320 ms). Kids feel the falling bell "click" onto the target. Implementation is class-toggle via ref (zero React render), with a reflow trick so rapid successive PERFECTs all animate.

### "Tap-now!" halo on the falling bell
- New CSS keyframe `bell-tap-now` + `.bell-tap-now-halo` class. Each falling bell now renders a hidden gold radial halo BEHIND the PNG that animates in at 78 % of the fall and out at 95 %, with the duration scaled to the fall speed via `--glow-delay` / `--glow-duration` CSS variables set per-note from React.
- Result: the bell visibly glows gold right as it enters the hit window — kids see "now!" without reading a single word.
- Zero-JS per frame; pure CSS animation with delay → no perf cost.

### Mobile big-finger lanes
- New invisible `md:hidden` button covering the full lane on small screens, `data-testid="game-lane-{note}"`, sharing the same `doDown`/`doUp` handlers as the static bell.
- Falling bells now have `pointer-events: none` so a tap anywhere in the column lands on the lane button below — kids tap "where the bell is" and score, no precision required.
- Lower z-index (z-0) than the static target bell (z-10), so taps directly on the bell still go to the bell.

## Feb 19, 2026 — Audio stop + Jam Session declutter + Rhythm graduated feedback

### Charlie's Song Studio — Stop now actually stops the melody (P0)
- **Root cause**: `playPianoNote` scheduled future Web Audio sources but didn't return them, so when Stop was pressed only the drum loop and visual timers got cancelled — melody + chord sources kept firing.
- **Fix**: `usePianoAudio.playPianoNote` now returns the `AudioBufferSourceNode`. `SongStudioPage.playSong` pushes every scheduled chord triad and melody source into `scheduledSourcesRef`. `stopPlayback` iterates and calls `.stop()` on each, including future-scheduled ones (Web Audio honours this).

### Jam Session — Jelly Bells decluttered (P1)
- Removed solfège labels (Do/Re/Mi…) under each bell — they're already on the bell PNG.
- Removed letter-note `(C)/(D)/…` labels under each bell.
- Keyboard-hint badges (1–8) are now `hidden md:flex` — invisible on mobile/tablet, where touch is the primary input.
- On desktop, each badge moved from outside top-right to bottom-center, which lands it INSIDE the bell circle (every bell's top points outward, so its bottom faces the center medallion). Counter-rotated by `-rotation` so the digit stays upright. Fixes the "1" overlapping the Jam Along button at the 12 o'clock position.

### Who's Got the Rhythm — graduated timing feedback
- Previously every successful hit said "PERFECT" and awarded 100 pts regardless of timing.
- Now the tap's elapsed time is compared to the ideal hit moment (`0.85 × fallSpeed` ms after spawn — the moment the note visually meets the bell at the bottom).
- Three tiers, scaled to fall speed so Chill kids and Turbo kids get the same relative leniency:
  - **PERFECT!** (100 pts) — within ±7 % of fallSpeed (~245 ms Chill / ~105 ms Turbo)
  - **GREAT!** (75 pts) — within ±18 %
  - **GOOD!** (50 pts) — any other on-screen hit (way early or way late)
- Wrong-note penalty unchanged (−50 pts, floor at 0). `gameStats.perfect` counter still increments for any hit so existing sticker/achievement thresholds keep working.


## Feb 18, 2026 — Polish round (visual + immersion fixes)
Direct user feedback drove these:

1. **Sight-Reading staff is now pixel-correct**. Rebuilt `SolfegeStaff.js` around the user's custom quarter-note PNGs (`assets/notes/{do,re,mi,fa,so,la,ti,do-hi}.png`). Each note positions itself by anchoring its HEAD (at known % of the image height) to the proper treble-clef staff Y. Middle C now sits on its own visible ledger line BELOW the staff — not in Re's space. Re sits in the space between the bottom line and the ledger. Verified pixel-level: every head lands within ~1% (<3px on a 300px staff) of its musical-theory position.
2. **Bells make sound in Sight-Reading**. `handleBellTap` was only running game logic — it never called `playBellNote()`. Added it as the first line so every tap fires audio regardless of state.
3. **Renamed "Rest Quiz" → "Sneaky Note"** and made the gameplay actually about rests. `pickTune(level, {requireRest:true})` filters to tunes that contain a rest, then `buildRound` REPLACES that rest with a note (instead of inserting an extra note at a random spot). Phase label now reads *"Which note covered up the silence?"* and reveal text says *"Slot N (Solfege) covered up a silence — that spot should have been a REST!"* — kids actually learn that silences are part of music.
4. **Renamed "Tempo Quiz" → "Snail or Cheetah?"** to match the magical-world tone. Choice buttons are CHEETAH 🐆 and SNAIL 🐌. Win modal reads "Race Over!"
5. **Custom note artwork** — User uploaded 8 hand-drawn PNGs (per-note color + solfège label inside the head, stem-up for low notes, stem-down for high notes). Wired into the new staff renderer.

Tested via testing_agent_v3_fork iter_7 → 100% pass with pixel-level staff verification.

## Feb 17, 2026 — Phase 3: Four educational wins
Locked in 4 new features explicitly designed to boost music-learning ROI for teachers/parents while staying playful for kids:

### 1. Practice Buddy (daily-return streak)
- **NEW: `hooks/usePracticeStreak.js`** — Tracks `{count, lastDate}` in `jma_practice_streak_v1`. Same-day → no change; previous-day → +1; gaps → reset to 1. Awards `practice_buddy_3/7/14` stickers at the corresponding crossings.
- **NEW: `components/PracticeStreakChip.js`** — Hot-flame chip on the Home page; hidden when streak < 2 so day-1 kids don't see "1-day streak" (which would feel like pressure). Tier-colored: bronze (2) → orange (3) → red (7) → gold (14).
- **`data/stickers.js`** — Added 3 new collection stickers under Fun Milestones. Pure flair — these don't gate rank, the achievement ladder still does.

### 2. Sight-Reading Sprint
- **NEW: `pages/SightReadingPage.js`** + route `/sight-reading` + tile on Play menu.
- **NEW: `components/SolfegeStaff.js`** — 3-line staff with solfege circles colored by pitch (low notes sit lower, high notes higher). Currently-aimed-at note pulses gold; completed slots flip green; wrong taps flash red briefly.
- 3 tiers: Cadet (3 notes / 20 s / 7-bell pool), Pro (4 notes / 18 s / 7-bell pool), Master (5 notes / 16 s / full 8-bell + High C). Flow: hear-demo → tap-in-order → timer → win modal w/ time bonus.
- Earns **Music Scholar** achievement ladder (same domain as lessons — proves notation-reading skill).

### 3. Rest Quiz — new Detective Dr. Jellybone mode
- 4th difficulty `restquiz` in `pages/DetectivePage.js`: the suspect tune has an EXTRA note inserted (vs the wrong-pitch corruption in the other modes).
- 30-second `detective-timer` pill counts down during guess phase. Timeout → auto-reveal as miss + life lost.
- Build logic forks at `buildRound()` — extra-note mode splices a random in-scale note after a random existing note, builds a separate `corruptedSlotMap` to align with the longer corrupted sequence, and renders the chip row from `round.corrupted` so the extra chip actually appears.
- Reveal text: *"Slot N (Mi) was the EXTRA note!"*

### 4. Tempo Quiz — new Ear Quest sub-mode
- **NEW: `components/TempoListeningGame.js`** + `tempo` gameState in `pages/EarTrainerPage.js`.
- Plays two short clips of the same recognizable tune (Twinkle / Mary / Hot Cross Buns / Row Row Row), each at a different BPM. Kid picks **Faster** or **Slower**.
- 10 rounds per run. Progressive difficulty: rounds 1-3 use ±40 BPM (very obvious), 4-7 use ±20, 8-10 use ±10 (subtle).
- Earns **Rhythm Reader** achievement ladder: Cadet at 5+ correct, Pro at 8+, Master at 10/10.

### Verified
- Frontend testing agent: 100% pass (6/6 acceptance criteria), zero pageerror exceptions, all 13 routes clean.
- `CI=true yarn build` → Compiled successfully (263.25 KB gz, +8 KB for Phase 3).

## Feb 16, 2026 — Achievement-driven progression system (Phase 1 + 2)
Major redesign — ranks are no longer earned by **collecting** stickers, they're earned by **demonstrating skills**.

### Data model
- **NEW: `data/achievements.js`** — 6 skill domains × 3 tiers = **18 achievement stickers** (Rhythm Reader, Note Detective, Keyboard Scout, Beat Builder, Song Creator, Music Scholar — each in Cadet/Pro/Master).
- **`data/stickers.js`** split into `COLLECTION_STICKERS` (pure flair) and `ACHIEVEMENT_STICKERS` (the rank-gating set).
- **`data/ranks.js`** rebuilt: 7 ranks (Polliwog · Tadpole · Apprentice · Soloist · Performer · Conductor · Maestro), each gated by domain breadth × tier depth (e.g. Maestro = 3 Master badges across different domains).

### Gating rules (the "no Cadet→Maestro speedrun" enforcement)
- **Tier prerequisite**: within a domain, Pro requires Cadet, Master requires Pro. `earnAchievement()` silently no-ops if the prereq is missing.
- **Cross-domain breadth**: top ranks require Pro/Master across **3 different domains** — so kids must demonstrate variety, not just depth in one game.
- Together: reaching Maestro requires **9 separate skill proofs** (3 domains × 3 tiers).

### Engine + hooks
- **NEW: `earnAchievement(domain, tier)`** and **`earnAchievementUpTo(domain, tier)`** helpers in `useStickers`.
- **One-time legacy migration**: kids who already earned legacy stickers (`match_easy`, `ach_simon_5`, `lesson_graduate`, etc.) get retro-credited with the equivalent achievements. Tracked via `jma_stickers_migrated_v2` key so it runs exactly once.
- **`useRank`** rebuilt to derive rank from the achievement subset, not raw count. Exposes `currentRank`, `nextRank`, `progress`, `achievementCount`.

### Call-site rewires (game → achievement)
- **Rhythm Arcade**: 20 perfect hits → Cadet; 90% accuracy → Pro; Turbo completion → Master; streak ≥15 also → Pro
- **Detective Dr. Jellybone**: Easy/Medium/Hard completion → Cadet/Pro/Master (Ear domain)
- **Note Match**: Easy/Medium/Hard → Cadet/Pro/Master (Ear domain — shares ladder with Detective)
- **Stew Kazoo Says**: level 1 → Cadet, level 4 → Pro, level 8 → Master (Keyboard domain)
- **Beat Lab**: any loop → Cadet, 3+ active tracks → Pro, 4+ tracks at 140+ BPM → Master
- **Song Studio**: save → Cadet, save in 3 moods → Pro, fully-filled song → Master
- **Lessons**: lesson 1 → Cadet, lessons 1–4 → Pro, all 7 → Master
- **Jam Hall**: play all 8 bells (any tab) → Keyboard Cadet
- **Ear Quest**: score 5 → Note Detective Cadet (+ Master bonus path)

### Visual treatment (Phase 2)
- **NEW: `<AchievementBadge />`** — octagonal shield silhouette + bronze/silver/gold metallic frame + radial enamel + domain portrait + chunky tier ribbon ("CADET" / "PRO" / "MASTER"). Locked badges desaturate + show a lock icon. Three sizes (`sm`/`md`/`lg`). Visually distinct from round collection stickers.
- **`StickerBookPage`** rebuilt as 3 sections:
  1. 🏅 **Achievement Badges** (top) — one row per domain, 3 badges across, RankBadge with progress meter sits on top
  2. 🎭 **Meet the Band**, 👕 **Outfit Collection**, 🎺 **Instruments**, 🔔 **Jellybells**, 🏆 **Song Champion**, 📖 **Lessons**, ⭐ **Fun Milestones** — all collection stickers, original round-card style
- **`RankBadge`** now shows the next-rank **requirement label** ("Next: Earn Pro badges in 3 different domains") instead of a vague sticker count, plus a `x/3` progress meter.

### Verified
- `CI=true yarn build` → Compiled successfully.
- Live test: seeded 5 achievements (Rhythm Cadet+Pro, Ear Cadet, Beat Cadet, Scholar Cadet) → correctly placed kid at **Soloist** rank (1 Pro earned), with progress showing "1/3 toward Performer".

## Feb 16, 2026 — Card hero sizing (correct one this time)
- Reverted the homepage Finn/Charlie/Shield sizes back to original — those were never the issue.
- **The actual fix**: per-card `iconWidthPct` controlling the **boombox / storybook / beat pad** heroes inside the PLAY/LEARN/CREATE cards.
  - Boombox: 118% → **95%** (smaller, more breathing room above the title)
  - Beat Pad: 118% → **95%**
  - Storybook: 118% → **118%** kept big *(it's the same number, but with no `iconWidthPct` previously the storybook was using the same 118% as the others — what made it look small was its `y: -10` upward translate). Now it sits naturally centered.*
  - Storybook `iconShift.y`: `-10` → **`0`**. The storybook art has more padding around the subject, so the upward shift was making it look stuck high and small. Removing it lets the artwork center optically.
- **Cards even more square**: aspect `1 / 1.15` → **`1 / 1.05`**. Min-height also reduced 360 → 340.
- All three card heroes now read at visually equal size and sit in the same vertical position on the card.

## Feb 16, 2026 — Rhythm picker iPhone fix + library tidy-up + home page squared
### Rhythm Game menu
- **Category cleanup**:
  - Dropped the **"All"** filter chip
  - Removed the entire **"Game"** category and all 3 of its tracks (Super Jump Theme, Block Drop, Hero's Lullaby)
  - Renamed **"Original"** → **"Mini Jams"** (the 4 short bonus tracks) — no longer confusable with "JMA Originals"
  - Default chip is now **JMA Originals** so kids land on the most-played category right away
  - Cleaner palette: only 3 categories, each color-coded (yellow/purple/pink)
- **iPhone song-card layout fix**: the previous narrow-card layout was squashing the title text on narrow phones. Reworked:
  - `min-height: 78 px` so cards never go pancake-thin
  - Title allowed to **wrap to 2 lines** (via `-webkit-line-clamp: 2`) instead of `truncate`
  - Mobile padding tightened on the icon column
  - Category badge gets its own `truncate` so it never bleeds past the column
  - All four content blocks now have proper vertical centering inside the card.

### Home page
- **Cards squared up**: `aspect-ratio` `4 / 5.6` → **`1 / 1.15`** (nearly square). Min-height also reduced from 460 → 360 px. Less negative space, more impact.
- **Heroes shrunk ~20%** to balance the smaller cards:
  - Finn: `clamp(61, 11vw, 131)` → `clamp(48, 9vw, 105)`
  - Shield: `clamp(120, 22vw, 280)` → `clamp(96, 17.5vw, 220)`
  - Charlie: `clamp(80, 14vw, 170)` → `clamp(64, 11vw, 136)`
- Card padding also dialed down slightly to match the squarer canvas.

## Feb 16, 2026 — Song picker bg → calm sky gradient
- The rotating-sunburst page background was the real noise source behind the cards. Replaced with the **same calm sky gradient the homepage uses** (`#BCE5F2 → #E5F2F8 → #FFEEC5` top-to-bottom). Now the cards float on a clean blue→cream sky and every element reads on its own.
- Brand consistency win: same gradient as `HomePage`, so the song picker and home now feel like the same world.

## Feb 16, 2026 — Song picker cards calmed
- **Song tile backgrounds → solid white** (was a tinted-to-white gradient). 17 cards in different tints was creating a rainbow soup. The color cue is now carried entirely by the **left stripe + circular icon button**, which keeps the category encoding clear without a busy backdrop. Drum songs still distinct via purple stripe + drum icon.
- Drop shadow lightened (`rgba(10,37,64,0.12)` → `0.10`) to match the calmer surface.

## Feb 16, 2026 — Rhythm song picker polished + pulse one more notch gentler
- **Pulse another notch gentler** (per user "tiny bit gentler please"):
  - `scale 1.045 → 1.03`
  - `rotate ±0.6° → ±0.4°`
  - `brightness +4% → +2.5%`
  - Halo overlay peak `0.22 → 0.15`
- **`Who's Got the Rhythm?` song selection screen — full polish pass**:
  - New helper config `CATEGORY_STYLE` maps each category (`JMA Originals`, `Classic`, `Game`, `Original`) to an icon + tint + accent. Drum songs override with purple to stay visually distinct.
  - **Speed pills**: replaced flat row of `chunky-btn`s with rounded-full pills carrying proper icons (Leaf / Music2 / Flame) + a "SPEED" label, with the selected pill rising 2 px with a deeper drop shadow.
  - **Category chips**: each now uses its category icon + theme tint for the active state (yellow JMA, purple Classic, green Game, pink Original) with chunky borders.
  - **Song cards** rebuilt as 4-section flex tiles:
    1. Left **color stripe** in the category's tint (or purple for drum tracks)
    2. **Big circular icon button** in the category accent color (Play/Drum icon)
    3. **Title + meta** column — category badge with icon, big chunky-display song name, `X hits · BPM` line
    4. Right slot — **Trophy + high-score pill** if played, else a small white circular play arrow
  - Subtle category-tint → white gradient background, chunky drop shadow, hover lift.
  - Verified live: 17 cards render, chips/pills look great, drum songs are clearly distinguishable.

## Feb 16, 2026 — Rhythm BG pulse dialed WAY down (kid-safe)
Previous pulse was too intense. Reduced all four channels ~3–4× so the sunburst feels "alive" instead of "rave":
- `scale`: `1.0 → 1.18` → **`1.0 → 1.045`**
- `rotate`: `±1.5°` → **`±0.6°`**
- `brightness`: `+18%` → **`+4%`**
- Radial halo overlay peak opacity: `0.7` → **`0.22`** (and base color from `rgba(255,255,255,0.55)` → `0.32`)

The brightness delta is now small enough to be well under photo-sensitivity thresholds even at the fastest song (152 BPM = 2.5 pulses/sec → 4% brightness swing is below WCAG's 10% large-area threshold). The motion still tracks the BPM, so the background reads as "breathing with the song" without being distracting.

## Feb 16, 2026 — Rhythm BG actually pulses + Surprise Me in Song Studio
- **Rhythm Game background — visibly pulsing now**: pure scale-only animation was invisible because a uniform radial sunburst has no fixed reference point. Rebuilt as a compound animation:
  - `scale: 1.00 → 1.18 → 1.00`
  - `rotate: -1.5° → 1.5° → -1.5°` (makes the rays clearly twist instead of just zooming)
  - `filter: brightness(1) → brightness(1.18) → brightness(1)` (light pulse)
  - Plus a separate radial-glow overlay (`screen` blend mode) pulsing opacity `0.15 → 0.7 → 0.15` for an extra "stadium light" punch
  - Verified live: across 4 samples in one beat the transform matrix and brightness clearly cycled — `1.016 → 1.168 → 1.007 → 1.174`, brightness `1.009 → 1.120 → 1.005 → 1.138`. Big visible throb.
- **Song Studio — Surprise Me! button**: new pill (mood-accent colored, with `Dices` icon) sits next to Clear. On tap:
  - Picks a random number of seahorse rests in **[6, 11]** (guaranteed)
  - Fills the remaining slots with random notes from the active mood's scale (high-octave keys only)
  - Fisher-Yates shuffles so rests are scattered, not clumped
  - Verified live: 5 consecutive clicks produced rest counts of `8, 10, 8, 11, 8` — all in range, all 16 slots filled, zero empties.

## Feb 16, 2026 — Rhythm Arcade pulsing background
- **`Who's Got the Rhythm?` playing screen** — the cool-blue sunburst background now **pulses with the song's BPM**. Subtle scale wobble (`1.0 → 1.06 → 1.0`) on an `easeInOut` curve, period = `60 / bpm` seconds. Verified live: 7 sequential `getComputedStyle(...).transform` samples across 660 ms showed 7 distinct scales (`1.02778 → 1.00000 → 1.03073 → 1.05942 → 1.04915 → 1.00646 → 1.00593`).
- Implementation: a separate `motion.div` overlay carries the `sunburst-cool` class and the `scale` animation, sitting at `z-index: 0` behind a `relative z-10` main game area so the lanes/notes don't scale. Outer wrapper also gets `overflow-hidden` to clip the breathing layer at the edges.

## Feb 16, 2026 — Speakers pulse on beat + softer card SFX
- **PulsingSpeakers locked to BPM**: the speakers now accept a `bpm` prop and pulse once per eighth-note while playing (`intervalMs = 60_000 / bpm / 2`, clamped to a 70 ms floor). Beat Lab passes its live `bpm` so the amps actually pump with the loop. When playback stops they drift back to the idle 400 ms cycle.
- **Softer card-click SFX everywhere except DJ Scratch**:
  - Home cards (PLAY · LEARN · CREATE): `0.85` → `0.42` volume.
  - Submenu tiles: `0.85` → `0.42`, *except* `sfx-dj-scratch.mp3` on Beat Lab which keeps the signature `0.85` punch.
  - Same delay/transition behaviour preserved; only volume tuned down.
- Both touches verified via `CI=true yarn build` → **Compiled successfully**, no lint regressions.

## Feb 16, 2026 — Cleanup + Beat Lab speakers + GH Pages build verified
- **Orphan asset cleanup**: removed `assets/characters/catfish.png` (118 KB) and `assets/backgrounds/BG.png` (260 KB) — both genuinely unreferenced. Total ~376 KB shaved off the GH Pages payload.
- **Pulsing speakers in Beat Lab**: new reusable `<PulsingSpeakers />` component (3-frame cycle, accelerates from 400 ms → 120 ms when `playing` is true). Dropped at both bottom corners of the Beat Lab page; the right one mirrors via `scaleX(-1)`. Verified live: cycling frames at the correct interval, present on both sides. Component is reusable — can drop into Stew Kazoo Says or other pages later.
- **GH Pages build verified end-to-end**:
  - `HashRouter` ✓
  - No absolute `/assets/...` or `url(/...)` in source ✓
  - `public/index.html` clean ✓
  - `package.json`: `"homepage": "."`, `predeploy` + `deploy` scripts ✓
  - `CI=true yarn build` → **`Compiled successfully`**, 250 KB JS gz / 13.8 KB CSS gz
  - Built `index.html` serves `./static/...` references (all relative) ✓
  - Static server smoke test: `HTTP 200` for `/index.html`, `/static/js/main.*.js`, and a sample asset (`/assets/animations/jelly-rocks-blimp-1.png`) ✓
- **SimonSays useCallback dep fix**: added `celebrate` to the dependency array of the play-handling callback (it was a missing dep flagged by `react-hooks/exhaustive-deps` in CI). `celebrate` is itself a `useCallback`, so this doesn't cause re-renders.

## Feb 16, 2026 — Detective copy, blimp v3, Song Studio bubble fix
- **Detective Dr. Jellybone**: copy fixes
  - "How to play" → *"Tap the wrong note as you hear it..."* (was "beat")
  - Guess-phase hint → *"Tap the note that sounded wrong"* (was "beat")
- **Blimp v3 — actually diagonal + size variation**:
  - Re-extracted to a `makeLap()` factory that *guarantees* a minimum |endY − startY| delta of 6 vh (capped at 14 vh) so the y-trajectory is never accidentally flat. Verified live: blimp Y drifted 77→109 px (32 px diagonal) across 10 s — confirmed via DOM measurements at 5 sample times.
  - Each lap also picks a random scale in `0.4 – 0.9` of base width — so the blimp can drift small-and-far one lap, big-and-close the next.
  - Duration still random 22–34 s; direction still alternates each lap with `scaleX(-direction)` flip so it never flies backwards.
- **CREATE menu — Song Studio card**: dropped the `"Make a hit!"` bubble that was landing on Charlie's face (Charlie is already in the bg scene with his own context).

## Feb 16, 2026 — Blimp: forward-flying + diagonal randomization + 80% size
- **Blimp size 80% of original**: `clamp(112px, 18vw, 256px)` (was the half-size version). Verified at 1280 viewport it renders ~236 px wide.
- **Flight orientation fixed**: the source PNG faces LEFT by default, so the previous `scaleX(direction)` had it always flying backwards. Inverted to `scaleX(-direction)` — now direction=1 → scaleX=-1 (faces RIGHT while moving right), direction=-1 → scaleX=1 (faces LEFT while moving left). Verified via inline transform check.
- **Random diagonal flight path**: each lap now generates fresh random parameters and re-mounts the motion node via `key=`:
  - `startY`: 2 – 18% of viewport height
  - `endY`:   2 – 18% of viewport height (independent → varied diagonal angle)
  - `durationSec`: 22 – 34 seconds (so timing varies too)
  - Direction alternates each lap
  - `x` eases linear (true travel feel), `y` eases easeInOut (gentle arc), `rotate` bobs ±3° every 6 s
- Result: no two laps look the same. Sometimes the blimp drifts gently down-and-right, sometimes climbs up-and-left, sometimes nearly level — like wind currents in the sky.

## Feb 16, 2026 — Blimp size + flip, longer Stew breathing room
- **Blimp half the size**: `clamp(140px, 22vw, 320px)` → `clamp(70px, 11vw, 160px)`. Verified at 1280 viewport it now renders ~145 px wide (was ~280 px).
- **Blimp never flies backwards**: rebuilt the drift as a two-phase animation. Each phase drifts the blimp linearly all the way across the screen (`-30vw → 110vw`) over 28 s. When it's off-screen we flip `scaleX` (via an inner wrapper so it doesn't fight motion's own transform) and the next phase drifts the now-mirrored blimp back the other way. Linear easing so the cross looks like real travel; rotate bob still oscillates ±3° on a 6 s loop.
- **Stew Says — more breathing room after level-clear**: bumped the post-fanfare delay from 900 ms → **1400 ms** so the celebration and the next round don't smush together.

## Feb 16, 2026 — Home flair + Stew round-start audio fix
- **Stew Kazoo Says — fanfare/pattern-start bug fixed**: on level-up, `celebrate()` was firing 4 fanfare kazoo notes (C-E-G-HighC at 0/90/180/270 ms) and the next-level `showing` phase started immediately afterward, so the fanfare notes piled onto the first pattern note(s) — sounded like a chord at round start. Added a **900 ms delay** between the fanfare and the next pattern's first note so the fanfare can fully decay first.
- **Finn another −10% on the homepage**: `clamp(68px, 12vw, 145px)` → `clamp(61px, 11vw, 131px)`. Verified: at 1280px viewport Finn now renders at exactly 131 px wide.
- **Jelly Rocks blimp drifting in the sky** (new `BlimpFlyby` component on `HomePage`): 3-frame loop cycling every 220 ms, slowly drifting `-25vw → 85vw → -25vw` across the sky strip over 56 s (rotation oscillates ±3° on a separate 14 s loop for a gentle bob). Placed at `z-index: 0` so it sits behind the hero, sky doodles, cards, and everything else.
- **Shield easter egg**: tapping the JMA shield logo cycles deterministically through **6 different animations** — `wobble`, `spin`, `pop`, `flipx`, `shimmy`, and `jelly` (squash/stretch). Each click animates the shield with `useAnimationControls`. Intro spring animation preserved.

## Feb 16, 2026 — Song Studio mobile pass + seahorse fix
- **Seahorse rest — restored the black quarter-rest body**: my earlier processing wiped out near-black pixels everywhere, which accidentally erased the seahorse's own black body (the part that forms the quarter-rest shape). The source PNG was already correctly transparent at the corners — no black-stripping needed. Re-exported as a straight trim + resize so the black quarter-rest tail is now visible inside slots and the Rest button.
- **Song Studio fits a phone screen with zero scroll** (390×800 → document height = 800px exact, no overflow):
  - Mood picker becomes a horizontal **emoji + name pill** on mobile (no descriptions, smaller emoji, gap-1.5).
  - Charlie hidden on `<sm` widths so the grid can stretch full-width.
  - Meta line gets `text-[9px]` + `truncate`; "Chords:" label collapses on the smallest widths.
  - Tip line shortened ("💡 Leave a beat empty, or tap the 🐠 for a rest!"), `py-0.5` on mobile.
  - Grid card padding `p-1.5 md:p-2`; chord-label cells `w-8 md:w-12`.
  - **Piano keys**: width `clamp(34px, 7.5vw, 64px)`, height `clamp(78px, 16vw, 170px)` (was 120 min) — keyboard now ~40% shorter on mobile.
  - Rest button matched to the same dimensions.
  - Toggles + control buttons: smaller padding, smaller icons (`w-3.5 h-3.5 md:w-4 md:h-4`), smaller text (`text-[11px] md:text-sm`), tighter gaps.
  - Console wrap: `p-2 md:p-4` (was `p-3 md:p-4`), shorter "My Songs" → "Songs" label on the gallery button.
- Desktop layout unchanged — all the `md:` modifiers preserve the full-size experience.

## Feb 16, 2026 — Detective: buzz-in during the suspect playback
- Kids can now **tap the currently-lit chip during the SUSPECT/corrupted playback** to lock in their guess the moment they hear something off. Other chips stay locked until the playback finishes (so it's "buzz on the wrong note" — not random clicks).
- Tapping the lit chip cancels the remaining playback and snaps straight to the reveal phase.
- Phase hint reworded: `🔍 Tap the wrong note the moment you hear it!`
- "How to Play" updated: *"Tap the wrong beat as you hear it, or wait until the end."*
- Verified live via automated test: clicking the lit chip mid-corrupted-playback transitions phase to `reveal`, locks the guess, and shows the case result.

## Feb 16, 2026 — Polish round: calmer Song Studio, finished Detective chips, smaller Finn
- **Charlie's Song Studio — calmer hierarchy**:
  - Reduced the mood-color tint over the studio backdrop (from 55%→33% at top, transparent middle, soft white wash at bottom) so the studio reads as a single unified setting instead of fighting the controls.
  - Wrapped the entire control surface (mood picker + grid + keyboard + toggles + buttons) in a single frosted-glass "studio console" panel: `rgba(255,252,247,0.86)` + `backdropFilter: blur(14px)` + chunky 10px JMA-dark drop. Studio bg shows around the edges only; controls now sit on one cohesive surface.
- **Detective Dr. Jellybone — finished beat-chip aesthetic**: Replaced the plain white rounded rectangles with proper "evidence card" chips that match the corkboard theme:
  - Cream paper base (`#FFF7E1`) with a subtle inner gradient + double-shadow (3D button drop + ambient cast shadow)
  - Numbered badge (white circle, bordered) at the top instead of a bare number
  - Centered eighth-note SVG glyph at the body (swaps to solfege text on reveal)
  - Per-slot deterministic tilt (-3° to +3°) for a hand-pinned look
  - Lit playback state now uses the bell's color with a colored outer-ring glow + scale-up; reveal states still hard green/red
  - Larger touch target (46–64px wide × 60–86px tall)
- **Home page — Finn scaled 15% smaller**: `clamp(80px, 14vw, 170px)` → `clamp(68px, 12vw, 145px)`. Now visually balances Charlie and the JMA shield rather than overpowering them.

## Feb 16, 2026 — Lesson-world art landed in the app
Imported & optimized the 5-23 batch of lesson artwork for in-app use.

**New backgrounds (`assets/backgrounds/`):**
- `detective-room.jpg` (1600×900, 260 KB) — corkboard with detective notes. Drives the Detective Dr. Jellybone card on the PLAY menu AND the full-screen Detective game scene (menu + playing screens).
- `recording-studio.jpg` (1600×900, 100 KB) — JMA Recording Studio. Drives the full-screen Charlie's Song Studio scene; overlaid with a soft mood-color tint that crossfades when kids switch moods.
- `charlie-in-studio.jpg` (1280×720, 97 KB) — Charlie-in-the-Studio scene art used as the Song Studio card on the CREATE menu. Charlie's already in-scene, so no separate character overlay needed.

**New character (`assets/characters/`):**
- `charlie-studio.png` (663×700, 265 KB) — Studio Charlie cutout. Replaces the per-mood Charlie outfits (`charlie.png`, `charlie-zoot.png`, `charlie-steampunk.png`) in the Song Studio so the studio setting feels consistent across Happy/Sad/Mysterious.

**New animation frame sets (`assets/animations/`, ready for use):**
- `jelly-rocks-blimp-{1,2,3}.png` (800×450, 83-84 KB each) — 3-frame Jelly Rocks blimp animation.
- `speakers-stew-{1,2,3}.png` (600×600, 65-82 KB each) — 3-frame speaker pulse animation.

**Wired changes:**
- `pages/PlayMenuPage.js` — Detective tile bg → `detective-room.jpg`.
- `pages/CreateMenuPage.js` — Song Studio tile bg → `charlie-in-studio.jpg`, character overlay removed.
- `pages/DetectivePage.js` — menu + playing screens bg → `detective-room.jpg`.
- `pages/SongStudioPage.js` — page bg → fixed `recording-studio.jpg` with a per-mood color tint overlay (no longer the plain mood-color gradient). Content moved to `z-10` so it sits above the tint.
- `data/songStudio.js` — all three mood `charlie` fields → `charlie-studio.png`.

## Feb 16, 2026 — Song Studio: seahorse Rest button
- **New "Rest" key** sits at the right edge of the piano keyboard, sized to match the white keys. Uses the user-supplied seahorse artwork (`assets/ui/seahorse-rest.png`, ~22 KB, 183×320, black-bg removed + trimmed).
- Tapping the rest button drops a `REST` sentinel into the current slot, advances the auto-cursor, and plays no sound. The slot now displays the seahorse PNG (replacing the slot number) both during composition and during playback (the slot also gently lights pink when its beat plays).
- Counter updated: `"3 notes + 1 rest · 100 BPM · plays 2×"`. Gallery counts only musical notes (excludes rests).
- Existing saved songs still work — `REST` is a new value, never present in older saves; no migration needed.
- Tip text updated: *"💡 Tip: Leave a beat empty, or tap the 🐠 seahorse for a rest!"*

## Feb 16, 2026 — Song Studio: tight drum sync + slower mysterious
- **Drum-sync rebuild**: Replaced the HTMLAudioElement drum playback with Web Audio buffer playback. The drum loop AND every chord/melody note now start from a single `AudioContext.currentTime + 120ms` anchor, so they're sample-accurate-aligned no matter the OS audio latency. New helpers in `usePianoAudio`: `preloadLoop`, `playLoop`, `now`, and a `when` parameter on `playPianoNote`.
- **Mysterious mood slowed**: 120 BPM → **85 BPM** ("spooky & wandering" now actually wanders). Built a new custom drum loop at 85 BPM (`assets/audio/songs/jam_drums_mysterious.mp3`, ~45s) — sparse kick + low-tom hit on beat 1, soft snare on beat 3, and a low-tom flourish on the "&" of 4 every other measure for that off-kilter mystery feel.

## Feb 16, 2026 — Song Studio: low chord voicings + ballad backbeat tweak
- **Chord voicings dropped below the melody**: All chord triads now use 1st/2nd inversions chosen so every chord note sits ≤ **B4** — strictly below the kid's C5→C6 melody octave. No more harmonic muddiness.
  - Happy: C(C-E-G), G(D-G-B), Am(C-E-A), F(C-F-A)
  - Sad: Am(C-E-A), F(C-F-A), C(C-E-G), G(D-G-B)
  - Mysterious: Dm(D-F-A), G(D-G-B), Dm(D-F-A), C(C-E-G)
- **Sad drum loop — ballad backbeat**: Replaced the soft kick on beat 3 with a snare in every measure. Pattern is now: kick on beat 1, snare on beat 3, ride-bell sparkle on every beat. Classic slow-ballad feel.

## Feb 16, 2026 — Charlie's Song Studio: kid-friendly playability pass
- **Rests-are-OK hint**: Added a dashed callout above the 16-slot grid: *"💡 Tip: You don't have to fill every beat — leave some empty for rests!"* Counter changed from `0 / 16 beats placed` to `0 notes placed` so the empty grid no longer feels like an unfinished assignment.
- **High-octave melody keyboard**: Piano now shows only the **top octave (C5 → C6, 8 white keys)** instead of the full C4→C6 range. Kids' melody notes sit cleanly above the I-V-vi-IV chord triads (which live in C4→E5), so harmonies no longer clash. The audio hook still preloads the full C4→C6 set so the underlying chord triads still play with zero latency.
- **Drums + Chords toggles**: Two new pill buttons (`Chords ON/OFF`, `Drums ON/OFF`) sit between the keyboard and the play row. Kids can solo their melody, or hear it with just chords / just drums / both. Drums toggle is auto-disabled on moods with no drum loop.
- **Sad drum loop**: New custom-built ~55s loop at 70 BPM (`assets/audio/songs/jam_drums_sad.mp3`) — sparse ride-bell groove on every beat with a soft kick on 1 & 3 and a brushed snare on beat 3 of every other measure. Replaces the previous "no drums" Sad mood.

## Feb 14, 2026 — Clubhouse Find-and-Reveal + Custom Harp Artwork
- **Custom JMA harp Home button**: Saved user-uploaded artwork to `assets/ui/jma-harp.png`. Made the black background transparent + resized to 187×256 (8.8 KB). `HarpIcon.js` now renders the PNG instead of the SVG placeholder.
- **Removed duplicate Stew**: The standalone Stew character on the Fun Facts scene was creating two visible Stews (since Lou's image already has Stew on his shoulder). Now back to 6 characters total.
- **Fun Facts as a find-the-character game**:
  - Characters start as **dark silhouettes with a warm yellow glow halo** — kids must spot and tap each shadow to reveal them.
  - Tapping a hidden friend fires a sparkle "pop" animation, reveals the full-color character, then opens the fact modal.
  - **Mobile minWidth bumped to 1100px** so kids genuinely have to swipe/pan to discover everyone.
  - **Found state persists** in `localStorage.jma_funfacts_found_v1` so progress isn't lost between visits.
  - Live progress chip: "0 / 6 friends found" turns into "★ ALL FOUND! ★" when complete.
  - Auto-awards the `ach_fact_finder` sticker on first all-found.

## Feb 14, 2026 — Polish Round (post-partner feedback)
- **BUG FIX**: Stew Kazoo Says no longer goes to a blank page after beating level 8. Now triggers a mega confetti celebration + "YOU BEAT THE WHOLE GAME!" message, then auto-navigates home after 3.2s. Mid-game level clears also fire confetti (mega on level 5).
- **Backgrounds**: Deleted `public/assets/backgrounds/stage.png` (had the Snoopy "Legendary Concert" art). Rhythm Arcade card now uses a vibrant red diagonal-stripe arcade gradient instead.
- **Home card character sizing**: Added per-destination `charWidthPct` + `char2WidthPct` so Jazzy / Stew / Dr Jellybone / Chunk are no longer oversized relative to other characters.
- **Home card spacing**: Increased gap between primary + secondary characters (Jam Hall's Finn and Charlie no longer overlap).
- **RoomCharacters polish**:
  - Hidden on mobile (`hidden md:block`) so they no longer crowd the touch play area.
  - Added per-character scale map (Jazzy ×0.55, Stew ×0.6, Dr Jellybone ×0.7) so the ambient cast feels visually consistent.
  - Fixed-size square container + `object-contain` so tapping to cycle outfits no longer shifts the character's footprint.
- **Jam Hall duplicate Finn**: `CharacterReaction` mascot now only renders at streak ≥ 3 (previously the default low-streak Finn overlapped the room's Charlie at bottom-right).
- **Perf**: All home card character images now use `loading="lazy"` to help mobile load.

## Feb 14, 2026 — Academy Campus Evolution (Phases 1-4)
**Global rebrand to "Jelly of the Month Club Music Academy" (JMA).**
- HTML title + on-page banner updated.
- `Stu Kazoo → Stew Kazoo`, `Loop Studio → Beat Lab`, `Free Play → Jam Hall`, `Rhythm Game → Rhythm Arcade`, `Ear Trainer → Ear Quest`, `Fun Facts → Fun Facts Clubhouse` everywhere.

**Home page redesigned as Academy Campus.**
- 6 destination room-cards with background scenes, character peeks, and "sign" nameplates.
- Vertical-stack on mobile, 2-column grid on desktop.
- Sky cartoon-note backdrop + brand banner.

**Harp Home button.**
- Replaced JMA-shield Home button with a custom `<HarpIcon />` SVG + "Home" label across all pages and the Sticker Book.

**Character personality everywhere.**
- New `RoomCharacters` component drops 3-4 friendly characters onto Jam Hall, Rhythm Arcade, Stew Kazoo Says, Ear Quest, and Beat Lab.
- Tapping a character cycles through their outfit assets (uses existing artwork) and pops a transient speech bubble.

**Fun Facts mobile exploration.**
- Clubhouse scene now horizontally pannable on mobile (`minWidth: 720px`); desktop unchanged at 16:9 capped at 1200px.
- Added a 7th character (`Stew`) with its own kazoo/birds-themed fact bank.

**Academy Rank progression.**
- `Polliwog → Tadpole → Apprentice → Soloist → Conductor → Maestro` ladder driven by sticker count.
- `RankBadge` visible on Home + Sticker Book.
- `RankUpCelebration` overlay (confetti) fires once on tier crossings; persisted in `localStorage.jma_rank_seen_v1`.

**Testing**: 22/24 frontend acceptance criteria passed in iteration_3 testing. Two issues found and fixed:
1. Stew character in Fun Facts now opens fact modal (added `Stew` key to `musicFacts.js`).
2. Mobile Fun Facts scene now genuinely scrolls horizontally (`minWidth: 720px` instead of `min(720px, 95vw)`).

---

## Feb 2026 (prior)

### Score Penalty Tuning
- Who's Got the Rhythm: wrong-note penalty -50 (clamped at 0).
- Stu Kazoo Says: wrong-answer penalty -5*level (clamped at 0).

### Stu Kazoo Says — Level Clear Celebration (initial)
- Added `Confetti.js` + `playFanfare()` arpeggio.

## Jun 2026 — Tablet (iPad) layout overlap pass
- **Root cause 1**: Home PLAY/LEARN/CREATE cards had `minHeight: 340` + `aspectRatio`; CSS transfers min-height into a ~324px min-width, so 3 columns at 768px overflowed/piled up. Removed `minHeight` (HomePage.js).
- **Root cause 2**: GameHeader harp jumped to 80px at `md` (768px) while page paddings were tuned for 48px. Harp now 48 / 56 (md) / 80 (lg). Header footprint ≈ 75px mobile, 87px md, 116px lg → use `pt-20 md:pt-24 lg:pt-32` for content that spans full width under it.
- **Root cause 3**: Menu screens used `justify-center` on `min-h-screen`; when content is taller than a landscape iPad, flexbox clips the top under the fixed header. Added `.jma-safe-center` (`justify-content: safe center`, index.css) + `pt-20 md:pt-24 lg:pt-32` on all `min-h-screen ... justify-center p-4` menu containers (Detective, Ear Quest, Note Match, Results, Jelly Jukebox, Sight Reading, Stew Kazoo).
- Stew Kazoo Says: fixed progress bar was left-aligned under the harp → now `flex justify-center`.
- Who's Got the Rhythm: removed duplicate header title, "Pick your jam" pill on its own line, ModeTile title font/char column tuned so PARROT PERCUSSION no longer breaks mid-word at 768px.
- Beat Lab: toolbar padding bumped so PLAY sits below the harp.
- Sub-menu tiles (Play/Learn/Create): title moved to TOP-LEFT and width-capped to the column left of the hero (`calc(100 - charWidthPct + 6)%`); gradient scrim flipped to the top; hover "Enter" chip moved to bottom-left. Heroes are now never covered by text on iPad.
- Jelly Jukebox in-game progress bar centered (`flex justify-center`) so it clears the harp.
- "Lessons 1–7" → "Season 1" (LearnMenuPage tile + LessonsPage heading).
- Charlie's Song Studio: no-scroll console. Slot size is `--slot: clamp(40px, 8.5vh, 72px)` (was aspect-square growing to 150px on desktop); piano keys `clamp(70px,13vh,150px)`; mood picker is a single compact row; md+ layout = `grid-cols-[auto_minmax(0,1fr)_auto]` with Charlie | grid | stacked control rail, piano spanning under the first two. Verified scrollHeight == viewport at 1366×768, 1024×700, 768×1024, 390×844.
