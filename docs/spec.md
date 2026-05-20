# agentic-appsec-pilot — Specification (Stage 1 Discovery)

> 4-stage SDD: **Discovery → Requirements (EARS) → Design (Structure + Depends) → Tasks**。 各 stage 末で user approve gate。 本 file は Stage 1 Discovery 状態、 Stage 2 着手時 EARS section literal 育成。

## Stage 1 — Discovery

### Problem statement

TS / JS / Python codebase の owner (個人開発者 / SMB AppSec / OSS maintainer) が、 false-positive 多発の SAST 結果を triage し、 patch suggestion を 得るには:

- 商用 (Snyk Agent Fix / Endor / Aikido / ZeroPath / Mobb / Corgea) = paid + cloud
- OSS = (Tachi = architecture-only / pwnkit-bughunter-numasec = offensive pentest / Buttercup = C-Java only / repomind = Gemini cloud / Mythos Research = bug discovery / ClawGuard = prompt-injection only) = **5 軸同時カバーなし**

→ **Source-code level + Defensive AppSec + Local-first ($0/month Ollama) + TS/JS/Python + Confidence-calibrated SARIF + Patch suggestion** を 同時に満たす OSS が 2026-05 時点で literal 不在。

### Solution outline (3 stage、 Phase α scope)

| stage | 機能 | OSS dependency |
|---|---|---|
| ① Threat Model | repo URL → STRIDE + OWASP LLM/ASI mapping YAML/JSON (editable、 human-reviewable) | STRIDE-GPT (decomposed prior art、 ADR-0002) |
| ② Vuln Identify | code → SAST (OpenGrep + Bandit) + SCA (OSV-Scanner) + LLM enrich | OpenGrep / Bandit / OSV-Scanner |
| ④ SARIF Patch | finding → patch candidate + re-scan validation + SARIF 2.1.0 + CycloneDX VEX + cosign + SLSA L2 | sibling tool (sbom-pilot) reuse |

Stage ③ exploit sandbox = Phase β `agentic-appsec-exploit-lab` 別 repo (kernel-share 問題の構造的解消)。

### Non-goals (Phase α scope 外)

- Stage ③ exploit sandbox (Phase β)
- IaC / Container / K8s scan (out of scope)
- Runtime monitoring (out of scope、 本 PJ は static analysis)
- Cloud-only deploy mode (本 PJ は local-first)

### Stack

- TypeScript + Node.js 20 LTS + pnpm + vitest
- commander + zod + ajv + ajv-formats
- Ollama (gemma3:4b default) + optional `claude-code` CLI (ADR-0007)
- GitHub Actions 3-OS matrix (ubuntu / macos / windows) + free tier

### 5-axis wedge (差別化)

詳細 = `docs/adr/0001-prior-art-audit.md` §wedge-articulation。

## Stage 2 — Requirements (EARS Acceptance Criteria、 育成済 2026-05-20)

### REQ-001 (Stage ① Threat Model)

**WHEN** user invokes `agentic-appsec threat-model <repo>`
**THEN** the system SHALL emit STRIDE + OWASP LLM/ASI mapping JSON to stdout or `--output` file path.

- **AC-001-1**: Output JSON validates against `ThreatModel` schema (`src/ir/schema.ts:threatModelSchema`) — `validateThreatModel(output)` does not throw
- **AC-001-2**: Output `threats[]` length ≥ 1 for any non-trivial repo (≥ 100 source files)
- **AC-001-3**: Each ThreatEntry has `category ∈ {STRIDE 6 値}` literal
- **AC-001-4**: When repo is a GenAI app, ≥ 1 threat has `owaspLlm ∈ {LLM01..LLM10}`
- **AC-001-5**: Latency ≤ 60 s for a 1k-file repo on consumer laptop (Ollama gemma3:4b)

### REQ-002 (Stage ② Vuln Identify)

**WHEN** user invokes `agentic-appsec scan <repo>`
**THEN** the system SHALL run OpenGrep + Bandit + OSV-Scanner, dedupe findings, and emit SARIF 2.1.0.

- **AC-002-1**: Output validates against SARIF 2.1.0 OASIS schema literal
- **AC-002-2**: Findings deduped via `(artifactLocation.uri, region.startLine, ruleId)` triple (no duplicates after correlator)
- **AC-002-3**: Each Finding validates against `findingSchema` (`src/ir/schema.ts`)
- **AC-002-4**: Throughput ≥ 100 findings / minute on 1k-file fixture repo
- **AC-002-5**: SAST findings (OpenGrep + Bandit) AND SCA findings (OSV-Scanner) both present when applicable

