"""
Regenerate 5 Beat Lab background concepts using the JMA cartoon art
style — bold saturated flat colors, hand-drawn wobbly black outlines,
zero gradients, minimal / no shading.

References passed to Nano Banana: clubhouse.png + circus.png + beach.png
(three canonical JMA scenes covering interior, saturated fantasy, and
exterior compositions).
"""

import asyncio
import base64
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

load_dotenv("/app/backend/.env")

API_KEY = os.getenv("EMERGENT_LLM_KEY")
if not API_KEY:
    print("Missing EMERGENT_LLM_KEY in /app/backend/.env")
    sys.exit(1)

OUT_DIR = Path("/app/frontend/public/assets/backgrounds/concepts")
OUT_DIR.mkdir(parents=True, exist_ok=True)

STYLE_REFS = [
    "/app/frontend/public/assets/backgrounds/clubhouse.png",
    "/app/frontend/public/assets/backgrounds/circus.png",
    "/app/frontend/public/assets/backgrounds/beach.png",
]

def encode(p):
    with open(p, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

REF_B64 = [encode(p) for p in STYLE_REFS]

STYLE_PROMPT = (
    "Match the exact cartoon art style of the reference images: bold "
    "saturated flat colors, hand-drawn wobbly THICK black outlines with "
    "irregular line-weight, zero gradients, zero photorealism, minimal "
    "or no shading, cartoon proportions, silly playful shapes. "
    "16:9 widescreen landscape background for a kids music app game "
    "screen. IMPORTANT: leave the CENTER of the image mostly empty and "
    "calm (a big neutral zone) so a busy drum-sequencer UI can overlay "
    "on top without visual clash. Push all subject matter to the edges "
    "or the very bottom of the frame."
)

CONCEPTS = [
    (
        "a_brick_tag",
        "An urban brick wall filling the whole frame. In the UPPER-LEFT "
        "corner (not centered) there is a stylized cartoon graffiti tag "
        "reading 'BEAT LAB' in chunky bubble letters with thick black "
        "outlines, colored bright teal and yellow. Bricks are saturated "
        "red-orange with cream mortar. No characters. No other tags. "
        "The center and right side of the wall are plain, empty brick."
    ),
    (
        "b_subway_tile",
        "A saturated cartoon white subway tile wall as a wide backdrop. "
        "Tiles are bright cream with thick wobbly black grout lines. In "
        "the TOP-LEFT corner, a small stenciled 'JMA' logo in charcoal "
        "grey. Two tiny cartoon paint drip streaks (one hot pink, one "
        "cyan) near the top corners only. Rest of the wall is calm and "
        "empty."
    ),
    (
        "c_alley_night",
        "A wide cartoon alley scene at night. Two saturated dark-purple "
        "buildings frame the left and right sides of the frame. On each "
        "side wall there is a small cartoon graffiti splat (hot pink on "
        "left, lime green on right). A saturated warm yellow streetlight "
        "hangs at the top and casts a soft yellow-orange cone of light "
        "down onto the ground in the center. The ground is warm cream. "
        "The center of the frame is a big calm lit ground area with "
        "nothing on it. No characters."
    ),
    (
        "d_boombox_stoop",
        "A wide cartoon backdrop. Anchored at the BOTTOM of the frame "
        "is a big oversized old-school cartoon boom box, only the top "
        "half visible, twin large round cassette speakers on the left "
        "and right edges. Saturated colors: silver-grey boom box with "
        "black speaker cones, chunky buttons in red / yellow / blue. "
        "The upper two-thirds of the image is a flat solid saturated "
        "wall color (cartoon dusty peach). Hand-drawn wobbly outlines. "
        "No characters. Center-upper zone is completely empty."
    ),
    (
        "e_vinyl_wall",
        "A wide cartoon wall backdrop. On the LEFT edge of the frame, a "
        "large cartoon vinyl record hangs on the wall (charcoal grey "
        "with thick concentric black rings and a bright red center "
        "label reading 'JMA'). On the RIGHT edge, a stack of two "
        "cartoon vinyl record sleeves in bright yellow and hot pink. "
        "The rest of the wall is a flat solid cartoon teal color, "
        "completely empty across the entire center of the frame. "
        "Hand-drawn wobbly outlines. No characters."
    ),
]


async def gen_one(name: str, prompt: str):
    full = f"{STYLE_PROMPT}\n\nSCENE: {prompt}"
    chat = (
        LlmChat(
            api_key=API_KEY,
            session_id=f"beatlab-v2-{name}",
            system_message="You are a cartoon background illustrator.",
        )
        .with_model("gemini", "gemini-3.1-flash-image-preview")
        .with_params(modalities=["image", "text"])
    )
    msg = UserMessage(
        text=full,
        file_contents=[ImageContent(b) for b in REF_B64],
    )
    try:
        _t, images = await chat.send_message_multimodal_response(msg)
    except Exception as e:
        print(f"[{name}] ERROR: {e}")
        return False
    if not images:
        print(f"[{name}] no image returned")
        return False
    out = OUT_DIR / f"{name}.png"
    out.write_bytes(base64.b64decode(images[0]["data"]))
    print(f"[{name}] saved -> {out}")
    return True


async def main():
    results = await asyncio.gather(*(gen_one(n, p) for n, p in CONCEPTS))
    print(f"\nDone. {sum(1 for r in results if r)}/{len(CONCEPTS)} succeeded.")


if __name__ == "__main__":
    asyncio.run(main())
