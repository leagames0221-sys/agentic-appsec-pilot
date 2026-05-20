# ADR-0006: PUBLIC flip criteria (★★★ verdict gate)

## Status

Accepted (2026-05-21)

## Context

This PJ ships through three visibility states:

1. **PRIVATE (current)** — Stage 1-8 development under `leagames0221-sys`.
   No external readership. Token-leak risk = ours alone.
2. **PUBLIC pending review** — Stage 9-10 with independent reviewer
   verifying ★★★ verdict against literal evidence.
3. **PUBLIC** — Stage 11 flip with user-explicit promotion.

The transition between these states must not be unilaterally taken by
the AI (closure-bias defense). This ADR specifies the criteria + the
gate sequence.

## Decision

**PUBLIC flip is gated by all six conditions below, in order. Skipping
any condition is forbidden.**

### Condition 1: Test coverage gate met

- `pnpm run test:coverage` exits 0
- Coverage thresholds met (Phase α floor: lines/statements ≥ 55,
  functions ≥ 65, branches ≥ 50)
- 0 test failures across 3-OS CI matrix
- (Tighten thresholds before PUBLIC: lines/statements ≥ 75, functions
  ≥ 80, branches ≥ 70)

### Condition 2: Layer enforcement clean

- `pnpm run lint:deps` reports "0 dependency violations"
- All 5 forbidden edges (ir / errors / emitters / providers / cli)
  literally not present

### Condition 3: Supply-chain hygiene

- `pnpm audit --audit-level=high` reports "No known vulnerabilities"
- Dependabot has no open critical / high security PRs
- All declared deps pinned via pnpm-lock.yaml

### Condition 4: ADR set complete + signed off

- ADR-0001 through ADR-0007 all present, status `Accepted`
- Each ADR has literal source citations (URLs or file:line)
- LICENSE-third-party.md attributions verified against actual MIT/Apache
  source repos

### Condition 5: Independent reviewer ★★★ verdict

- Spawn fresh-context independent reviewer (`Agent` with `subagent_type:
  tier-reviewer`)
- Reviewer reads ONLY the rubric + literal evidence paths in this repo
- Reviewer reports PASS / FAIL / UNCERTAIN per criterion
- Verdict = ★★★ requires ALL criteria PASS
- **Minimum 2 review rounds**; user MAY request 3rd round
- Each round: writer self-audit between rounds, no regression in coverage
  / lint / audit

### Condition 6: User explicit promotion gate

- User issues a literal sentence containing "PUBLIC flip OK" or
  equivalent unambiguous approval
- The AI **must not** infer approval from indirect signals ("looks good"
  / "ready" / etc. are not approval). When in doubt, ask.
- closure-bias defense: AI self-promotion is structurally forbidden.

## Sequence (literal)

```
[Conditions 1-4 green]
       ↓
[Spawn independent reviewer round 1]
       ↓
[reviewer CONFIRM 7/7 + regression 0]
       ↓
[Writer self-audit, fix any latent issues]
       ↓
[Spawn independent reviewer round 2]
       ↓
[reviewer CONFIRM 7/7 + regression 0]
       ↓
[Report verdict to user with literal evidence paths]
       ↓
[User issues explicit promotion sentence]
       ↓
[gh repo edit --visibility public]
       ↓
[portfolio entry update + 3-file state-change memory sync]
```

## Rationale

1. **Closure-bias defense**: every "final / done / complete" claim
   triggers at least one objective evaluation round before literal
   closure. AI cannot self-promote.
2. **Sibling tool pattern**: `sbom-pilot` shipped via 2-round CONFIRM +
   user-requested 3rd round audit + user explicit gate (commit
   f7d8296). Same pattern literal repeated here.
3. **Citation-required principle**: verdict claims require source paths.
   Reviewer reads literal files, not summaries.
4. **Calibrated-honesty principle**: ★★★ marker is a contract. If any criterion
   fails, the verdict is ★★ or below.

## Consequences

### Positive

- No accidental PUBLIC flip from AI overconfidence.
- Two independent verification passes catch regressions.
- User retains explicit control + audit trail.

### Negative

- Slower than "AI says ready → flip". Intentional.

## References

- sbom-pilot ★★★ verdict precedent (internal SSoT, 2026-05-20)
- independent reviewer subagent (internal definition, not committed)
- closure-bias detection rationale (internal `INFO_GOVERNANCE.md` §5.2)
