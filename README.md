# agentic-appsec-pilot

[![ci](https://github.com/leagames0221-sys/agentic-appsec-pilot/actions/workflows/ci.yml/badge.svg)](https://github.com/leagames0221-sys/agentic-appsec-pilot/actions/workflows/ci.yml)
[![CodeQL](https://github.com/leagames0221-sys/agentic-appsec-pilot/actions/workflows/codeql.yml/badge.svg)](https://github.com/leagames0221-sys/agentic-appsec-pilot/actions/workflows/codeql.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/leagames0221-sys/agentic-appsec-pilot/badge)](https://scorecard.dev/viewer/?uri=github.com/leagames0221-sys/agentic-appsec-pilot)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node: 20+](https://img.shields.io/badge/Node-20+-brightgreen.svg)](https://nodejs.org/)

> ⚠ **Pre-public draft (Phase α author self-verify clean, awaiting promotion gate).** PRIVATE repo until user-explicit promotion. PUBLIC flip criteria: `docs/adr/0006-public-flip-criteria.md`.

**In plain words**: this is a command-line tool that reads your TypeScript / JavaScript / Python source code, asks a small AI model (running on your own laptop, no cloud bill) to look for security problems, and writes back not just the problem list but a draft fix you can review. It costs **$0/month** by default, needs **no API key**, and runs **offline** once you have the local model installed.

**For engineers**: Local-first AI-agent harness for defensive AppSec on TS/JS/Python codebases — threat modeling (STRIDE + OWASP LLM Top 10) + SAST (OpenGrep + Bandit) + SCA (OSV-Scanner) + LLM-driven false-positive triage + patch suggestion, emitting SARIF 2.1.0 + CycloneDX VEX. Default LLM provider is Ollama `gemma3:4b` (~3.8 GB local), optional `--use-claude-code` flag spawns your own `claude` CLI.

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

## Background and approach

**The gap I noticed.** In 2026 there are good OSS tools for each piece of defensive AppSec on a TS/JS/Python codebase — Tachi for architecture-level threat modeling, OpenGrep and Bandit for SAST, OSV-Scanner for SCA, and several research projects for LLM-driven enrichment. What I could not find was one OSS tool that did all of it at the source-code level, defensively (not as offensive pentest), running on a local LLM with no monthly bill, and emitting a confidence-calibrated SARIF plus a draft patch. Five axes that should compose, and none of the existing OSS tools composed all five. That five-axis gap is the wedge documented in [`docs/adr/0001-prior-art-audit.md`](docs/adr/0001-prior-art-audit.md).

**How I approached it.** Every adopted dependency and every design choice has an ADR (`docs/adr/0001`–`0008`) recording the alternatives considered and the trade-offs accepted. Where prior art existed and I could reuse the substance instead of the code, I did — STRIDE-GPT's threat-model prompt templates are ported via decomposed prior art ([ADR-0002](docs/adr/0002-stride-gpt-decomposed.md)) rather than vendored as a runtime dep. Where I made a non-trivial scaling decision (Ollama `gemma3:4b` as the default model), I sourced the within-family monotonicity claim to primary papers from Google DeepMind, Alibaba, and Meta ([ADR-0008](docs/adr/0008-default-llm-choice-and-customer-deployment.md)) rather than asserting it as opinion. Where I had to pick between two mature SCA tools, I rejected one explicitly with five reasons in the ADR ([ADR-0003](docs/adr/0003-osv-scanner-not-trivy.md)) rather than supporting both.

**What this exercise validated.** Three things turned out to be worth defending. First, the `$0/month + no credit card` constraint is not a limitation pretending to be a feature — it is a supply-chain discipline demonstration, and the customer-deployment upgrade path is wired on day one ([ADR-0008](docs/adr/0008-default-llm-choice-and-customer-deployment.md) §Customer deployment context). Second, the confidence-calibrated finding schema ([ADR-0005](docs/adr/0005-confidence-schema.md)) gives a reviewer something concrete to triage against, where most OSS finding outputs are binary yes/no. Third, Phase α intentionally stops before sandboxed exploit execution — that work ships as a separate repo (`agentic-appsec-exploit-lab`) so the kernel-share concerns of running attacker code are isolated rather than papered over ([ADR-0004](docs/adr/0004-sandbox-out-of-scope.md)). The 64/64 test-suite pass on the 3-OS CI matrix and ADR-0001 through ADR-0008 all in Accepted status are the verifiable artifacts of those three commitments.

## Status

- **Phase α author self-verify**: 7/7 criteria PASS on current HEAD ([`docs/verify/phase-alpha-round-1-self-verify.md`](docs/verify/phase-alpha-round-1-self-verify.md))
- Test suite: 64/64 PASS on 3-OS CI matrix (Ubuntu / macOS / Windows), coverage line 59.89% / branch 68.44% / function 70.23%
- ADRs: 0001–0008 all Accepted ([`docs/adr/`](docs/adr/))
- Awaiting user-explicit promotion gate for PUBLIC flip per [`docs/adr/0006-public-flip-criteria.md`](docs/adr/0006-public-flip-criteria.md)
- Spec status: Stage 1 Discovery + Stage 2 EARS Acceptance Criteria complete ([`docs/spec.md`](docs/spec.md))
- Phase β (sandboxed exploit lab) ships as a separate repo `agentic-appsec-exploit-lab` and is out of scope here

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node.js 20 LTS + pnpm 10+ | npm-ecosystem standard, free-tier CI compatible |
| Language | TypeScript (strict, ESM) | type safety, single-binary compile via `tsc` |
| CLI framework | commander + did-you-mean | minimal deps, sysexits-compliant exit codes |
| Schema validation | zod + ajv (+ ajv-formats) | runtime + JSON Schema validators for SARIF / VEX / threat-model |
| Test runner | vitest (ESM native) | 64/64 PASS on 3-OS CI |
| LLM (default) | Ollama `gemma3:4b` (~3.8 GB) | local, $0/month, no credit card, no network egress |
| LLM (optional) | `claude-code` CLI spawn | uses your own Claude Code subscription; this tool holds no API key |
| SAST | OpenGrep (LGPL-2.1) + Bandit (Apache-2.0) | TS/JS via OpenGrep, Python via Bandit, both free-tier |
| SCA | OSV-Scanner (Apache-2.0) | Google OSV.dev database, no cloud key required |
| Output formats | SARIF 2.1.0 + CycloneDX VEX | tool-vendor neutral standards |
| Threat-model prompts | STRIDE-GPT decomposed (MIT) | ADR-0002 — prompt templates ported, no Python runtime dep |
| CI | GitHub Actions 3-OS matrix (Ubuntu/macOS/Windows) | free tier, no payment required |

Full rationale per dependency: [`docs/adr/`](docs/adr/) (8 ADRs, all Accepted).

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

## Demo — what running it actually looks like

The captures below are reproducible from a fresh clone: run the literal commands and you will get byte-similar output (timestamps and UUIDs differ). The literal files live under [`docs/demo/`](docs/demo/) so a reviewer can diff against their own run.

**`agentic-appsec --help`** ([`docs/demo/help.txt`](docs/demo/help.txt)):

```
Usage: agentic-appsec [options] [command]

Local-first AI-agent harness for defensive AppSec on TS/JS/Python codebases.
Threat-model + SAST/SCA + patch-suggestion + SARIF 2.1.0, runs on Ollama by
default.

Commands:
  threat-model [options] <repo>  Generate STRIDE + OWASP LLM/ASI threat model
                                 for a repo.
  scan [options] <repo>          Run OpenGrep + Bandit + OSV-Scanner, emit SARIF
                                 2.1.0 + optional CycloneDX VEX.
  patch [options] <sarif-path>   Generate patch suggestion for a finding in a
                                 SARIF file.
```

**Threat-model output** ([`docs/demo/sample-threat-model.json`](docs/demo/sample-threat-model.json), `--provider mock` against an empty repo — used here to show the schema; with `--provider ollama` against a real repo, the `threats` array contains STRIDE-classified findings):

```json
{
  "schemaVersion": "1.0.0",
  "id": "tm-<uuid>",
  "target": "<repo path>",
  "generatedAt": "<ISO-8601 timestamp>",
  "threats": [],
  "improvementSuggestions": [
    "Provider \"mock\" did not return parseable JSON. Switch to ollama or claude-code-cli for real output."
  ]
}
```

**SARIF 2.1.0 scan output** ([`docs/demo/sample-scan.sarif`](docs/demo/sample-scan.sarif), validates against the OASIS SARIF JSON Schema referenced via `$schema`):

```json
{
  "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
  "version": "2.1.0",
  "runs": [
    {
      "tool": {
        "driver": {
          "name": "agentic-appsec-pilot",
          "version": "0.1.0",
          "informationUri": "https://github.com/leagames0221-sys/agentic-appsec-pilot",
          "rules": []
        }
      },
      "results": []
    }
  ]
}
```

A terminal-recording screenshot (PNG / asciinema cast) of an end-to-end run against a known-vulnerable fixture repo will be added once the user-explicit PUBLIC promotion gate is cleared; the textual captures above are the in-repo verifiable baseline.

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
