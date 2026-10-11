# twf-registry-staging

Temporary staging for the thinkwithfinance.com (TWF) citation registry
refresh. Files here are staging copies only — after the registry data is
written to KV, the files are deleted.

## What's here

- `refs__registry.merged.json` — the merged citation references for TWF
  articles (129 entries in the current refresh, built 2026-09-26). Each
  entry gives the cited publication (key, anchor, title,
  author/publisher, URL) and the TWF articles that cite it (`citedBy`).
- `sources__registry.merged.json` — the merged source list behind the
  registry (43 entries). Each entry names a source publication with its
  domain, tier, region, topics, and access type.

## Lifecycle

1. A registry refresh produces the two merged JSON files.
2. The files are staged in this repository.
3. The data is written to KV.
4. The staged files are deleted.

Changes land by pull request — see `CONTRIBUTING.md`. History is in
`CHANGELOG.md`.
