# Direct Response Library (V1)

A static web app for browsing and studying a corpus of ~189 direct-response
marketing "breakdown" documents — reverse-engineered analyses of sales letters,
ads, and direct mail packages from three source collections:

- **100 Greatest Sales Letters** (`GSL100-DR-*`)
- **AWAI Direct Response Hall of Fame** (`HOF-DR-*`)
- **World's Greatest Direct Mail Sales Letters** (`WGDM-DR-*`)

V1 is functional/utilitarian by design: a restrained neutral UI, no cover art,
no premium visual pass. That's explicitly out of scope for this phase (see
"V2" below).

## Project layout

```
direct-response-library/
├── app/                   # Vite + React app (source)
│   └── public/corpus/     # generated mirror — DO NOT hand-edit, see below
├── public/                # top-level placeholders (covers/, sources/)
├── corpus/
│   ├── breakdowns/        # source-of-truth copy of the 189 .md breakdown files
│   └── library-index.json # generated index (do not hand-edit)
├── scripts/
│   └── build-index.mjs    # indexing/validation pipeline
└── README.md
```

**Corpus / app separation:** `corpus/breakdowns/*.md` is the source of truth —
a byte-identical copy of the original breakdown files. `corpus/library-index.json`
is a generated artifact built from it. Neither should be hand-edited; if a
breakdown file needs a fix, edit it in `corpus/breakdowns/` and re-run the
build script. The app never reads directly from `corpus/`; it reads from
`app/public/corpus/`, a mirror that the build script regenerates on every run
so the two never drift.

## Running it

From `app/`:

```bash
npm install
npm run dev        # starts Vite dev server (runs build-index first via predev)
npm run build      # production build to app/dist/ (runs build-index first via prebuild)
npm run build-index  # just (re)generate corpus/library-index.json + the app/public/corpus mirror
```

`build-index` can also be run directly from the repo root:

```bash
node scripts/build-index.mjs
```

It prints a validation report (files found/indexed, any parse failures,
duplicate IDs, missing titles, metadata coverage warnings).

## Deploying to GitHub Pages

1. `cd app && npm run build` — produces `app/dist/`.
2. Publish `app/dist/` as your Pages site content (e.g. push it to a `gh-pages`
   branch, or point a Pages workflow at that directory).
3. No further configuration needed. Two choices in this app make that "just
   work" on a project site (`username.github.io/repo-name/`) without any
   server-side rewrite rules:
   - **`HashRouter`** (not `BrowserRouter`) — routes live after a `#`
     (e.g. `/#/library/HOF-DR-011`), so a hard refresh or direct link always
     resolves to `index.html` first; there's no route for the static host to
     404 on.
   - **`base: './'`** in `vite.config.js` — all built asset URLs are relative,
     so the app works from any subpath without editing config per-deployment.

## How the data flows

1. `scripts/build-index.mjs` reads every `.md` file in `corpus/breakdowns/`,
   parses YAML frontmatter, extracts a flat metadata record per promotion
   (including normalized `formatNormalized` / `leadTypeNormalized` buckets and
   a derived `source_collection`), and writes `corpus/library-index.json`.
2. It mirrors `corpus/breakdowns/*.md` and `corpus/library-index.json` into
   `app/public/corpus/` so Vite serves them as plain static files.
3. The React app fetches `corpus/library-index.json` once on load for the
   Library/Search/Filter/Compare views, and fetches individual `.md` files
   from `corpus/breakdowns/` on demand when the Reader view opens a
   promotion.

Normalization rules for `lead_type` and `format` (collapsing raw frontmatter
variants like `"direct-offer"` / `"direct offer / invitation"` into one
bucket) are documented as comments at the top of `scripts/build-index.mjs`.
`market`, `offer_type`, `proof_types`, and `dimensionalization` are
intentionally **not** used as filters (too high-cardinality / free-text) —
they're used for search and detail/compare display only.

## Study Mode

Study Mode (toggle in the Reader) groups each file's actual `## ` headings by
keyword match (see `app/src/utils/headingGroups.js`) into reveal/hide groups —
Big Idea, Lead, Structure, Claim → Proof, Mechanism, Dimensionalization,
Offer, Reusable Principles, and a catch-all "Additional Analysis" bucket for
anything unmatched. `Source Metadata` and `Executive Breakdown` are always
visible. This is computed generically per-file from the parsed headings, not
from a hardcoded 21-section list, so it degrades gracefully on the one corpus
file with an extra trailing heading.

## Study status & Compare selection

Both are pure client-side state in `localStorage` — no backend, no accounts:

- `dr-library:study-status` — per-promotion Not Studied / Studying / Completed.
- `dr-library:compare-selection` — which 2–4 promotions are queued for the
  Compare view.

## V2 (future — not built here)

V1 deliberately keeps all visual styling behind a few seams so a future
redesign pass doesn't have to touch data-fetching, routing, or state logic:

- `PromotionCard` (`app/src/components/PromotionCard.jsx`) is a dumb
  presentational component — swap its markup/CSS for a redesign without
  touching `LibraryHome.jsx`'s search/filter/data logic.
- All styling lives in `app/src/index.css`; there's no CSS-in-JS or inline
  layout logic tying visuals to component internals.
- The corpus/indexing pipeline (`scripts/build-index.mjs`,
  `corpus/library-index.json`) is completely decoupled from the UI layer —
  a V2 visual redesign, cover art (`public/covers/`), or original source PDFs
  (`public/sources/`) can be added without changing how promotions are
  indexed or served.
