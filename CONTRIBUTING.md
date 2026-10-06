# Contributing to twf-registry-staging

This repo holds temporary staging JSON for the TWF citation registry refresh
(`refs__registry.merged.json`, `sources__registry.merged.json`). Files here are
deleted after the KV write, so changes are rare and data-only.

## PR-flow discipline

- All changes land through a **draft PR** — no direct pushes to `main`.
- Draft PR → checks green → owner merges.
- Every PR adds a `CHANGELOG.md` entry under `## [Unreleased]`.
- Version bumps follow semver (patch = fix, minor = feature). This repo has no
  version file, and none is created for it.
- Merge commits reference the PR number. Releases are tagged `vX.Y.Z`.
