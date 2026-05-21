# agentic-appsec-pilot — Tier 2 PJ-local rules

> Tier 1 universal doctrine / security / orchestrator は internal infra 経由で auto-import 済。
> 本 file は **PJ 固有** 規約のみ記述。

## PJ Identity

- 案件: `agentic-appsec-pilot` — Local-first AI-agent harness for defensive AppSec on TS/JS/Python codebases
- 目的: 個人開発者 / SMB / AppSec team 向け defensive-first CLI tool として portfolio に追加、 security tool trilogy #3 (mcp-guard #1 + sbom-pilot #2 の sibling)
- scope: Phase α (本 repo 単独 ★★★ verify) → PUBLIC flip = trilogy 完成 narrative
- target audience: TS/JS/Python codebase を持つ OSS maintainer + 個人開発者 + SMB AppSec team で false-positive triage + patch suggestion に困っている人
- Phase β = `agentic-appsec-exploit-lab` 別 repo として Phase α 完了後 単独 ship (kernel-share 問題の構造的解消)

## 5-axis wedge (差別化、 narrative SSoT)

source-code level + defensive AppSec + local-first (Ollama $0/month) + TS/JS/Python + confidence-calibrated SARIF + patch suggestion の 5 軸同時 OSS が 2026-05 時点で literal 不在。

近接 OSS:
- Tachi (Apache-2.0, 69★) = architecture-only / patch なし / Gemini required
- pwnkit / bughunter-ai / numasec = offensive pentest
- Buttercup (AGPL-3.0) = C/Java only
- repomind = Gemini cloud-required
- Mythos Research = bug discovery + disclosure
- ClawGuard = prompt-injection only

詳細: `docs/adr/0001-prior-art-audit.md`

## Repo public framing

本 repo は **GitHub PRIVATE で initial commit**、 ★★★ verify 通過後 user explicit promotion gate で PUBLIC 化。 PUBLIC 化時の framing:

- author identity: `tomohiro takada` (GitHub `leagames0221-sys`)
- profile framing: 「AI 開発者 / フルスタックエンジニア」
- "solo" / "individual" / "single dev" framing words avoided
- Off-repo personal identity details and unrelated project names not disclosed
- Internal infrastructure terminology not disclosed (commit-time sanitization hook blocks at write)

詳細 mask list: `.claude/internal_notes.md` (gitignored、 commit 不可)。

## Stack (確定済、 Stage 0 lock SSoT 順守)

- **Language**: TypeScript + Node.js 20 LTS
- **Package manager**: pnpm (lockfile commit)
- **Test**: vitest (ESM native)
- **CLI**: commander + did-you-mean
- **Schema**: zod + ajv (JSON Schema validator)
- **CI**: GitHub Actions 3-OS matrix (ubuntu/macos/windows) + free tier 内
- **LLM**: Ollama gemma3:4b default + optional `claude-code` CLI invoke (ADR-0007)
- **Sandbox**: 本 PJ では container 不要 (Stage ③ なし、 Phase β `agentic-appsec-exploit-lab` で適用)
- **OSS building block**: STRIDE-GPT decomposed (ADR-0002) + OpenGrep + Bandit + OSV-Scanner. Sigstore cosign + SLSA L2 attestation are referenced for Phase β patch-artifact signing; NOT wired in Phase α.

## PJ 固有 verify priority

Tier 1 default を継承 + 下記 addition:

1. SARIF 2.1.0 schema validation (OASIS 公式 schema literal 適用、 propertyBag extension で confidence + probability + evidence_trail)
2. Threat model output schema validation (STRIDE + OWASP LLM/ASI mapping、 ADR-0002 で定義)
3. Finding correlator dedup logic test (OpenGrep + Bandit + LLM 3 source 統合)
4. Patch validation 二段検証 (re-scan + syntax check、 spec.md EARS で定義)
5. Offline-mode smoke (network egress ZERO で 全 stage 完走、 Ollama local)
6. paid-API 6-layer defense intact verify

## PJ 固有 forbidden

- 実 vulnerability finding の credential / API key literal commit 禁止
- 顧客 codebase (受託案件 hint) literal commit 禁止
- Channel B 順守: 内部 infra 用語 / 内部 module 名 commit 禁止 (pre-commit hook で literal block)
- **クレカ要求 external service 採用 literal 禁止** (Cloudflare free tier / GitHub Actions free tier 等 クレカ不要 service のみ)
- **paid LLM API (Anthropic / OpenAI 等) auto-call literal 禁止** (env-var-gated optional、 user 明示時のみ active)
- **`claude-code` CLI 以外の paid LLM provider direct call 禁止** (Ollama local + claude-code CLI optional のみ、 ADR-0007)
- **package manager install (`pnpm install` / `npm install` 等) 不用意実行禁止** (Stage 2 IR 完了 + Stage 3 着手時 1 回のみ、 lockfile commit と同時)
- **Docker Desktop 新規採用禁止** (internal pin policy 順守、 但し Phase α は container 不要)

## PJ 固有 required

- 全 commit に `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` (internal universal policy)
- ADR-based 設計判断記録 (`docs/adr/NNNN-*.md`)
- LICENSE = MIT 維持
- 外部 OSS adopt 前に security audit gate 必須 (Scorecard ≥ 7 + signed release + dep tree audit + user 承認)
- **LLM 使用時 default = Ollama local** (consumer laptop 完走前提、 primary model = `gemma3:4b`)
- **mock mode (LLM 不使用、 pure static SAST/SCA のみ) を default fallback として常時 available**
- 全 CI workflow が GitHub Actions free tier (月 2,000 分) 内で完走することを literal verify
- **paid-API 6-layer defense intact** (sbom-pilot pattern literal inherit)

## paid-API 6-layer defense (sibling tool inherit、 internal universal pattern)

1. **Constructor gate**: 2-factor env check
2. **Pre-flight reserve**: 3 ceiling (token / request count / cost) + poisoned state
3. **Key non-leak**: error msg に API key literal 含めない (key prefix 6 char masked)
4. **CI auto-call ban**: `fetch` unstubbed throw in test default
5. **Default provider = Ollama (local) or mock**: 全 entry point で auto-fallback
6. **Credit-card-required service ZERO**: 全 dep が free-tier 完走、 OSV.dev / GHSA.org / NVD / Ollama 等 free public service のみ

paid provider 構築 path は **CLI layer の explicit construction のみ** (`--use-claude-code` flag)、 threat-model / scan / patch どこからも literal instantiate 不可。

## 関連 doc

- [docs/spec.md](docs/spec.md): PJ 仕様の SSoT (Stage 1 Discovery doc から育成)
- [docs/adr/](docs/adr/): 設計判断記録 (0001-0008、 全件 Accepted)
- [.claude/memory_bank/](.claude/memory_bank/): session 連絡帳 (Cline 5-file pattern)
- Stage 0 lock SSoT: internal SSoT 参照 (handoff supersede memory、 2026-05-20)
