# Phase α — Round 1 self-audit (early author check, superseded)

> ⚠ **SUPERSEDED 2026-05-21 by `phase-alpha-round-1-self-verify.md`.**
> The C7 PASS claim in this document was based on an **incomplete
> scan**: 2 pattern hits in `docs/adr/0001-prior-art-audit.md:9` and
> `docs/adr/0002-stride-gpt-decomposed.md:22` were missed. The
> superseding document re-runs the full canonical scan post-fix and
> records the corrected verdict.

> ⚠ This document records an early author self-check at commit
> `ee6d41f`. It is retained for historical traceability only; the
> current verification SSoT is `phase-alpha-round-1-self-verify.md`.

## Anchor

- **Commit**: `ee6d41f` on `master`
- **Date**: 2026-05-21
- **Repo state**: PRIVATE; PUBLIC flip is downstream of independent CONFIRM.

## Self-check results (author-side, 7/7 PASS as of `ee6d41f`)

### C1 — Test coverage

- **Result**: PASS
- **Command**: `pnpm run test:coverage`
- **Observation**: 64 passed (64), exit 0, all thresholds met
  (lines/statements ≥ 55, functions ≥ 65, branches ≥ 50).

### C2 — Layer enforcement

- **Result**: PASS
- **Command**: `pnpm run lint:deps`
- **Observation**: "no dependency violations found (55 modules, 100
  dependencies cruised)".

### C3 — Supply-chain hygiene

- **Result**: PASS
- **Command**: `pnpm audit --audit-level=high`
- **Observation**: "No known vulnerabilities found".

### C4 — ADR set complete

- **Result**: PASS
- **Evidence**: `docs/adr/0001` through `0007` all literally present;
  each has `Status: Accepted` on a header line; each cites source
  URLs / file:line refs.

### C5 — 5-axis wedge grounded

- **Result**: PASS
- **Evidence**: `docs/adr/0001-prior-art-audit.md` §OSS competitors
  lists 8 entries (Tachi, pwnkit, bughunter-ai, numasec, repomind,
  Mythos Research, ClawGuard, Buttercup), each disjoint on at least
  one of the 5 axes (source-code level / defensive / local-first /
  TS-JS-Python / confidence-calibrated SARIF + patch).

### C6 — Stack and wedge claims literal sourced

- **Result**: PASS
- **Evidence**: `docs/adr/0001-prior-art-audit.md` §Building blocks
  lists 5 OSS deps (STRIDE-GPT MIT, OpenGrep LGPL-2.1, Bandit
  Apache-2.0, OSV-Scanner Apache-2.0, Sigstore cosign Apache-2.0)
  with literal URLs. `LICENSE-third-party.md` includes the STRIDE-GPT
  MIT license full text.

### C7 — Channel B integrity

- **Result**: PASS post-fix
- **Pre-fix hits**: `src/ir/types.ts` L69 + L90 contained private
  pattern tokens; replaced in `ee6d41f` with descriptive equivalents.
- **Post-fix scan**: 0 hits across all tracked files using the
  author's private pattern list (maintained out-of-tree per
  `.gitignore`).

## Verdict

**★★ (author self-check clean as of `ee6d41f`; superseded by current
verification SSoT at `phase-alpha-round-1-self-verify.md`)**.

The current verdict + Resume protocol live in the superseding document
above. This file is retained for historical traceability only and the
content below this point is preserved verbatim from the original
draft.

[Subsequent sections preserved as historical record only — see
`phase-alpha-round-1-self-verify.md` for the current verdict and
verification protocol.]
