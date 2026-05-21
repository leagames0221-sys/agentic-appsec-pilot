# Security policy — agentic-appsec-pilot

`agentic-appsec-pilot` is a local-first AI-agent harness for defensive AppSec
on TS / JS / Python codebases. Threat-model + SAST/SCA + patch-suggestion,
runs on Ollama by default with $0/month cost. We take the security posture of
this tool seriously precisely because it is itself an application-security
tool.

## Supported versions

Until the first 1.0 release, security fixes ship against `main` only.
Pre-1.0 minor versions are not maintained as separate branches.

| Version | Supported          |
| ------- | ------------------ |
| `main`  | :white_check_mark: |
| 0.x.x   | :white_check_mark: (fixes land on `main` only) |

## Reporting a vulnerability

If you believe you have found a security vulnerability in
`agentic-appsec-pilot`, please **do not file a public GitHub issue**. Instead,
use one of the channels below.

### Preferred: GitHub Security Advisories

Open a private security advisory at
<https://github.com/leagames0221-sys/agentic-appsec-pilot/security/advisories/new>.
This routes the report to the maintainer privately and tracks remediation in
GitHub's coordinated-disclosure workflow.

### Alternative

Open a placeholder issue tagged `security-contact-please` (without details)
and the maintainer will respond with a private channel.

### What to include

- Affected version (commit SHA or release tag)
- Reproduction steps or proof-of-concept
- Expected vs. observed behavior
- Suggested remediation (optional)

### Service-level expectations

- **Acknowledgment**: within 5 business days of report
- **Initial triage**: within 10 business days (severity + remediation plan)
- **Fix landing**: severity-dependent — high/critical aim for 30 days,
  moderate aim for 60 days, low best-effort

These are aspirational; this project is maintained on a personal-time basis
and the SLA is not contractual.

## Scope

**In scope** (final boundaries locked at Stage 3 Design, see `docs/spec.md`):

- The `agentic-appsec-pilot` CLI itself
- Threat-model generator (prompts adapted from STRIDE-GPT, MIT — see
  `LICENSE-third-party.md`)
- Vuln-identify orchestrator (OpenGrep + Bandit + OSV-Scanner wrappers,
  finding correlator, LLM enrichment)
- Patch-suggest generator + validator
- SARIF 2.1.0 emitter (with W3 wedge propertyBag extension)
- CycloneDX 1.6 VEX emitter
- LLM provider layer (Ollama / claude-code CLI / mock) — paid API direct
  calls are literal banned per ADR-0007

**Out of scope**:

- External binaries we invoke (OpenGrep / Bandit / OSV-Scanner / Ollama /
  claude-code CLI). Report vulns in those upstream.
- Findings in repos you scan — those belong to the upstream project.
- Exploit sandbox (Phase β separate repo `agentic-appsec-exploit-lab`).

## Security architecture (key controls)

- **Paid-API 6-layer defense** (`src/providers/llm/paid-defense.ts`):
  constructor gate + pre-flight reserve + key mask + CI auto-call ban
  + default Ollama/mock + no-credit-card services.
- **child_process.spawn `shell: false`** everywhere (OpenGrep / Bandit /
  OSV-Scanner / claude-code CLI / patch validator). Command injection
  mitigated by argv array.
- **Atomic file write** for all artifact emit paths (SARIF / VEX /
  threat-model JSON). Partial writes invisible to readers.
- **Layer-direction enforcement** via dependency-cruiser CI gate (`pnpm run
  lint:deps`). One-way import flow prevents leak of CLI concerns into
  leaf modules.
- **Secret scan** at commit-time (gitleaks) and CI-time (gitleaks-action).
- **Dependency hygiene** via Dependabot weekly + pnpm audit gate.
- **CodeQL** static analysis + **OpenSSF Scorecard** repo-hygiene
  baseline (auto-activates on PUBLIC flip).

## Acknowledgements

Security posture borrows pattern from companion repos
[mcp-guard](https://github.com/leagames0221-sys/mcp-guard) and
[sbom-pilot](https://github.com/leagames0221-sys/sbom-pilot)
(defensive-tool trilogy by the same author). STRIDE-GPT (MIT, Matthew
Adams) is the prompt template source for the threat-model stage.
