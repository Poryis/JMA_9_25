"""
Regenerate the Beat Lab studio backdrop based on the V3 STEP SEQUENCER
concept. Palette: teal wall + navy floor + cream screen tint. Console
is drawn as an EMPTY grey slab with no visible step buttons — we'll
overlay 16 animated DOM step buttons on top that light up in sync
with `currentStep`. No microphone. No drum machine pads.
"""
import asyncio, base64, os, sys
from pathlib import Path
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

load_dotenv("/app/backend/.env")
API_KEY = os.getenv("EMERGENT_LLM_KEY")
OUT_DIR = Path("/app/frontend/public/assets/backgrounds/concepts")
OUT_DIR.mkdir(parents=True, exist_ok=True)

REFS = [
    "/app/frontend/public/assets/backgrounds/concepts/beatlab_v3_step_sequencer.png",
    "/app/frontend/public/assets/backgrounds/clubhouse.png",
]
REF_B64 = [base64.b64encode(open(p, 'rb').read()).decode('utf-8') for p in REFS]

PROMPT = (
    "Match the exact composition and cartoon art style of the FIRST "
    "reference image (a music studio with a big framed monitor screen "
    "in the center, twin small grey speakers mounted high on the wall, "
    "a horizon floor strip along the bottom, and a wide step-sequencer "
    "console anchored across the bottom). Same 16:9 widescreen framing. "
    "Bold saturated flat cartoon colors, hand-drawn wobbly THICK black "
    "outlines, zero gradients, no shading, low detail.\n\n"
    "CHANGES vs the reference:\n"
    "1) WALL color: rich saturated TEAL (roughly #22A6A0).\n"
    "2) FLOOR strip: deep NAVY blue (roughly #1E3A5F).\n"
    "3) MONITOR SCREEN tint: warm CREAM / beige (roughly #F1E6C8). "
    "Keep the two diagonal white glare streaks.\n"
    "4) The step-sequencer CONSOLE at the bottom is EMPTY — no step "
    "buttons drawn, no colored squares. Just a plain flat grey slab "
    "with thick black outlines. Keep the two chunky play/stop buttons "
    "on the LEFT and the round knobs on the RIGHT. The middle section "
    "of the console is completely empty grey with nothing on it "
    "(that's where we'll overlay our own animated buttons).\n"
    "5) Do NOT draw a hanging microphone. The monitor screen is fully "
    "empty inside.\n"
    "6) No characters, no text on any equipment, no other props."
)

async def gen(name, prompt):
    chat = (LlmChat(api_key=API_KEY, session_id=f"blab-final-{name}",
                    system_message="Cartoon studio illustrator.")
            .with_model("gemini", "gemini-3.1-flash-image-preview")
            .with_params(modalities=["image", "text"]))
    msg = UserMessage(text=prompt, file_contents=[ImageContent(b) for b in REF_B64])
    _t, imgs = await chat.send_message_multimodal_response(msg)
    if not imgs:
        print(f"[{name}] no image"); return
    (OUT_DIR / f"{name}.png").write_bytes(base64.b64decode(imgs[0]["data"]))
    print(f"[{name}] saved")

async def main():
    await gen("beatlab_final", PROMPT)

if __name__ == "__main__":
    asyncio.run(main())
