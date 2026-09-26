# V2.1 — Enrichment, Theme & Look-and-Feel Plan

Status: PLANNING — no detail changes until approved.
Scope: everything the 3D integration (c208e72) touched, everything it broke,
and everything the theme needs inside the scene.

---

## 1 · Interaction repairs (P0 — broken by the 3D integration)

Root cause: `.room-3d { pointer-events: none }` swept wider than intended. Every
interactive element that lives inside the `.room` tree went dead in 3D mode.

| Element | State now | Fix | File |
|---|---|---|---|
| Field guide (furled scroll + unrolled overlay) | **dead** | `.legend-anchor { pointer-events: auto }` (overlay itself is a fixed sibling — inherits nothing) | `globals.css` |
| Librarian panel (input, chips, close) | **dead** | `.librarian-panel { pointer-events: auto }` | `globals.css` |
| Reading-list tray + enquiry | works (outside `.room`) | regression-check only | — |
| Sound toggle (both footers) | works (`.room-foot` re-enabled) | regression-check | — |
| Lens bar, search | works (`.room-topbar` re-enabled) | regression-check | — |
| Canvas volume hover/click | works (room is click-through) | keep | — |

Acceptance: an enumerated click-through of every interactive element on tier-3 and
tier-1, plus keyboard (Tab order over the re-enabled elements, `/`, `L`, `Esc`).

## 2 · Scene composition — "it doesn't feel 3D" (P0)

Why it reads flat today: the camera is too close (books fill the frame edge to edge),
everything faces the camera head-on in one row, and there is no room around the
subject — no wall context, no floor, no second plane of depth. A perspective camera
pointed at a flat row = a picture of cards.

Changes:
1. **Camera pulls back** (z ≈ 14–15, eye level 1.6, keep FOV 30) so the full wall,
   headroom above and the plank's shadowed underside are in frame.
2. **Two tiers** instead of one crowded row: volumes distributed 3 + 3 on two
   floating planks (the spec's wall-of-shelves, adapted to the collection size),
   each plank with its own LED strip and light pool. Slot logic gains a row axis.
3. **Room architecture**: faint floor line, ceiling gradient, two vertical shadow
   seams on the back wall — the eye needs surfaces to read space.
4. **Seeded imperfection**: per-volume ±0.5° yaw jitter and ±1.5% height (seeded by
   slug, already have the PRNG) so the row stops looking machine-stamped.
5. **Volume depth**: page block inset from the cover board, cover thickness visible
   at the spine edge, foil bands as actual metalness so they catch the lamp.

Files: `components/scene/ArchiveCanvas.tsx` (camera, room, planks, slots),
`lib/spine-texture.ts` (see §3).

## 3 · Spine typography — "the writing gurgles" (P0)

Root causes: the texture (256×1024, aspect 1:4) is stretched onto planes of aspect
≈1:3 → horizontal distortion; the codename is placed char-by-char with a fixed
62px advance → uneven rhythm; glyph strokes were mis-scaled (fixed already).

Changes:
1. Texture dimensions derived from the plane aspect (e.g. 341×1024) — no stretch.
2. Codename drawn as one rotated `fillText` with `ctx.letterSpacing = '0.24em'`
   (Chromium/Edge), falling back to measured `measureText` advances elsewhere.
3. Glyphs sized in a fixed 40px box on the vertical rhythm, stroke = 1.5 at texture
   scale.
4. Regenerate textures once fonts are ready (already the case) and invalidate the
   cache on any metadata change (already keyed).

Files: `lib/spine-texture.ts`.

## 4 · Hover language — theme mismatch (P0)

Why it's off: the hover tooltip is a drei `<Html>` paper chip floating over the
canvas — it looks like a browser tooltip, not like the Archive.

Changes:
1. **Remove** the `<Html>` ribbon from the canvas.
2. **DOM hover caption** instead: a single bar at the bottom of the room (mono,
   `--paper-2` on `--ink`, matching the shelf ribbon) that shows
   `CODENAME — hook` for the hovered volume. The store already carries
   `hovered`; the bar is plain DOM, themed, and keyboard/screen-reader safe.
3. **3D affordances** carry the rest: hovered volume slides out and tilts, the LED
   under its slot brightens (per-slot emissive intensity), and a ribbon bookmark
   plane drops from the plank onto the hovered volume.
4. Cursor: pointer + the reading-lamp spotlight already follow the pointer.

Files: `components/scene/ArchiveCanvas.tsx`, `components/shelf/ShelfWall.tsx`
(caption bar), `globals.css`.

## 5 · The furled scroll's place in the room (P1)

Today the image overlaps BatchProof. With the two-tier composition it gets a
dedicated spot: leaning at the right end of the lower plank, scaled ~170px, tag
below on the plank. Anchor CSS only.

## 6 · Reader scrub tune (P1)

Scrub turning works; tuning pass: scrub gain (ΔY÷900 → target: full turn in ~2.5
wheel-notches), commit threshold stays 0.45, tangle coupling already live. Verify
`prefers-reduced-motion` still gets discrete 280ms crossfades.

## 7 · Sound mix pass (P1)

Cues are wired; the pass is about mix + correctness: per-cue gain audit against the
spec's −18 dBFS guidance, room tone at −30 dBFS, open-cue per object type
(binder clicks vs dossier crack vs notebook snap — currently one generic cue),
lights-on only at the gate. Files: `lib/sound.ts`, hooks in
`ArchiveCanvas`/`Reader`/`ShelfWall`.

## 8 · Theme token pass over the scene (P1)

§04 tokens into 3D materials — nothing outside the palette: `--lamp` only for the
LED/lamp/spot, one accent per volume, `--void`/`--shelf` for the room, paper tones
only for spine text and the handoff sheet. No accent mixing within a volume.

## 9 · Librarian on DeepSeek (P2 — blocked on the key)

Wiring is done (`DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL=deepseek-v4.1-flash`,
`DEEPSEEK_BASE_URL`, `LIBRARIAN_PROVIDER`). Remaining: live test with the key,
temperature/prompt tuning, one retry on transient failure. Key lives in
`.env.local` locally / the droplet env in prod — never in the repo.

## 10 · Deferred beyond v2.1 (unchanged)

Real analytics sink, enquiry webhook/email, Restricted Section (partner tier),
volumes 7+, per-object-type opening mechanics (binder rings, wax seal, slipcase),
Howler + real audio assets, panning wall at 14+ volumes.

---

## Execution order

1. §1 interaction repairs (small, unblocks everything)
2. §2 + §3 together (composition + typography — one verification pass)
3. §4 + §5 (hover language + scroll placement)
4. §6 + §7 + §8 (tuning passes)
5. §9 with the key

Each step ends on the `v2` branch with a browser walk-through against the
acceptance line above; merge to `main` only after §1–§4 pass together.

## Regression checklist (run after every step)

- Field guide opens/closes; librarian accepts input and chips navigate
- Tray add/remove/enquire; sound toggle in both footers; room tone starts/stops
- Lens re-slotting animates; search dims non-matches; Enter opens top match
- Opening shot → reader → back; deep link `#chapter`; `?flat=1` DOM shelf
- Scrub turn + snap; keys/buttons full turn; tangle scrub on the problem chapter
- Gate: per-tab session, error/lockout states untouched
