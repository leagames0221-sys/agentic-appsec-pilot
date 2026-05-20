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

## Stage 2 — Requirements (EARS、 Stage 2 着手時 literal 育成)

### REQ-001 (Stage ① Threat Model): WHEN user invokes `agentic-appsec threat-model <repo>` THEN the system SHALL emit STRIDE + OWASP LLM/ASI mapping YAML/JSON to stdout or `--output` file path.

### REQ-002 (Stage ② Vuln Identify): WHEN user invokes `agentic-appsec scan <repo>` THEN the system SHALL run OpenGrep + Bandit + OSV-Scanner, dedupe findings via file:line + rule_id mapping, and emit SARIF 2.1.0 to stdout or `--output` file path.

### REQ-003 (Stage ② LLM enrich): WHEN `--enrich` flag is set AND Ollama or claude-code provider is available THEN the system SHALL produce 3 enrichment outputs per finding: (a) false-positive triage verdict, (b) severity re-rank, (c) exploit context explanation.

### REQ-004 (Stage ④ Patch suggest): WHEN user invokes `agentic-appsec patch <finding-id>` THEN the system SHALL generate a patch candidate via LLM AND re-run the relevant SAST tool on the patched file to validate the finding no longer triggers.

### REQ-005 (Confidence schema): WHEN a finding is emitted THEN the system SHALL include `properties.confidence` (★★★/★★/★/?), `properties.probability` (0.0-1.0), and `properties.evidence_trail` (array of citations) in the SARIF 2.1.0 result.

### REQ-006 (Local-first): WHEN no LLM provider env-var is set AND no `--use-claude-code` flag is given THEN the system SHALL run Ollama-default or mock fallback, never invoke paid API.

### REQ-007 (Offline mode): WHEN `--offline` flag is set THEN the system SHALL operate with network egress ZERO (Ollama local + cached OSV.dev database snapshot).

### REQ-008 (Exit codes): The system SHALL conform to sysexits.h conventions (0=OK, 1=error, 65=usage, 70=software, 77=permission).

### REQ-009 (Atomic write): WHEN emitting SARIF / threat-model / patch artifacts THEN the system SHALL use atomic file write pattern (tempfile + rename, no partial writes).

### REQ-010 (paid-API 6-layer defense): The system SHALL enforce 6-layer defense against accidental paid API calls (constructor gate, pre-flight reserve, key non-leak, CI auto-call ban, default mock/Ollama, no-credit-card service).

## Stage 3 — Design (Stage 3 着手時 literal 育成)

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
