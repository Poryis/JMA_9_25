"""
Recolor the Beat Lab drum-machine studio backdrop so it's distinct from
the red/green recording-studio.jpg. Palette shift: teal wall + navy
floor + cream monitor screen. Drum pads on the console are drawn in
GREY so we can overlay 16 animated colored pads via DOM that light up
in sync with the sequencer beat. Also drop the dangling microphone.
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
OUT_DIR = Path("/app/frontend/public/assets/backgrounds/concepts")
OUT_DIR.mkdir(parents=True, exist_ok=True)

REFS = [
    "/app/frontend/public/assets/backgrounds/concepts/beatlab_v1_drum_machine.png",
    "/app/frontend/public/assets/backgrounds/clubhouse.png",
]


def enc(p):
    with open(p, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


REF_B64 = [enc(p) for p in REFS]

PROMPT = (
    "Match the exact composition and cartoon art style of the FIRST "
    "reference image (a music studio with a big framed monitor screen "
    "in the center, twin small grey speakers mounted high on the wall, "
    "a horizon floor, and a big drum-machine console anchored at the "
    "bottom with a 4x4 grid of drum pads and knobs). "
    "Same 16:9 widescreen framing, same bold saturated flat colors, "
    "same hand-drawn wobbly thick black outlines, zero gradients, no "
    "shading, low detail. "
    "\n\nCHANGES: "
    "\n1) Change the WALL color from red to a rich saturated cartoon "
    "TEAL (#22A6A0-ish). "
    "\n2) Change the FLOOR strip along the bottom from green to a deep "
    "cartoon NAVY blue (#1E3A5F-ish). "
    "\n3) Change the MONITOR SCREEN tint from pink to a warm calm "
    "CREAM / beige (#F1E6C8-ish) — still lighter than everything else "
    "so a game UI can sit on top and read easily. Keep the two diagonal "
    "white glare streaks on the screen. "
    "\n4) Draw all 16 DRUM PADS on the console as PLAIN GREY chunky "
    "squares with thick black outlines — do NOT color them red / "
    "yellow / blue / green. Just neutral grey squares in a 4x4 grid. "
    "\n5) Do NOT include any hanging microphone. The monitor screen is "
    "COMPLETELY EMPTY. "
    "\n6) No characters, no text, no logos."
)


async def gen(name, prompt):
    chat = (
        LlmChat(api_key=API_KEY, session_id=f"blab-recolor-{name}",
                system_message="Cartoon studio illustrator.")
        .with_model("gemini", "gemini-3.1-flash-image-preview")
        .with_params(modalities=["image", "text"])
    )
    msg = UserMessage(text=prompt, file_contents=[ImageContent(b) for b in REF_B64])
    _t, imgs = await chat.send_message_multimodal_response(msg)
    if not imgs:
        print(f"[{name}] no image")
        return
    out = OUT_DIR / f"{name}.png"
    out.write_bytes(base64.b64decode(imgs[0]["data"]))
    print(f"[{name}] saved -> {out}")


async def main():
    # 3 palette variants so user has choice
    await asyncio.gather(
        gen("beatlab_teal_navy", PROMPT),
        gen(
            "beatlab_purple_peach",
            PROMPT.replace("TEAL (#22A6A0-ish)", "deep PURPLE (#5B3F8E-ish)")
                  .replace("NAVY blue (#1E3A5F-ish)", "warm PEACH (#E8B490-ish)")
                  .replace("CREAM / beige (#F1E6C8-ish)", "PALE MINT (#D6EEDE-ish)")
        ),
        gen(
            "beatlab_orange_charcoal",
            PROMPT.replace("TEAL (#22A6A0-ish)", "warm burnt-ORANGE (#D9722E-ish)")
                  .replace("NAVY blue (#1E3A5F-ish)", "dark CHARCOAL grey (#2A2A2A-ish)")
                  .replace("CREAM / beige (#F1E6C8-ish)", "PALE BUTTER yellow (#F6E7A2-ish)")
        ),
    )


if __name__ == "__main__":
    asyncio.run(main())
