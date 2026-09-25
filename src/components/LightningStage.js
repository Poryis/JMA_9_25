// LightningStage — SVG overlay that draws real lightning bolts from the
// Time Machine up to every currently-active character. Replaces the old
// PNG lightning frames (which the user hated: static, low-res, misaligned).
//
// How it works:
//   • Parent passes `stageRef` (the DOM node whose local coords the SVG
//     should use), `sourceRef` (Time Machine button), and a Map of
//     active character id -> DOM ref (the visible char slot).
//   • On every mount, resize, or activeIds change, we recompute the
//     endpoints in stage-local pixels.
//   • Each active character gets a persistent "arc" — a thin jagged
//     path re-generated every ~120 ms so it looks like live plasma.
//   • Characters currently in the `zapping` set get a BRIGHT, THICK,
//     multi-branch bolt for the full duration of the zap.
//   • All drawn inside a single <svg> with a Gaussian-blur glow filter
//     so browsers only paint once per frame.

import { useEffect, useMemo, useRef, useState } from 'react';

// Deterministic-ish jagged path generator. Returns an SVG path `d`
// string with `segments` zig-zag points between (x1,y1) and (x2,y2).
// `jitter` controls how far each waypoint deviates from the straight
// line. Randomised each call so consecutive frames look like real
// crackling plasma.
function makeBoltPath(x1, y1, x2, y2, segments = 6, jitter = 22) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  // Perpendicular unit vector for jitter direction.
  const len = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / len;
  const ny = dx / len;
  let d = `M ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  for (let i = 1; i < segments; i += 1) {
    const t = i / segments;
    const bx = x1 + dx * t;
    const by = y1 + dy * t;
    const off = (Math.random() * 2 - 1) * jitter;
    d += ` L ${(bx + nx * off).toFixed(1)} ${(by + ny * off).toFixed(1)}`;
  }
  d += ` L ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  return d;
}

// Short branching arc that spurs off a bolt midpoint — used for the
// brighter "zap" flash so it feels forked, not just a squiggle.
function makeBranchPath(x1, y1, x2, y2, jitter = 30) {
  const midT = 0.45 + Math.random() * 0.15;
  const mx = x1 + (x2 - x1) * midT;
  const my = y1 + (y2 - y1) * midT;
  const branchLen = 60 + Math.random() * 40;
  const angle = Math.atan2(y2 - y1, x2 - x1) + (Math.random() * 1.4 - 0.7);
  const ex = mx + Math.cos(angle) * branchLen;
  const ey = my + Math.sin(angle) * branchLen;
  return makeBoltPath(mx, my, ex, ey, 4, jitter);
}

