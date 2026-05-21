# Phase α verdict rubric — agentic-appsec-pilot

> Independent reviewer reads ONLY this file + the literal evidence paths
> cited per criterion. Apply binary verification: PASS / FAIL /
> UNCERTAIN per criterion. Final verdict: ★★★ requires ALL criteria
> PASS. One FAIL or one UNCERTAIN → verdict is ★★ or lower.

**Anchored at**: current `master` HEAD — reviewer runs
`git rev-parse HEAD` locally to capture the exact SHA being verified.
The rubric itself is commit-agnostic; criteria below apply to whichever
commit is HEAD when the reviewer is dispatched.

**Repo**: `C:\Users\admin\Projects\agentic-appsec-pilot\` (currently
PRIVATE; PUBLIC flip is downstream of this verdict per ADR-0006).

---

## C1 — Test coverage gate

**Criterion**: `pnpm run test:coverage` exits 0 with all coverage
thresholds met (Phase α floor: lines/statements ≥ 55, functions ≥ 65,
branches ≥ 50). 0 test failures.

**Evidence paths**:
- `vitest.config.ts` (thresholds literal)
- `tests/` directory (12 test files)
- Run command: `pnpm run test:coverage`
- Expected: 64/64 PASS, 0 threshold failures

**PASS condition**: exit code 0 + summary "64 passed".

---

## C2 — Layer enforcement clean

**Criterion**: `pnpm run lint:deps` reports 0 dependency violations.

**Evidence paths**:
- `.dependency-cruiser.cjs` (5 forbidden edges + no-circular + no-orphans)
- Run command: `pnpm run lint:deps`
- Expected: "no dependency violations found (N modules, M dependencies cruised)"

**PASS condition**: exit code 0 + "no dependency violations" literal in output.

---

## C3 — Supply-chain hygiene

**Criterion**: `pnpm audit --audit-level=high` reports "No known
vulnerabilities found".

**Evidence paths**:
- `package.json` (12 declared deps)
- `pnpm-lock.yaml` (166-package transitive closure)
- Run command: `pnpm audit --audit-level=high`
- Expected: "No known vulnerabilities found" exact string

**PASS condition**: exit code 0 + "No known vulnerabilities found" literal.

---

## C4 — ADR set complete with source citations

**Criterion**: ADR-0001 through ADR-0007 all present in `docs/adr/`,
all in `Status: Accepted`, each with at least one literal URL or
file:line citation in `## References` or equivalent section.

**Evidence paths**:
- `docs/adr/0001-prior-art-audit.md` — 8 OSS competitor + 14 source URLs
- `docs/adr/0002-stride-gpt-decomposed.md` — STRIDE-GPT MIT + work decomposition
- `docs/adr/0003-osv-scanner-not-trivy.md` — SCA choice rationale
- `docs/adr/0004-sandbox-out-of-scope.md` — Phase β separation
- `docs/adr/0005-confidence-schema.md` — SARIF propertyBag spec section refs
- `docs/adr/0006-public-flip-criteria.md` — 6 conditions sequence
- `docs/adr/0007-agent-harness.md` — Ollama default + claude-code CLI

**PASS condition**: all 7 files exist + each contains `Status:
Accepted` + each contains at least one citation URL or file:line ref.

---

## C5 — 5-axis wedge grounded

**Criterion**: each of the 5 axes (source-code level / defensive /
local-first / TS-JS-Python / confidence-calibrated SARIF + patch) has
a literal disjoint competitor cited in ADR-0001.

**Evidence paths**:
- `docs/adr/0001-prior-art-audit.md` §Wedge articulation + Tier B
  competitor table
- `README.md` 5-axis wedge table (mirrors ADR-0001)
- `CLAUDE.md` 5-axis wedge section (PJ-local SSoT)

**PASS condition**: all 5 axes have at least one competitor literally
named as disjoint on that axis (e.g. Tachi for axis 1, Buttercup for
axis 4, etc.). At minimum 5 distinct competitor entries used across
the 5 axes.

---

## C6 — Stack and wedge claims literal sourced

**Criterion**: every external dependency / OSS adopted is sourced by
URL in ADR-0001 §Building blocks. Daybreak comparator + STRIDE-GPT
attribution literal cited.

**Evidence paths**:
- `docs/adr/0001-prior-art-audit.md` §Building block table (URL +
  license + version)
- `LICENSE-third-party.md` (STRIDE-GPT MIT attribution)
- `package.json` (declared deps)

**PASS condition**: building blocks (STRIDE-GPT / OpenGrep / Bandit /
OSV-Scanner / Sigstore cosign) each have a literal URL + license noted.
LICENSE-third-party.md contains STRIDE-GPT MIT full text.

---

## C7 — Channel B integrity (opacity scan clean)

**Criterion**: no leak of the author's private cross-project
infrastructure terminology into any committed file in this repository.

**Forbidden-pattern source**: the author maintains a private pattern
list out-of-tree (gitignored at `.claude/internal_notes.md`). The
patterns themselves are deliberately not enumerated in this committed
rubric file — listing them here would re-expose what the scan is
designed to redact.

**Evidence procedure**:

1. Read the gitignored pattern list (author-only).
2. Run a recursive grep across all tracked files using those patterns.
3. Confirm 0 matches.

**PASS condition**: grep across tracked files emits 0 matches.

---

## Verdict rules

- **★★★** = all 7 criteria PASS, regression 0 from baseline
- **★★**  = 6/7 PASS with documented justification for the remaining one
- **★**   = 4-5/7 PASS
- **?**   = ≤ 3/7 PASS or any UNCERTAIN unresolved

**Reviewer must not** infer state from indirect signals. Each criterion
gets PASS/FAIL/UNCERTAIN strictly from running the evidence command
or reading the evidence file. UNCERTAIN is appropriate when evidence
is ambiguous; never round up to PASS to "be helpful".

## Reviewer output format

For each criterion (C1-C7):

```
C<N>: <PASS|FAIL|UNCERTAIN>
  evidence: <command run or file read>
  literal observation: <quote or summary>
  note: <if FAIL or UNCERTAIN, why>
```

Final line: `Verdict: ★★★ | ★★ | ★ | ?`
