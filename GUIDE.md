# The Archive — feature walkthrough (v1.2)

The complete map of what the site shows, how every interaction behaves, and which
file owns which pixel. Use this as the review sheet: anything you want changed,
find it here → change the listed file → `npm run build`.

---

## 1 · The three scenes

| Scene | Route | Purpose |
|---|---|---|
| **The gate** | `/enter` | The only public page. Credential slot styled as an access-card slot in a cone of warm light. |
| **The shelf** | `/` | Browse all volumes. Every spine is a data visualisation of its project. |
| **The volume** | `/book/[slug]` | The reading experience: a two-page spread on a dark desk, chapter by chapter. |

A persistent **reading-list tray** and the **librarian** overlay ride on top of every scene.

---

## 2 · The gate (`app/enter/`)

- Idle: the beam "breathes" (6s cycle), dust motes drift through the light.
- Submitting: the Enter key depresses 1px, the beam flickers once.
- Wrong credentials: beam dims + double-flicker (320ms), panel shakes 6px (360ms),
  mono message `ACCESS NOT RECOGNISED` — never says which field was wrong.
- 5 failures / 15 min per IP+username: `TRY AGAIN LATER` (server-enforced, 429).
- Success (≈1.8s choreography): beam narrows to a line → panel drops into the slot →
  a light strip sweeps the room left→right → hand-off to the shelf.
- **Sessions are browser-session only** (v1.2): the cookie has no expiry, so closing
  the browser ends the session and the gate is shown again. The JWT itself lapses
  after 12h. On a fresh sign-in, visited bookmarks and the reading list are cleared —
  nothing carries over. *(Owns: `lib/session.ts`, `app/api/auth/route.ts`, `app/enter/EnterClient.tsx`.)*

---

## 3 · The shelf (`app/(archive)/page.tsx`, `components/shelf/ShelfWall.tsx`)

### What a spine encodes
| Spine feature | Meaning | Source field |
|---|---|---|
| Colour band (top) | Domain → accent token | `domain` |
| Glyph stack (≤3) | Techniques used | `techniques` |
| Thickness | Complexity 1–5 | `complexity` |
| Metallic foil bands | Headline impact tier 1–3 | `impactTier` |
| Silhouette | Object type: hardcover / binder / dossier (kraft + wax seal) / notebook (elastic) / boxed set (frosted, ×1.6 width) | `objectType` |
| Red dot | Work in progress | `status: "in-progress"` |
| Bookmark sticking out | You have read it; height = depth | localStorage (per session) |

The **"How to read the shelf"** card at the end of the tier repeats this legend.

### Interactions
- **Hover**: volume slides out, codename catches the foil sheen, a ribbon drops with
  the one-line hook (or "✓ In reading list").
- **Click / Enter**: the room leans toward you, then the volume opens (≈0.4s hand-off).
- **Idle nudge**: every ~9s an unread volume slides out and back, inviting a pick.
  (Off with reduced-motion.)
- **First lights-on of the session**: spines settle onto the shelf in order, staggered.
- **Lenses** (`Arrange by`): Industry · Capability · Impact · Newest. Re-ordering
  animates (FLIP); groups get metal **bookends** with mono labels. The lens persists
  in the URL (`/?lens=capability`).
- **Search** (top-centre, or press `/`): non-matches dim to 35% and desaturate; a
  mono counter reads "N volumes found"; **Enter** opens the top match.
- **Keyboard**: `←` `→` move focus along the tier · `Enter` opens · `/` search ·
  `L` librarian · `Esc` clears.
- **Reading-list tray** (bottom-right): mini spines + count; `+` from a volume adds;
  "Enquire about these" opens the checkout card with every collected volume pre-printed.
- **Ask the librarian** (bottom-centre bell, or `L`): describe a problem in plain
  English → recommends 2–3 volumes with reasons, as clickable chips. Without an
  `ANTHROPIC_API_KEY` it runs a grounded keyword matcher; set the key to enable the
  LLM version (`LIBRARIAN_LLM=off` to force off). 20 questions/hour cap.

---

## 4 · Inside a volume (`app/(archive)/book/[slug]/`, `components/reader/`, `components/book/`)

### Chrome
| Element | Where | Behaviour |
|---|---|---|
| Lamp progress bar | top edge | Fills with chapters read. |
| Scene counter | bottom-left | `02 / 07 · The approach`. |
| `← Shelf` | top-left | Returns to the shelf (state restored). |
| `EXEC | TECH` | top-right | Switches editions in place (480ms reflow); choice persists for the browser session. |
| `+` | top-right | Adds/removes the volume on the reading list. |
| Ribbon ToC | right edge | One ribbon per chapter; the active one is labelled; hover any ribbon for its name; click jumps. |
| Page edges | bottom-left | A physical progress bar; also exposed as `aria-valuenow`. |
| Page corners `‹ ›` | page edges | Tap to turn — besides scroll, `←`/`→`, swipe, and the Turn buttons. |
| `Read as page` | bottom-right | Flat, scrolling editorial version (`?mode=flat`), also the reduced-motion default. |

A first-turn hint (`← → or scroll to turn`) appears until you turn once.

