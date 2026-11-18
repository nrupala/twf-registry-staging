# Codetopo Profile — TWF Registry Staging (nrupala/twf-registry-staging)

**What this is.** The agent-facing map of this repository, generated with
Codetopo 0.9.1 (local engine, `~/.cargo/bin/codetopo`) so an arriving agent
can see what the repo holds — topology, trust boundaries, money surface —
before it submits or changes anything. Read this first; the graph snapshot
beside it (`snapshot.json`, `stats.json`) is the measured evidence.

- **Repo:** nrupala/twf-registry-staging (public)
- **Commit profiled:** `9a0092c36c7becc4c791b1f89c01658ec4b0d552` (main, 2026-11-06)
- **Engine:** codetopo 0.9.1 · index run 2026-11-18
- **Graph:** 4 files walked · 0 failed · 13 nodes · 12 edges · audit chain valid (3 entries, head `7c59c5d9…841`)
- **Nodes by kind:** doc 4 · file 4 · module 4 · package 1
- **Edges by kind:** contains 12

## Coverage honesty

**This graph has zero code symbols — because this repo contains no
code.** The tree holds 9 files total: 4 Markdown files (`README.md`,
`CHANGELOG.md`, `CONTRIBUTING.md`, `TERMS.md`), `LICENSE`, `NOTICE`,
`.github/FUNDING.yml`, and two data files (`refs__registry.merged.json`,
`sources__registry.merged.json`). Codetopo indexed the 4 Markdown files
as Doc nodes only; the JSON registry data is **not** parsed into the
graph — read it directly. GitHub detects no languages for this repo.
There are no functions, classes, imports or call edges to report, and
this profile invents none.

## Topology

There is no code topology. This is a **temporary staging repo** for the
thinkwithfinance.com (TWF) citation registry refresh (README). What it
holds:

- `refs__registry.merged.json` — the merged citation references for TWF
  articles (129 entries in the current refresh, built 2026-09-26 per
  the README and the file's own `built` field). Each entry gives the
  cited publication (key, anchor, title, author/publisher, URL) and the
  TWF articles that cite it (`citedBy`).
- `sources__registry.merged.json` — the merged source list behind the
  registry (43 entries). Each entry names a source publication with its
  domain, tier, region, topics and access type.
- `README.md` — the lifecycle, stated plainly: (1) a registry refresh
  produces the two merged JSON files; (2) the files are staged in this
  repository; (3) the data is written to KV; (4) **the staged files are
  deleted**. Changes land by pull request (`CONTRIBUTING.md`); history
  in `CHANGELOG.md`.
- `TERMS.md` — the standard product terms of 2351485 ALBERTA INC.

An agent should treat the JSON files as transient staging data on its
way to KV — not as a source of truth, and not as a codebase.

## Trust boundaries

- **No code, no credentials, no secrets.** Greps for
  `stripe|paddle|secret|token|api_key|password|billing|checkout|webhook`
  over the whole tree return no credential material: the README has no
  hits, and the JSON files contain only public citation metadata
  (publication titles, public URLs, publisher names, tiers, topics) for
  sources TWF articles cite. No token value, key or account identifier
  exists in this repo.
- **The one real boundary is lifecycle discipline:** the staged files
  are copies. The registry's home is KV (per the README lifecycle);
  editing the staged JSON here does not change the live registry, and
  the files are expected to be deleted once written to KV. Do not build
  anything that depends on this repo persisting.

## Money surface

**None found — explicitly.** There is no payment, billing, checkout,
card, subscription or webhook surface in this repo, and no code at all
to carry one. Greps used:
`stripe|paddle|secret|token|api_key|auth|password|billing|checkout|webhook`
over the full tree — hits were public citation-metadata field names
only (e.g. author/publisher fields in the registry JSON), no money
surface.

## How an agent should approach

1. Read `README.md` — it fully describes this repo and its lifecycle.
2. If you need registry data, read the two JSON files directly; the
   graph cannot help you (docs only).
3. Do not treat this staging repo as durable: confirm against the live
   KV-backed registry before relying on any entry, and expect the
   staged files to disappear per the lifecycle.
4. Regenerate this profile (below) if the repo's shape changes.

## Regeneration

`docs/codetopo-profile/refresh.sh` (in this pack) re-downloads the repo
at a named ref, re-runs the index, and rewrites `snapshot.json`,
`stats.json` and the header block inputs of this profile. Regenerate at
every material change to the repo.
