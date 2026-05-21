# ADR-0006: PUBLIC flip criteria (★★★ verdict gate)

## Status

Accepted (2026-05-21) — **Revised same day** to reflect the user directive sealing the tier-reviewer subagent (see Condition 5 + Sequence). The original Condition 5 required a fresh-context `tier-reviewer` subagent dispatch; that subagent was sealed by user directive on 2026-05-21 to block AI-self-dispatch token waste, so the revised Condition 5 below is the literal honest-disclosure replacement.

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

### Condition 5: Writer self-verify against rubric + 17-item v3.0 portfolio QA rule

**Revised 2026-05-21**: The original wording required dispatch of the
`tier-reviewer` subagent. That subagent was sealed by user directive
on 2026-05-21 ("各セッションの AI が責任逃れで使い始めて、 失敗は全部
鑑定士が悪いと言い出した") + the same sealing directive literally
mandates that the writer AI itself performs the verification with
honest citation + uncertainty markers. The replacement criteria below
honor that sealing directive.

- Writer AI applies the 7-criteria Phase α rubric
  ([`docs/verify/phase-alpha-rubric.md`](../verify/phase-alpha-rubric.md))
  literally + records the verdict in
  [`docs/verify/phase-alpha-round-1-self-verify.md`](../verify/phase-alpha-round-1-self-verify.md)
  with per-criterion evidence-path citation + `?` honesty markers for
  any partial verification.
- Writer AI additionally applies the cross-PJ universal **17-item v3.0
  portfolio QA rule** (internal SSoT, established 2026-05-21, mirrored
  in the writer's global preferences file). 17/17 PASS is required;
  one FAIL drops the verdict to ★★ or lower.
- Cross-verification path (open to user / sibling AI / human reviewer):
  re-run the literal verify commands cited per criterion against the
  same HEAD, re-apply the 17-item rule, and compare verdicts. Any
  divergence is a regression and blocks PUBLIC.
- Optional human/sibling-session review: user MAY request a fresh
  writer session (not the same session that authored the verdict) to
  independently re-apply both rubrics. This is optional, not blocking.

Rationale for the revision: the sealing directive treats writer
self-verify as the new default verification path (not a fallback). The
prior `tier-reviewer` design failed in practice because the dispatch
gate was too easy for AI to invoke unilaterally and shift responsibility
onto the reviewer (~100k tokens per dispatch, "the reviewer said it was
fine" used to dodge accountability). Writer self-verify with literal
evidence citation keeps accountability with the writer.

### Condition 6: User explicit promotion gate

- User issues a literal sentence containing "PUBLIC flip OK" or
  equivalent unambiguous approval
- The AI **must not** infer approval from indirect signals ("looks good"
  / "ready" / etc. are not approval). When in doubt, ask.
- closure-bias defense: AI self-promotion is structurally forbidden.

## Sequence (literal, revised 2026-05-21)

```
[Conditions 1-4 green]
       ↓
[Writer applies 7-criteria Phase α rubric, records verdict file
 docs/verify/phase-alpha-round-1-self-verify.md with literal evidence
 paths + `?` honesty markers]
       ↓
[Writer applies 17-item v3.0 portfolio QA rule literally, 17/17 PASS
 required; one FAIL → ★★ or lower, fix and re-apply until 17/17]
       ↓
[Writer fixes any latent issues caught by either rubric, regression
 check: no drop in coverage / lint / audit]
       ↓
[Report verdict to user with literal evidence paths]
       ↓
[User issues explicit promotion sentence ("PUBLIC flip OK" or
 unambiguous equivalent — closure-bias defense, AI cannot self-promote]
       ↓
[gh repo edit --visibility public]
       ↓
[portfolio entry update + memory sync for next session]
```

Optional independent re-verification can be added between any two
steps above (a fresh writer session re-running the literal verify
commands + re-applying the 17-item rule); it is recommended but not
blocking, since the sealing directive places primary verification
responsibility on the writer AI.

## Rationale

1. **Closure-bias defense**: every "final / done / complete" claim
   triggers at least one objective evaluation round before literal
   closure. AI cannot self-promote.
2. **Sibling tool pattern (pre-sealing)**: `sbom-pilot` shipped via
   2-round CONFIRM + user-requested 3rd round audit + user explicit
   gate. The 2-round CONFIRM step used the now-sealed reviewer
   subagent. Post-sealing, that step is replaced by writer self-verify
   + 17-item v3.0 (this revision); the user-explicit-gate step is
   unchanged.
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

- sbom-pilot ★★★ verdict precedent (pre-sealing pattern, internal SSoT, 2026-05-20)
- 17-item v3.0 portfolio QA rule (cross-PJ universal SSoT, internal `tool_tier_rubric.md` v3.0, established 2026-05-21)
- reviewer-subagent sealing directive (user directive 2026-05-21, internal feedback record)
- closure-bias detection rationale (internal `INFO_GOVERNANCE.md` §5.2)