### The chapters (mechanics are driven entirely by the volume JSON)
| # | Chapter | What happens | Edition |
|---|---|---|---|
| 0 | **Title page** | Generative cover art (Plate 0), codename with a one-time foil shimmer, hook, technique chips, sector, edition cards → `Open the volume ↓`. | both |
| 1 | **The problem** | Generative tangle (Plate 1) tightens as it resolves; one accent thread lifts out. Statement inks in word-by-word; pain points in roman numerals; TECH adds blueprint margin notes. | both |
| 2 | **The approach** | Pop-up paper architecture (Plate 2): numbered stage cards rise off a fold line, ghost stage-count numeral behind, accent particles flow along the tracks; hover/focus any stage for its caption. Right page lists the stages. | both |
| 3 | **Under the hood** | Translucent vellum (Plate 3) draws its blueprint over the flattened diagram — drag it sideways (snaps) to compare engineering vs business view. Right page: parts list (component/role/family) + "how we evaluated it". | TECH only |
| 4 | **The value** | Before/after spread; metrics **stamp** onto the after page one by one (impact + settle), numerals count up. | both |
| 5 | **Your return** | The ledger: adjust the inputs on the left page; totals roll live on the right (sandboxed formula evaluator — no `eval`). "Send me this estimate" carries it to the checkout card. | both (if `roi` present) |
| E | **Checkout** | The library card (Plate E): typewriter fields, validation with hand-drawn underlines. Submit → red date stamp slams on → card slides into the pocket → mono confirmation. Right page: three related volumes. | both |

Every chapter's elements reveal **after** the page turn lands, staggered in reading
order. Deep links work: `/book/specforge#engine` lands inside that chapter.

---

## 5 · The volumes (names, slugs, what each is)

| Volume (slug) | What it is | Object | Accent |
|---|---|---|---|
| **BatchProof** (`batchproof`) | Automated batch validation & calibration reporting for precision manufacturing | binder (operational system) | operations |
| **Reconcile** (`reconcile`) | Agentic AI that reconciles two families of forecast spreadsheets end-to-end | hardcover (platform) | operations |
| **FinLineage** (`finlineage`) | Financial knowledge graph: lineage Q&A, what-if simulation, conversational analyst | hardcover (platform) | finance |
| **AnswerRank** (`answerrank`) | AI search visibility platform: measure → understand → improve across AI answer engines | notebook (prototype) | growth |
| **TriageEngine** (`triage-engine`) | Autonomous firmware failure analysis: governed agent with skills + state machine | dossier (sensitive) | risk |
| **SpecForge** (`specforge`) | Spec-to-code pipeline that generates firmware-simulator peripherals from hardware specs | boxed set (programme) | simulation |

---

## 6 · Content → visuals (where to change what)

Everything the site renders comes from `content/volumes/[slug].json` (schema:
`lib/schema.ts` — the build fails if a file is invalid). Field map:

| JSON field | Drives |
|---|---|
| `codename`, `hook` | Spine name, title page, running header, checkout card |
| `objectType`, `domain`, `sectorTag`, `year`, `status` | Spine silhouette, accent band, kicker, red dot |
| `complexity`, `impactTier` | Spine thickness, foil bands |
| `techniques` | Glyph stack, capability lens, title chips, related-reading matching |
| `problem.statementExec/Tech`, `painPoints`, `marginNotes` | Chapter 1 |
| `approach.summaryExec`, `stages[]`, `edges` | Chapter 2 pop-up + list (≤6 stages) |
| `engine.blueprint[]`, `engine.parts[]`, `engine.evaluation` | Chapter 3 vellum + parts list |
| `value.before/after`, `value.metrics[]` (+ never-rendered `sourceNote`) | Chapter 4 stamps |
| `roi.inputs[]`, `roi.formula`, `roi.outputs` | Chapter 5 ledger |
| `related[]` | Checkout "related reading" |

**Adding a volume**: copy a JSON, fill the fields, `npm run build` (schema +
redaction guard both run). **Renaming**: change `slug` (URL) and `codename` (display)
in the file, rename the file to match, and update `related[]` references + imports in
`lib/content.ts`.

**Confidentiality**: relative/rounded metrics only, each with a `sourceNote` that is
never rendered; client terms live in the gitignored `redactions.local.txt`, enforced
against content *and* built output by `scripts/check-redactions.mjs`.

---

## 7 · Design tokens (single source of truth: `app/globals.css`)

- **Palette**: `--void/--shelf/--surface/--line` (the room), `--paper/--paper-2/--rule/--ink`
  (the pages), `--lamp` (emitted light only), `--stamp` (seals, ≤3 per volume),
  `--acc-*` (six domain accents).
- **Type**: Instrument Serif (display) · IBM Plex Sans (text) · IBM Plex Mono (labels),
  fluid scale `--fs-display-xl … --fs-label`.
- **Motion**: named easings (`--ease-standard/emphasized/exit/lift/page`) and
  durations (`80/160/280/480/700/1100/1800ms`). Nothing hard-codes a raw curve.
- Reduced-motion: every animation collapses; the shelf and reader stay fully usable;
  `?mode=flat` is the no-WebGL default.

---

## 8 · Known gaps / deferred (flagged deliberately)

- No WebGL/R3F cinematic shelf yet — the 2.5D shelf is the shipped rendering (spec's
  own fallback path); opening/closing shots are simulated with DOM choreography.
- Sound design not built (spec ships it off by default anyway).
- Enquiries/analytics land in local JSONL files (`data/`); wire to email/CRM +
  PostHog/Plausible later.
- Librarian streaming, tier-gated "Restricted Section", and per-audience credentials
  are schema-ready but not surfaced.
