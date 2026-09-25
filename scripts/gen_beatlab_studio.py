"""
Generate 3 Beat-Lab-specific studio backdrops that mirror the exact
composition of /assets/backgrounds/recording-studio.jpg (framed monitor
screen in the middle, horizon floor, big console anchored at the
bottom), but swap the bottom console for beat-maker / DJ gear so the
scene reads uniquely as Beat Lab.
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

# Primary composition ref: the existing recording studio (defines the
# framed-monitor + floor + bottom-console layout we want to preserve).
# Secondary style refs to reinforce the JMA cartoon look.
STYLE_REFS = [
    "/app/frontend/public/assets/backgrounds/recording-studio.jpg",
    "/app/frontend/public/assets/backgrounds/clubhouse.png",
    "/app/frontend/public/assets/backgrounds/circus.png",
]


def encode(p):
    with open(p, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


REF_B64 = [encode(p) for p in STYLE_REFS]

BASE_PROMPT = (
    "Match the exact composition and cartoon art style of the FIRST "
    "reference image (a recording studio with a big framed monitor "
    "screen in the center, a green floor horizon, and a big brown "
    "console anchored at the bottom, with grey speakers mounted high "
    "on the red wall left and right). Same 16:9 widescreen framing. "
    "Same bold saturated flat colors, same hand-drawn wobbly thick "
    "black outlines, zero gradients, no shading, low detail. Preserve "
    "the huge empty pink-tinted monitor screen in the center exactly "
    "as-is (the game UI will live inside it). Preserve the green floor "
    "strip along the bottom. ONLY change what the CONSOLE at the "
    "bottom is — swap it for the equipment described below. Do NOT "
    "add any text or logo on the equipment. No characters."
)

CONCEPTS = [
    (
        "beatlab_v1_drum_machine",
        "The bottom console is a big chunky cartoon drum machine / MPC "
        "sampler: a wide grey slab with a 4x4 grid of colorful chunky "
        "square drum pads (red / yellow / blue / green), plus a couple "
        "of round knobs and a small LCD strip. Anchored at the bottom "
        "of the frame just like the mixing console in the reference."
    ),
    (
        "beatlab_v2_dj_turntables",
        "The bottom console is a big cartoon DJ setup: twin large "
        "vinyl turntables on the left and right sides of a central "
        "mixer with colorful sliders and knobs. Bright red vinyl "
        "records on each turntable. Anchored at the bottom of the "
        "frame just like the mixing console in the reference."
    ),
    (
        "beatlab_v3_step_sequencer",
        "The bottom console is a big cartoon hardware step-sequencer "
        "groove box: a wide grey slab with a long row of small "
        "colorful step buttons (16 of them in bright red / yellow / "
        "blue / green), a few big round knobs on the right side, and "
        "chunky play / stop transport buttons on the left. Anchored at "
        "the bottom of the frame just like the mixing console in the "
        "reference."
    ),
]


async def gen_one(name: str, prompt: str):
    full = f"{BASE_PROMPT}\n\nBOTTOM CONSOLE: {prompt}"
    chat = (
        LlmChat(
            api_key=API_KEY,
            session_id=f"beatlab-studio-{name}",
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
