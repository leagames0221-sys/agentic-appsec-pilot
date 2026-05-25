# Security policy — agentic-appsec-pilot

`agentic-appsec-pilot` is a local-first AI-agent harness for defensive AppSec
on TS / JS / Python codebases. Threat-model + SAST/SCA + patch-suggestion,
runs on Ollama by default with $0/month cost. We take the security posture of
this tool seriously precisely because it is itself an application-security
tool.

## Supply-chain defense layers

Following the ongoing Shai-Hulud / Mini Shai-Hulud / TeamPCP npm worm waves
(Sep 2025 → May 2026, > 400 packages compromised across at least 5 distinct
campaigns), this repo applies the following free, no-paid-service defense
layers:

| Layer | Implementation | Effect |
| --- | --- | --- |
| Cooldown (npm side) | `.npmrc` `minimum-release-age=10080` (= 7 days) | Refuses to install any package version published less than 7 days ago. Absorbs essentially all known supply-chain attack lifetimes (axios 2026-03 = 4-5 h; Shai-Hulud TanStack 2026-05 = 22 m publish burst). |
| Cooldown (Dependabot side) | `.github/dependabot.yml` `cooldown:` with 5 / 7 / 14 day gates per semver level | Defers automated update PRs until the cooldown window clears, so the in-tree window never sees a < 7-day-old version under normal operation. |
| Lifecycle script gate | `.npmrc` `ignore-scripts=true` | Disables `postinstall` / `preinstall` / `install` scripts — the primary code-execution vector in the original Shai-Hulud worm. This repo has no native compilation step, so no functional impact. |
| Audit floor | `.npmrc` `audit-level=high` + `pnpm audit --audit-level=high` in CI | Fails CI on any high-or-critical advisory at install time. |
| Lockfile integrity | `pnpm install --frozen-lockfile` in CI (existing) | Verifies every package against its committed integrity hash; fails loudly on drift. |
| 3-OS test matrix | CI runs ubuntu / macos / windows (existing) | A platform-specific compromise (e.g. windows-only payload) cannot land green on all three. |
| Static + dep audit | `pnpm typecheck` + `pnpm audit` + `dependency-cruiser` + CodeQL + gitleaks (existing) | Multiple complementary scanners across CI. |
| Author-time hygiene | Pre-commit hooks: gitleaks (secrets) + Channel B mask (private terminology) | Secrets cannot leave the workstation; private cross-project terminology cannot leave the workstation. |

Primary sources for the cooldown layer:

- pnpm `minimumReleaseAge` shipped in pnpm 10.16 (2025-09); default-on at 1 day in pnpm 11.0 (2026-05).
- Dependabot `cooldown:` shipped 2025-07-01 ([GitHub Changelog](https://github.blog/changelog/2025-07-01-dependabot-supports-configuration-of-a-minimum-package-age/)).
- 7-day window rationale: [cooldowns.dev](https://cooldowns.dev/) industry recommendation.

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
