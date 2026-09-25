"""
Two-layer split of Mikey's JMAtv logo.
- Corner flood-fill removes the outer white background (already done in
  the v2 asset, we redo it here so this script is self-contained).
- Each remaining connected white region is classified by sampling the
  colors of the pixels immediately OUTSIDE its boundary:
    * majority BLACK neighbors  → letter interior (kept in "letters" PNG)
    * majority YELLOW neighbors → harp interior (fully transparent)
- Output:
    /app/frontend/public/assets/ui/jmatv-logo-v2-frame.png
      → everything EXCEPT letter fills (harp yellow, TV blue, outlines);
        white letter interiors and harp inner whites are transparent.
    /app/frontend/public/assets/ui/jmatv-logo-v2-letters.png
      → ONLY letter interiors (opaque white); everything else transparent.
        Used as a CSS mask so we can color-cycle the letters independently.
"""
from PIL import Image
from collections import deque
import sys

src = Image.open('/tmp/logo/jmatv_raw.png').convert('RGBA')
w, h = src.size
px = src.load()

def is_white(c):
    return c[0] > 235 and c[1] > 235 and c[2] > 235 and c[3] > 128

def is_black(c):
    return c[0] < 60 and c[1] < 60 and c[2] < 60 and c[3] > 128

def is_yellow(c):
    return c[0] > 200 and c[1] > 180 and c[2] < 90 and c[3] > 128

# --- Step 1: knock out corner-connected white (outer background) ---
outer = [[False] * h for _ in range(w)]
q = deque()
for cx, cy in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
    if is_white(px[cx, cy]):
        q.append((cx, cy)); outer[cx][cy] = True
while q:
    x, y = q.popleft()
    for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
        nx, ny = x + dx, y + dy
        if 0 <= nx < w and 0 <= ny < h and not outer[nx][ny] and is_white(px[nx, ny]):
            outer[nx][ny] = True; q.append((nx, ny))

# --- Step 2: find connected components of the remaining white regions ---
region_id = [[-1] * h for _ in range(w)]
regions = []  # list of (list_of_pixels, {'black': int, 'yellow': int, 'other': int})
for sx in range(w):
    for sy in range(h):
        if region_id[sx][sy] != -1 or outer[sx][sy] or not is_white(px[sx, sy]):
            continue
        rid = len(regions)
        pixels = []
        neighbors = {'black': 0, 'yellow': 0, 'other': 0}
        q = deque([(sx, sy)]); region_id[sx][sy] = rid
        while q:
            x, y = q.popleft()
            pixels.append((x, y))
            for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                nx, ny = x + dx, y + dy
                if not (0 <= nx < w and 0 <= ny < h): continue
                if region_id[nx][ny] != -1: continue
                nc = px[nx, ny]
                if is_white(nc) and not outer[nx][ny]:
                    region_id[nx][ny] = rid; q.append((nx, ny))
                else:
                    if is_black(nc): neighbors['black'] += 1
                    elif is_yellow(nc): neighbors['yellow'] += 1
                    else: neighbors['other'] += 1
        regions.append((pixels, neighbors))

# --- Step 3: classify each region ---
# Simplest reliable heuristic: the JMA letter fills are dramatically
# larger than any harp-interior opening. Region sizes on this logo:
#   M ≈ 82,000 px, A ≈ 60,000 px, J ≈ 39,000 px, next ≈ 11,000 px.
# Keep the top-N largest regions as letters; everything else is harp
# interior and gets knocked out.
LETTER_COUNT = 3
sizes = sorted(((i, len(pixels)) for i, (pixels, _) in enumerate(regions)),
               key=lambda t: -t[1])
letter_region_ids = {i for i, _ in sizes[:LETTER_COUNT]}
for idx, sz in sizes:
    tag = 'LETTER' if idx in letter_region_ids else 'harp'
    print(f'  region {idx:2d}: {sz:6d} px  → {tag}')

# --- Step 4: emit the two output images ---
frame = Image.new('RGBA', (w, h), (0, 0, 0, 0))
letters = Image.new('RGBA', (w, h), (0, 0, 0, 0))
fp = frame.load()
lp = letters.load()
for x in range(w):
    for y in range(h):
        c = px[x, y]
        if outer[x][y]:
            continue
        rid = region_id[x][y]
        if rid != -1:
            # white pixel classified as letter or harp
            if rid in letter_region_ids:
                lp[x, y] = (255, 255, 255, 255)
            # harp-inner whites stay fully transparent in both images
        else:
            fp[x, y] = c  # non-white content — everything visible except letter fills

# --- Step 5: feather one-pixel white halo around letters/harp boundaries ---
# For pixels flagged as outer OR in a harp region, if a neighboring frame
# pixel is nearly white, drop its alpha so we don't get a jaggy fringe.
def near_white(c):
    return c[3] > 0 and c[0] > 220 and c[1] > 220 and c[2] > 220
for x in range(w):
    for y in range(h):
        c = fp[x, y]
        if not near_white(c):
            continue
        # If any 4-neighbor is transparent, drop this pixel
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and fp[nx, ny][3] == 0 and (region_id[nx][ny] == -1 or region_id[nx][ny] not in letter_region_ids):
                fp[x, y] = (0, 0, 0, 0); break

frame.save('/app/frontend/public/assets/ui/jmatv-logo-v2-frame.png', optimize=True)
letters.save('/app/frontend/public/assets/ui/jmatv-logo-v2-letters.png', optimize=True)

# Also emit a composited "clean" version = frame ∪ letters. This
# replaces the earlier jmatv-logo-v2.png so anywhere the logo is used
# without color cycling still gets the harp-interior whites knocked out.
composite = Image.alpha_composite(frame, letters)
composite.save('/app/frontend/public/assets/ui/jmatv-logo-v2.png', optimize=True)
print('frame:', frame.size, '| letter regions kept:', len(letter_region_ids), '/', len(regions))