export default function LightningStage({
  stageRef,
  sourceRef,
  charRefsRef,        // ref-of-ref-map: { current: Map<id, ref> }
  activeIds,          // array of currently-dancing char ids
  zappingId,          // id of char currently getting hit by a fresh bolt
  charColors,         // { id: hexColor }
  beatSubscribe,      // optional: subscribe(({pulse}) => void) — throbs bolts on beat
  measureEpoch,       // arbitrary number — bump to force endpoint re-measure (drag/scale)
}) {
  // Endpoints in stage-local coords. Recomputed on layout changes.
  const [endpoints, setEndpoints] = useState({ source: null, targets: {} });
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  // Path cache — we re-roll paths on a timer so bolts crackle. Kept in
  // state (not ref) so React repaints the SVG each roll.
  const [paths, setPaths] = useState({});

  // -- measurement pass --
  const measure = () => {
    const stage = stageRef.current;
    const src = sourceRef.current;
    if (!stage || !src) return;
    const stageBox = stage.getBoundingClientRect();
    const srcBox = src.getBoundingClientRect();
    const source = {
      // Small -3 % nudge left — the machine sprite's visual dome/vent
      // isn't exactly centered inside its clickable bounding box.
      // Landed on 0.47 as the sweet spot between our earlier 0.5
      // (very-first, felt right of dome) and 0.44 (over-corrected left).
      x: srcBox.left - stageBox.left + srcBox.width * 0.47,
      // Time Machine "mouth" — the top-center of the machine sprite is
      // where the bolts emerge. Tuned to line up with the machine's
      // visible dome cap.
      y: srcBox.top - stageBox.top + srcBox.height * 0.18,
    };
    const targets = {};
    const map = charRefsRef.current;
    activeIds.forEach((id) => {
      const node = map && map.get(id) && map.get(id).current;
      if (!node) return;
      const b = node.getBoundingClientRect();
      targets[id] = {
        x: b.left - stageBox.left + b.width / 2,
        // Aim for the character's chest, not head — reads more like the
        // bolt is powering them.
        y: b.top - stageBox.top + b.height * 0.55,
      };
    });
    setStageSize({ w: stageBox.width, h: stageBox.height });
    setEndpoints({ source, targets });
  };

  useEffect(() => {
    measure();
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    window.addEventListener('resize', onResize);
    // Also re-measure a couple beats after layout changes, so springy
    // motion-layout settling doesn't leave bolts anchored to old spots.
    const t1 = setTimeout(measure, 120);
    const t2 = setTimeout(measure, 420);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      clearTimeout(t1); clearTimeout(t2);
    };
  }, [activeIds.join('|'), measureEpoch]);

  // -- crackle: re-roll every path every ~130 ms --
  useEffect(() => {
    const roll = () => {
      const { source, targets } = endpoints;
      if (!source) { setPaths({}); return; }
      const next = {};
      Object.entries(targets).forEach(([id, t]) => {
        const isZap = id === zappingId;
        next[id] = {
          main: makeBoltPath(source.x, source.y, t.x, t.y, isZap ? 8 : 6, isZap ? 32 : 16),
          branch: isZap
            ? makeBranchPath(source.x, source.y, t.x, t.y, 26)
            : null,
          isZap,
        };
      });
      setPaths(next);
    };
    roll();
    const id = setInterval(roll, 130);
    return () => clearInterval(id);
  }, [endpoints, zappingId]);

  const filterId = useMemo(() => `lightning-glow-${Math.random().toString(36).slice(2, 8)}`, []);

  // Rhythm-lock: subscribe to beat pulse and imperatively update SVG
  // group opacity so bolts crackle brightly on the downbeat and fade
  // to a faint plasma trail between beats. Ref-driven so we don't
  // rerender the entire SVG at 60fps. Before audio starts (beat === -1)
  // we hold the group at a steady medium brightness so kids can still
  // see the bolts on their first tap-then-audio-loads moment.
  const gGroupRef = useRef(null);
  useEffect(() => {
    if (!beatSubscribe) return undefined;
    return beatSubscribe(({ pulse, beat }) => {
      const g = gGroupRef.current;
      if (!g) return;
      let op;
      if (beat < 0) {
        // Audio not playing yet — steady, clearly visible.
        op = 0.80;
      } else {
        // Between beats: opacity ~0.30 (faint plasma trail).
        // On downbeat: opacity ~1.0 (bright Tesla-coil crackle).
        op = 0.30 + pulse * 0.70;
      }
      g.setAttribute('opacity', op.toFixed(3));
    });
  }, [beatSubscribe]);

  if (!endpoints.source || stageSize.w === 0) return null;

  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 4, width: '100%', height: '100%' }}
      viewBox={`0 0 ${stageSize.w} ${stageSize.h}`}
      preserveAspectRatio="none"
    >
      <defs>
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g ref={gGroupRef} opacity="1">
      {Object.entries(paths).map(([id, p]) => {
        const color = (charColors && charColors[id]) || '#FFDC78';
        return (
          <g key={id} filter={`url(#${filterId})`}>
            {/* Outer wide glow */}
            <path
              d={p.main}
              stroke={color}
              strokeOpacity={p.isZap ? 0.55 : 0.32}
              strokeWidth={p.isZap ? 18 : 10}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Bright inner core */}
            <path
              d={p.main}
              stroke="#FFFDF0"
              strokeOpacity={p.isZap ? 1 : 0.85}
              strokeWidth={p.isZap ? 4 : 2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {p.branch && (
              <>
                <path
                  d={p.branch}
                  stroke={color}
                  strokeOpacity={0.55}
                  strokeWidth={10}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={p.branch}
                  stroke="#FFFDF0"
                  strokeOpacity={0.9}
                  strokeWidth={3}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}
          </g>
        );
      })}
      </g>
    </svg>
  );
}
