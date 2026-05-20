# agentic-appsec-pilot

[![ci](https://github.com/leagames0221-sys/agentic-appsec-pilot/actions/workflows/ci.yml/badge.svg)](https://github.com/leagames0221-sys/agentic-appsec-pilot/actions/workflows/ci.yml)
[![CodeQL](https://github.com/leagames0221-sys/agentic-appsec-pilot/actions/workflows/codeql.yml/badge.svg)](https://github.com/leagames0221-sys/agentic-appsec-pilot/actions/workflows/codeql.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/leagames0221-sys/agentic-appsec-pilot/badge)](https://scorecard.dev/viewer/?uri=github.com/leagames0221-sys/agentic-appsec-pilot)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node: 20+](https://img.shields.io/badge/Node-20+-brightgreen.svg)](https://nodejs.org/)

> ⚠ **Pre-public draft (Stages 1-7 in progress)**. PRIVATE repo until ★★★ verdict gate via independent reviewer + user explicit promotion. PUBLIC flip criteria: `docs/adr/0006-public-flip-criteria.md` (Stage 8).

Local-first AI-agent harness for defensive AppSec on TS/JS/Python codebases.

## What it does

Three stages, source-code level, $0/month default:

1. **Threat model generation** — STRIDE + OWASP LLM Top 10 + OWASP ASI mapping from your repo, output as editable YAML/JSON.
2. **Vulnerability identification** — SAST (OpenGrep + Bandit) + SCA (OSV-Scanner) + LLM-driven enrichment (false-positive triage, severity re-rank, exploit context).
3. **Patch suggestion** — LLM-generated remediation candidate + re-scan validation + SARIF 2.1.0 output + CycloneDX VEX + SLSA L2 attestation.

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

- Stage 1 Foundation in progress
- Stage 2 IR → Stage 11 PUBLIC flip not yet started
- See `docs/spec.md` for Stage 1 Discovery + EARS requirements

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

# Stage 4: patch suggestion (uses your own Claude Code subscription)
agentic-appsec patch findings.sarif \
  --repo ./my-repo \
  --use-claude-code \
  --output patch-suggestion.json
```

All three commands default to `--provider mock` (deterministic, no LLM call, no network egress). Set `--provider ollama` for local-LLM enrichment, or `--use-claude-code` to call your existing Claude Code subscription via the CLI.

**Cost contract**: paid LLM API direct calls are literal banned (see ADR-0007). `--use-claude-code` uses your own Claude Code subscription via the `claude` CLI; the tool itself holds no API key.

## License

MIT. See [LICENSE](LICENSE). Third-party attribution: [LICENSE-third-party.md](LICENSE-third-party.md).

## Acknowledgements

- STRIDE-GPT (https://github.com/mrwadams/stride-gpt) — STRIDE + OWASP LLM/ASI prompt templates adapted via decomposed prior art (ADR-0002)
- OpenGrep (https://github.com/opengrep/opengrep) — SAST engine, LGPL-2.1
- Bandit (https://github.com/PyCQA/bandit) — Python SAST, Apache-2.0
- OSV-Scanner (https://github.com/google/osv-scanner) — SCA, Apache-2.0
- Sigstore cosign — verify-blob + SLSA L2 attestation