### REQ-003 (Stage ② LLM enrich)

**WHEN** `--enrich` flag is set AND Ollama OR claude-code provider is available
**THEN** the system SHALL produce 3 enrichment outputs per finding.

- **AC-003-1**: Each enriched finding has ≥ 1 `evidenceTrail` entry with `type: 'llm_judgment'`
- **AC-003-2**: false-positive triage produces `confidence ∈ {★★★/★★/★/?}` literal calibrated
- **AC-003-3**: severity re-rank can change `severity` field with literal rationale in `evidenceTrail[].rationale`
- **AC-003-4**: exploit context explanation appears in `message` or new `evidenceTrail` entry with `rationale`
- **AC-003-5**: When LLM provider unavailable, fall back to pure SAST output (no error)

### REQ-004 (Stage ④ Patch suggest)

**WHEN** user invokes `agentic-appsec patch <finding-id>`
**THEN** the system SHALL generate a patch candidate AND validate via re-scan + syntax check.

- **AC-004-1**: Output includes `remediationSuggestion.diff` as unified diff string parseable by `git apply --check`
- **AC-004-2**: `remediationSuggestion.rescanValidated` = true iff re-run of SAST tool on patched file does not produce the same `ruleId` at same line
- **AC-004-3**: `remediationSuggestion.syntaxValid` = true iff patched file parses (tsc/python -m py_compile)
- **AC-004-4**: When validation fails, `remediationSuggestion` still emitted with `rescanValidated: false` (no error, user-visible state)

### REQ-005 (Confidence schema、 W3 wedge)

**WHEN** a finding is emitted in SARIF 2.1.0
**THEN** the system SHALL embed confidence + probability + evidence_trail in SARIF `properties` bag (OASIS spec §3.8 + §3.8.1 propertyBag mechanism、 spec-compliant、 not a spec extension).

- **AC-005-1**: SARIF `result.properties.confidence ∈ {★★★/★★/★/?}` literal
- **AC-005-2**: SARIF `result.properties.probability` is number 0.0-1.0
- **AC-005-3**: SARIF `result.properties.evidenceTrail` is JSON array with ≥ 1 entry
- **AC-005-4**: Calibration consistency: `confidence='★★★'` implies `probability >= 0.85`、 `'★★'` ⇒ `0.65-0.85`、 `'★'` ⇒ `0.35-0.65`、 `'?'` ⇒ `< 0.35`
- **AC-005-5**: External SARIF viewer (GitHub Code Scanning, VS Code SARIF extension) renders the finding without error (propertyBag is opaque to viewers but does not break parsing)

### REQ-006 (Local-first)

**WHEN** no LLM provider env-var is set AND `--use-claude-code` flag is absent
**THEN** the system SHALL use Ollama-default or mock fallback, never invoke paid API.

- **AC-006-1**: paid-API 6-layer defense intact: constructor gate + pre-flight reserve + key non-leak + CI auto-call ban + default Ollama/mock + no-credit-card service
- **AC-006-2**: Network egress to Anthropic / OpenAI / Gemini domains = ZERO in default mode (verified via egress allowlist)
- **AC-006-3**: When Ollama not installed AND `--use-claude-code` absent, system falls back to `mock` provider with literal warning message

### REQ-007 (Offline mode)

**WHEN** `--offline` flag is set
**THEN** the system SHALL operate with network egress ZERO.

- **AC-007-1**: `--offline` mode uses cached OSV.dev database snapshot (refreshable via `--refresh-db`)
- **AC-007-2**: Ollama runs against `http://localhost:11434` only
- **AC-007-3**: claude-code CLI invocation banned in `--offline` mode (literal error if `--use-claude-code` + `--offline` combined)

### REQ-008 (Exit codes)

The system SHALL conform to sysexits.h conventions.

- **AC-008-1**: 0 = OK / 1 = error / 65 = EX_USAGE (bad CLI args) / 70 = EX_SOFTWARE (internal error) / 77 = EX_PERMISSION (filesystem denied)
- **AC-008-2**: Defined in `src/errors/types.ts` (sibling tool reuse、 Stage 5)

### REQ-009 (Atomic write)

**WHEN** emitting SARIF / threat-model / patch artifacts
**THEN** the system SHALL use atomic file write (tempfile + rename).

