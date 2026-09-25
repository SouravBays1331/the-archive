# The Archive — v1

A gated, interactive product-portfolio website. Every project is a **volume** on a
floating, softly lit shelf: visitors browse the shelf, pull a volume, and step inside
it to read the problem, the approach, the engineering, the value, the return — and
check the volume out (the enquiry).

Design source of truth: `The_Archive_Design_Spec.pdf` (v1.0). This build covers the
spec's Phase 0 (foundations + auth), Phase 1 (flat archive, fully readable with no
WebGL), and the DOM implementations of the Phase 4 chapter mechanics — with the 2.5D
CSS shelf rendering that the spec itself designates as the no-WebGL / tier-1 path.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
# or production:
npm run build && npm start
```

**Sign in:** credentials live in `.env.local` (gitignored — never committed). Create
your own with `npm run hash -- yourpassword` and paste the printed line into
`ARCHIVE_USERS`. For local development over plain http, keep `COOKIE_INSECURE=1`.

## Credentials (spec §07)

- Credentials live in `ARCHIVE_USERS` as bcrypt hashes — never in the repo or client bundle:
  `ARCHIVE_USERS=username:~2a~10~...,tier`
- dotenv expands `$` inside `.env` files, so hashes are stored with `$` encoded as `~`.
  Generate a ready-to-paste line: `npm run hash -- mypassword`
- `tier` is `guest` (default) or `partner` (wired for the Restricted Section later).
- Session: HS256 JWT (`jose`) in an httpOnly / SameSite=Lax cookie, 7-day expiry.
  Secret: `AUTH_SECRET` (>= 24 chars).
- Rate limit: 5 failed attempts per IP+username per 15 min → 429 `TRY AGAIN LATER`.
- `middleware.ts` enforces auth on EVERY route, asset and API except `/enter` and
  `/api/auth`. `robots.txt` disallows all; every response carries `X-Robots-Tag: noindex`.
- `COOKIE_INSECURE=1` disables the Secure flag for plain-HTTP local testing only.
  Behind HTTPS in production, remove it.

## Adding a volume (no project-specific code anywhere)

1. Copy a file in `content/volumes/*.json`, follow the schema in `lib/schema.ts`
   (validated at build — a bad file fails `npm run build`).
2. Pick a codename from the navigation/astronomy family. Never derive it from a client.
3. Metrics must be relative/rounded, each with a `sourceNote` (never rendered).
4. Run `npm run build` — the redaction guard (`scripts/check-redactions.mjs`) greps the
   content AND the built output for deny-listed client terms and fails on a match.

## Structure

```
app/enter/                 the gate (credential slot, beam, success sweep)
app/(archive)/page.tsx     the shelf (2.5D spines, lenses, search, legend)
app/(archive)/book/[slug]  the reader (spread + flat mode)
app/api/{auth,enquiry,librarian,analytics}
components/shelf/          ShelfWall, ReadingListTray, LibrarianPanel
components/reader/         Reader (turn engine, chrome, editions, deep links)
components/book/           chapters (tangle, pop-up, vellum, stamps, ledger, checkout)
content/volumes/*.json     the six volumes (the only place project content lives)
lib/                       session, schema(zod), content, safeEval, seed, tokens, store
scripts/                   hash-password, check-redactions
data/                      enquiries.jsonl, analytics.jsonl (gitignored)
```

## What v1 includes

- Gate with the spec's choreography: breathing beam, error flicker + shake, lockout,
  1.8 s lights-on success sequence (doubles as the shelf intro); returning visitors skip.
- Shelf: generative spines encoding domain (accent band), techniques (glyph stack),
  complexity (thickness), impact (foil bands), status (red dot), visited memory
  (bookmark + reading depth); lenses with bookends + FLIP re-shelving; search with
  match dimming; `How to read the shelf` legend; keyboard nav (`←→↑↓ Enter / L Esc`).
- Reader: two-page spread with 700 ms page turns (wheel/keys/swipe/buttons), ribbon ToC,
  page-edge progress, EXEC/TECH editions (persisted per session), flat-read mode,
  deep links (`/book/[slug]#chapter`), visited bookmarks.
- Chapters: title page (foil codename, edition cards), problem (generative tangle +
  word-by-word ink reveal + roman-numeral pains + tech margin notes), approach
  (CSS 3D pop-up with tracks + particles + hover captions), under the hood (draggable
  vellum blueprint + parts list + evaluation), value (stamped outcomes with count-ups),
  your return (ledger with sandboxed formula evaluation — no `eval()`), checkout
  (library card → date stamp → card slides into pocket; enquiry persisted).
- Reading-list tray (persists everywhere, `Enquire about these`), librarian (grounded
  keyword fallback; set `ANTHROPIC_API_KEY` to enable the LLM version, `LIBRARIAN_LLM=off`
  to disable), §13 analytics events → `data/analytics.jsonl`.
- Reduced-motion variants throughout; `?mode=flat` is the no-WebGL fallback.

## Deliberately deferred (spec phases 2–3 & 6)

- WebGL/R3F cinematic shelf + opening/closing shots (the 2.5D shelf is the shipped,
  spec-sanctioned fallback rendering; the reader is real DOM per spec §10 anyway).
- Sound design (Phase 6, ships off by default even in the spec).
- PostHog/Plausible + email/CRM webhook for enquiries (currently local JSONL files).

## v1.1 — errorless layer & flow enrichment

- Self-heals stale-chunk crashes: `components/ChunkGuard.tsx` reloads once if an open
  tab requests chunks from an older build; `app/error.tsx` / `app/global-error.tsx`
  render themed recovery screens instead of the raw Next error page.
- Reader: lamp progress bar, `02 / 07` scene counter, page-corner turn affordances,
  `Open the volume ↓` CTA on the title page, first-turn hint.
- Shelf→volume transition (room leans in, volume rises), staggered lights-on reveal,
  idle nudge on unread volumes, rubber-stamp arrivals, breathing tangle.
- If you restart the site, kill the process listening on the port first
  (`netstat -ano | findstr :4321` → `taskkill /PID <pid> /F`) — an orphaned
  `next start` serves a stale build manifest and 400s its own old chunks.
