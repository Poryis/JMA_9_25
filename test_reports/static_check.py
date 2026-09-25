#!/usr/bin/env python3
"""Static analysis for JMA sticker/achievement/rank/song review.

Checks:
 1. Every song id in songs.js has a corresponding sticker `song_${id}` in stickers.js
 2. Every earnSticker('...') call site references a sticker id that EXISTS
    in STICKERS (COLLECTION + ACHIEVEMENT)
 3. Every sticker `icon:` PNG path resolves to a real file under public/
 4. No user-facing display strings reference retired names
    ("Boom Garden", "Stew's Rhythm Academy", "Rhythm Academy")
    -- but ignore route paths, filenames, data-testids, comments
 5. Meta-progression standards sanity-check (structure of ranks/achievements)
"""
import os
import re
import json
import sys
from pathlib import Path

ROOT = Path('/app/frontend')
SRC = ROOT / 'src'
PUBLIC = ROOT / 'public'

report = {
    "song_sticker_check": {},
    "earnSticker_call_sites": {},
    "png_resolution": {},
    "rename_artifacts": [],
    "meta_progression": {},
    "errors": [],
    "warnings": [],
}


def read(p):
    return Path(p).read_text(encoding='utf-8')


# ---------------- 1. Songs -> stickers ----------------
songs_text = read(SRC / 'data' / 'songs.js')
# Only match top-level SONG_LIBRARY entries (id: 'xxx' after opening bracket)
song_ids = re.findall(r"^\s*id:\s*'([^']+)'", songs_text, re.MULTILINE)
song_ids = list(dict.fromkeys(song_ids))  # dedupe

stickers_text = read(SRC / 'data' / 'stickers.js')
# Sticker ids defined in COLLECTION_STICKERS - grab all `{ id: 'xxx'` in the file
collection_ids = re.findall(r"\{\s*id:\s*'([^']+)'", stickers_text)

ach_text = read(SRC / 'data' / 'achievements.js')
achievement_ids = re.findall(r"\{\s*id:\s*'(ach_[^']+)'", ach_text)

all_sticker_ids = set(collection_ids) | set(achievement_ids)

missing_song_stickers = []
for sid in song_ids:
    expected = f"song_{sid}"
    if expected not in all_sticker_ids:
        missing_song_stickers.append({"song_id": sid, "expected_sticker": expected})

# Also flag "song_*" stickers that don't map to any song
dead_song_stickers = []
song_stickers = [c for c in collection_ids if c.startswith('song_')]
for ss in song_stickers:
    corresponding = ss[len('song_'):]
    if corresponding not in song_ids:
        dead_song_stickers.append({"sticker_id": ss, "expected_song_id": corresponding})

report["song_sticker_check"] = {
    "total_songs": len(song_ids),
    "total_song_stickers": len(song_stickers),
    "missing_stickers_for_songs": missing_song_stickers,
    "dead_song_stickers_no_matching_song": dead_song_stickers,
}


# ---------------- 2. earnSticker call sites ----------------
call_sites = []
dead_calls = []
for path in SRC.rglob('*.js'):
    text = path.read_text(encoding='utf-8')
    for m in re.finditer(r"earnSticker\(\s*['\"]([^'\"]+)['\"]", text):
        sid = m.group(1)
        line = text[:m.start()].count('\n') + 1
        call_sites.append({"file": str(path.relative_to(ROOT)), "line": line, "id": sid})
        if sid not in all_sticker_ids:
            dead_calls.append({"file": str(path.relative_to(ROOT)), "line": line, "id": sid})

# Also check dynamic template literals like earnSticker(`song_${x}`)
tmpl_calls = []
for path in SRC.rglob('*.js'):
    text = path.read_text(encoding='utf-8')
    for m in re.finditer(r"earnSticker\(\s*`([^`]+)`", text):
        line = text[:m.start()].count('\n') + 1
        tmpl_calls.append({"file": str(path.relative_to(ROOT)), "line": line, "template": m.group(1)})

