# agentic-appsec-pilot

[![ci](https://github.com/leagames0221-sys/agentic-appsec-pilot/actions/workflows/ci.yml/badge.svg)](https://github.com/leagames0221-sys/agentic-appsec-pilot/actions/workflows/ci.yml)
[![CodeQL](https://github.com/leagames0221-sys/agentic-appsec-pilot/actions/workflows/codeql.yml/badge.svg)](https://github.com/leagames0221-sys/agentic-appsec-pilot/actions/workflows/codeql.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/leagames0221-sys/agentic-appsec-pilot/badge)](https://scorecard.dev/viewer/?uri=github.com/leagames0221-sys/agentic-appsec-pilot)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node: 20+](https://img.shields.io/badge/Node-20+-brightgreen.svg)](https://nodejs.org/)

> ⚠ **Pre-public draft (Phase α writer self-verify clean, awaiting promotion gate).** PRIVATE repo until user-explicit promotion. PUBLIC flip criteria: `docs/adr/0006-public-flip-criteria.md`.

Local-first AI-agent harness for defensive AppSec on TS/JS/Python codebases.

## What it does

Three stages, source-code level, $0/month default:

1. **Threat model generation** — STRIDE + OWASP LLM Top 10 + OWASP ASI mapping from your repo, output as editable YAML/JSON.
2. **Vulnerability identification** — SAST (OpenGrep + Bandit) + SCA (OSV-Scanner) + LLM-driven enrichment (false-positive triage, severity re-rank, exploit context).
3. **Patch suggestion** — LLM-generated remediation candidate + re-scan validation + SARIF 2.1.0 output + CycloneDX VEX. (Cosign signing + SLSA L2 attestation of patch artifacts = Phase β scope, **not implemented in Phase α**.)

## Why it's distinct (5-axis wedge)

Daybreak-style OSS replicas don't yet cover the intersection of all five:

| axis | this project | nearest alternative |
|---|---|---|
| analysis target | source code (file:line) | Tachi = architecture-only (Mermaid/PlantUML) |
| posture | defensive (SAST/SCA + patch) | pwnkit / bughunter-ai / numasec = offensive pentest |
| LLM | Ollama default ($0/month) | repomind = Gemini cloud-required |
| language | TS / JS / Python | Buttercup = C / Java only |
| output | confidence-calibrated SARIF + patch | most OSS output binary yes/no, no patch |

## Status

- **Phase α writer self-verify**: 7/7 criteria PASS on current HEAD ([`docs/verify/phase-alpha-round-1-self-verify.md`](docs/verify/phase-alpha-round-1-self-verify.md))
- Test suite: 64/64 PASS on 3-OS CI matrix (Ubuntu / macOS / Windows), coverage line 59.89% / branch 68.44% / function 70.23%
- ADRs: 0001–0008 all Accepted ([`docs/adr/`](docs/adr/))
- Awaiting user-explicit promotion gate for PUBLIC flip per [`docs/adr/0006-public-flip-criteria.md`](docs/adr/0006-public-flip-criteria.md)
- Spec status: Stage 1 Discovery + Stage 2 EARS Acceptance Criteria complete ([`docs/spec.md`](docs/spec.md))
- Phase β (sandboxed exploit lab) ships as a separate repo `agentic-appsec-exploit-lab` and is out of scope here

## Install

Requirements: **Node.js 20+**, **pnpm 10+**, optional **Ollama** (local LLM, $0/month).

```bash
git clone https://github.com/leagames0221-sys/agentic-appsec-pilot.git
cd agentic-appsec-pilot
pnpm install
pnpm run build      # compiles to dist/
node dist/cli/index.js --help
```

For full scan + enrichment, also install:

- **Ollama** (Windows 10+): https://ollama.com/download/windows — then `ollama pull gemma3:4b`
- **OpenGrep** (TS/JS/Python SAST): https://github.com/opengrep/opengrep/releases
- **Bandit** (Python SAST): `pip install bandit`
- **OSV-Scanner** (SCA): https://github.com/google/osv-scanner/releases

## Quickstart

```bash
# Stage 1: generate STRIDE + OWASP LLM/ASI threat model
agentic-appsec threat-model ./my-repo \
  --app-type "Generative AI application" \
  --provider ollama \
  --output threat-model.json

# Stage 2: SAST + SCA scan with LLM enrichment, emit SARIF + VEX
agentic-appsec scan ./my-repo \
  --provider ollama \
  --enrich \
  --output findings.sarif \
  --vex findings.vex.json

# Stage 3: patch suggestion (uses your own Claude Code subscription via spawned CLI; no API key held by this tool)
agentic-appsec patch findings.sarif \
  --repo ./my-repo \
  --use-claude-code \
  --output patch-suggestion.json
```

All three commands default to `--provider mock` (deterministic, no LLM call, no network egress). Set `--provider ollama` for local-LLM enrichment, or `--use-claude-code` to call your existing Claude Code subscription via the CLI.

**First-run behavior with no scanners installed**: `scan` gracefully degrades — if OpenGrep / Bandit / OSV-Scanner are absent from `PATH`, it logs `tool status: ...=not-installed` on stderr and emits an empty `findings: []` SARIF (exit code 0). This is by design (the CLI never crashes on missing optional tooling); install at least one scanner from the **Install** section above for actual output.

**Cost contract**: this tool holds no API key and makes no paid-API direct calls (see ADR-0007). `--use-claude-code` spawns your locally-installed `claude` CLI, which uses your own Claude Code subscription — billing flows through your existing Anthropic account, not through this tool. `--provider ollama` and `--provider mock` are fully offline and free.

## Portfolio constraint vs customer deployment

This repository operates under a self-imposed `$0/month + no credit card` constraint as a supply-chain discipline demonstration. That constraint dictates the default Ollama `gemma3:4b` (~3.8 GB install footprint) — small enough to run on a consumer laptop, free to use, no payment required.

**Customer deployments are not bound by that constraint.** Three upgrade paths are wired in on day one:

| Goal | Mechanism | Tier |
|---|---|---|
| Larger local Ollama model (private, on-prem) | `OllamaProvider({ model: 'qwen2.5-coder:14b' })` | open-source SOTA |
| Frontier quality via your own subscription | `--use-claude-code` flag | Claude Sonnet / Opus |
| CI / offline / deterministic | `--provider mock` (default) | none |

Within-family size↔quality is monotonic per [Gemma 3 Technical Report Table 18](https://arxiv.org/html/2503.19786v1) (4B→27B: +16.5 HumanEval pass@1) and [Qwen2.5-Coder Technical Report](https://arxiv.org/abs/2409.12186) ("positive correlation between model size and model performance"). The portfolio default is the **floor of useful quality**, not the ceiling. Full rationale + size budget + customer deployment recipe: [docs/adr/0008-default-llm-choice-and-customer-deployment.md](docs/adr/0008-default-llm-choice-and-customer-deployment.md).

## License

MIT. See [LICENSE](LICENSE). Third-party attribution: [LICENSE-third-party.md](LICENSE-third-party.md).

## Acknowledgements

- STRIDE-GPT (https://github.com/mrwadams/stride-gpt) — STRIDE + OWASP LLM/ASI prompt templates adapted via decomposed prior art (ADR-0002)
- OpenGrep (https://github.com/opengrep/opengrep) — SAST engine, LGPL-2.1
- Bandit (https://github.com/PyCQA/bandit) — Python SAST, Apache-2.0
- OSV-Scanner (https://github.com/google/osv-scanner) — SCA, Apache-2.0
- Sigstore cosign (https://github.com/sigstore/cosign) — referenced for Phase β patch-artifact signing (verify-blob + SLSA L2 attestation); not yet wired in Phase α