- **AC-009-1**: Partial-write recovery: if process killed mid-write, target file is either old content or new content, never truncated
- **AC-009-2**: Implementation in `src/io/emitters/atomic.ts` (sibling tool reuse、 Stage 5)

### REQ-010 (paid-API 6-layer defense)

The system SHALL enforce 6-layer defense against accidental paid API calls.

- **AC-010-1**: Constructor gate = 2-factor env check (`<PROVIDER>_API_KEY` + `AGENTIC_APPSEC_LLM_PROVIDER`)
- **AC-010-2**: Pre-flight reserve = 3 ceiling (token / req count / cost) + poisoned-state circuit
- **AC-010-3**: Key non-leak = error msg masks API key (prefix 6 char only)
- **AC-010-4**: CI auto-call ban = unstubbed `fetch` throws in vitest by default
- **AC-010-5**: Default provider = Ollama (local) or mock — every entry point auto-fallback
- **AC-010-6**: No credit-card service = ZERO dep requires payment (verified via dep tree audit)
- **AC-010-7**: paid provider constructor reachable ONLY from CLI explicit flag、 never from library code path

## Stage 3 — Design (Stage 3 着手時 育成、 既存草稿は §File structure plan 以下)

### File structure plan

```
src/
├── ir/                              # threat-model + finding + evidence-trail schema
│   ├── types.ts
│   ├── schema.ts                    # zod + ajv validators
│   └── severity.ts                  # OSV severity ranking (sbom-pilot literal reuse)
├── stages/
│   ├── threat-model/
│   │   ├── prompts/                 # STRIDE-GPT decomposed (ADR-0002)
│   │   │   ├── stride.ts
│   │   │   ├── owasp-llm.ts
│   │   │   └── owasp-asi.ts
│   │   ├── generator.ts             # repo walker + prompt invoke
│   │   └── emitter.ts               # YAML/JSON output
│   ├── vuln-identify/
│   │   ├── opengrep-wrap.ts
│   │   ├── bandit-wrap.ts
│   │   ├── osv-scanner-wrap.ts
│   │   ├── llm-enrich.ts
│   │   └── correlator.ts            # dedup logic (REQ-002)
│   └── patch-suggest/
│       ├── generator.ts
│       └── validator.ts             # re-scan validation (REQ-004)
├── io/emitters/
│   ├── sarif.ts                     # SARIF 2.1.0 (sibling tool reuse)
│   ├── cyclonedx-vex.ts
│   └── atomic.ts                    # atomic write (sibling tool reuse)
├── providers/llm/
│   ├── ollama.ts                    # default (gemma3:4b)
│   ├── claude-code-cli.ts           # optional spawn (ADR-0007)
│   └── paid-defense.ts              # 6-layer defense (sibling tool reuse)
├── util/
│   ├── credential-scrub.ts          # sibling tool reuse
│   ├── ansi-strip.ts                # sibling tool reuse
│   └── cosign.ts                    # sibling tool reuse
├── errors/
│   └── types.ts                     # sysexits exit codes (sibling tool reuse)
└── cli/
    ├── index.ts                     # commander entrypoint
    ├── threat-model.ts
    ├── scan.ts
    ├── patch.ts
    └── node-version-check.ts        # sibling tool reuse
```

### Module boundary + dependency

- `ir/` = pure schema、 no external dep
- `stages/*` depends on `ir/`, `providers/llm/`, `io/emitters/`
- `io/emitters/` depends on `ir/`, `util/`
- `providers/llm/` depends on `errors/`
- `cli/` depends on all of the above

## Stage 4 — Tasks (Stage 4 着手時 literal 起草、 ~30 task 想定)

(本 stage は Stage 3 設計 lock 後 literal 起草)

## Verification protocol

- vitest per-stage isolation
- coverage gate: line ≥ 90% / branch ≥ 80% / func ≥ 95%
- 3-OS CI matrix (ubuntu / macos / windows)
- pnpm audit clean
- dependency-cruiser 0 errors
- SARIF schema validation (OASIS 公式 schema literal 適用)
- benchmark: 1k-file repo SAST/SCA throughput

## Approve gates

- Stage 1 → Stage 2: user 「Stage 2 IR design 着手 OK」 literal 承認
- Stage 2 → Stage 3: user 「Stage 3 設計着手 OK」 literal 承認
- Stage 3 → Stage 4: user 「Stage 4 task 起草 OK」 literal 承認
- Stage 11 PUBLIC flip: independent reviewer ★★★ verdict + user explicit promotion gate (AI 自己昇格禁止)