report["earnSticker_call_sites"] = {
    "total_static_calls": len(call_sites),
    "total_template_calls": len(tmpl_calls),
    "dead_calls_no_matching_sticker": dead_calls,
    "template_calls_needs_manual_review": tmpl_calls,
}


# ---------------- 3. PNG path resolution ----------------
icon_paths = set()
for src_file in [SRC / 'data' / 'stickers.js', SRC / 'data' / 'achievements.js',
                 SRC / 'data' / 'ranks.js']:
    text = read(src_file)
    for m in re.finditer(r"icon:\s*'([^']+)'", text):
        icon_paths.add((str(src_file.relative_to(ROOT)), m.group(1)))

broken = []
for source, ip in sorted(icon_paths):
    # Icons are relative to /public
    p = PUBLIC / ip
    if not p.exists():
        broken.append({"source": source, "path": ip, "resolved": str(p)})

report["png_resolution"] = {
    "total_icon_paths": len(icon_paths),
    "broken": broken,
}


# ---------------- 4. Rename artifacts (user-facing display strings) ----------------
# Search all .js/.jsx files for retired names in *string literals*
retired = [
    ("Boom Garden", r"Boom Garden"),
    ("Stew's Rhythm Academy", r"Stew['\u2019]s Rhythm Academy"),
    ("Rhythm Academy", r"\bRhythm Academy\b"),
]
hits = []
for path in list(SRC.rglob('*.js')) + list(SRC.rglob('*.jsx')):
    rel = str(path.relative_to(ROOT))
    lines = path.read_text(encoding='utf-8').splitlines()
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        # Skip pure comment lines
        if stripped.startswith('//') or stripped.startswith('*'):
            continue
        for name, pat in retired:
            if re.search(pat, line):
                # Skip route paths (leading '/' + kebab-case) and filenames
                # We just record it; classification is manual per-hit
                # Skip if match is inside a route like '/boom-garden' or a comment portion
                # Also skip if line contains only the pattern within a comment block
                # Do coarse check: if line contains "//" before the match, skip
                idx = line.find('//')
                m2 = re.search(pat, line)
                if idx != -1 and m2 and m2.start() > idx:
                    continue
                hits.append({"file": rel, "line": i, "name": name, "text": stripped[:200]})

report["rename_artifacts"] = hits


# ---------------- 5. Meta-progression sanity ----------------
# Check useRank.js only uses ACHIEVEMENT stickers for rank derivation
useRank = read(SRC / 'hooks' / 'useRank.js')
uses_ach_only = 'ALL_ACHIEVEMENT_IDS' in useRank and 'getCurrentRank(achievementSet)' in useRank

# Check ranks.js has maestro requiring 3 domains at master
ranks_text = read(SRC / 'data' / 'ranks.js')
maestro_ok = bool(re.search(r"id:\s*'maestro'[\s\S]{0,500}count:\s*3", ranks_text)) and \
             bool(re.search(r"maestro[\s\S]{0,500}tier:\s*'master'", ranks_text))

# Check earnAchievementUpTo helper
stickers_hook = read(SRC / 'hooks' / 'useStickers.js')
ladder_ok = 'earnAchievementUpTo' in stickers_hook and re.search(
    r"const order = \['cadet', 'pro', 'master'\]", stickers_hook) is not None
prereq_ok = "if (!earned[prereqId]) return false" in stickers_hook

report["meta_progression"] = {
    "useRank_uses_achievements_only": uses_ach_only,
    "maestro_requires_3_domains_master": maestro_ok,
    "earnAchievementUpTo_enforces_ladder": bool(ladder_ok),
    "earnAchievement_enforces_prereq": prereq_ok,
}


# ---------------- Summary ----------------
issues = 0
issues += len(missing_song_stickers)
issues += len(dead_song_stickers)
issues += len(dead_calls)
issues += len(broken)
issues += len(hits)
if not uses_ach_only: issues += 1
if not maestro_ok: issues += 1
if not ladder_ok: issues += 1
if not prereq_ok: issues += 1

report["total_issues"] = issues

print(json.dumps(report, indent=2))
sys.exit(0 if issues == 0 else 1)
