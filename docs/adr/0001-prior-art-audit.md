# ADR-0001: Prior-art audit (2026-05-20)

## Status

Accepted (2026-05-20)

## Context

Phase α 着手前に既存 OSS / 商用 製品を網羅 scan、 wedge gap を literal 確定する必要あり。 D-PRIOR-ART-FIRST 順守 (internal doctrine reference: 既存 ひな形を 必ず scan、 ゼロ生成は立証責任)。

## Direct comparator: OpenAI Daybreak

- Source: https://www.helpnetsecurity.com/2026/05/12/openai-daybreak-openai-daybreak-vulnerability-validation-initiative/ (2026-05-12 announcement、 fetched 2026-05-20)
- 機能 (literal quote): "build editable threat models for a given repository" + "validate vulnerabilities in isolated environments" + "propose fixes" + "secure code review, threat modeling, patch validation, dependency risk analysis"
- Access: limited ("three levels of access" + "Trusted Access for Cyber program")、 GA ではない
- Partner literal cite: Akamai Technologies (CSO Boaz Gelbord quote)
- Status: closed-source + cloud + paid

## Frontier-only closed (Tier S)

- Anthropic Mythos (research preview)
- Google Big Sleep

## Commercial (Tier A)

XBOW / ZeroPath / Snyk Agent Fix / Endor / Aikido / Mobb / Corgea / GitHub Copilot Autofix — 全 件 paid + cloud + closed-source。

## OSS competitors (Tier B、 8 件 literal verify 2026-05-20)

| name | URL | license | stars | last activity | scope | gap vs 本 PJ |
|---|---|---|---|---|---|---|
| Tachi | https://github.com/davidmatousek/tachi | Apache-2.0 | 69 | 2026-05-14 | **architecture-level** threat model (Mermaid/PlantUML/C4)、 SARIF 2.1.0、 Claude Code subagent、 14 agent、 6 command | ✗ source-code 解析しない (README literal quote: "the harness analyzes architecture, not code") / ✗ patch generation なし / ✗ Gemini API required (infographic) / ✗ standalone CLI ではない |
| pwnkit | (GitHub topic listing 経由確認) | (TBD) | 29 | 2026-05-19 | autonomous **pentesting** engine (offensive)、 SARIF | ✗ defensive AppSec ではない |
| bughunter-ai | (GitHub topic listing) | (TBD) | 20 | 2026-05-19 | autonomous **bug bounty** framework (offensive)、 20 AI agent | ✗ offensive |
| numasec | (GitHub topic listing) | (TBD) | 370 | 2026-05-08 | "AI Agent for Cyber Security" with pentesting | ✗ pentesting 中心、 SAST + patch 主目的ではない |
| repomind | (GitHub topic listing) | (TBD) | 250 | 2026-05-18 | code analysis + security audit + **Gemini** | ✗ Gemini cloud-required、 local-first ではない |
| Mythos Research | (GitHub topic listing) | (TBD) | 15 | 2026-05-04 | Anthropic Mythos OSS replica、 agentic vuln discovery + disclosure | ✗ scope = bug discovery + disclosure、 SAST + patch 中心ではない |
| ClawGuard | (GitHub topic listing) | (TBD) | 7 | 2026-05-20 | prompt injection scanner、 225 pattern | ✗ prompt-injection 専用 |
| Buttercup | https://github.com/trailofbits/buttercup | AGPL-3.0 | 1.6k | 2025-08-14 | DARPA AIxCC CRS | ✗ **C/Java 解析 only**、 TS/JS/Python 非対応 |

## Building blocks (Tier C OSS 採用)

| component | URL | license | role | verified |
|---|---|---|---|---|
| STRIDE-GPT | https://github.com/mrwadams/stride-gpt | MIT | Stage ① threat-model prompt source (decomposed prior art、 ADR-0002) | ✓ 1k★ Anthropic Claude 4.5 native |
| OpenGrep | https://github.com/opengrep/opengrep | LGPL-2.1 | Stage ② SAST (TS/JS/Python 対応) | ✓ 2.6k★ v1.22.0 (2026-05-19) Semgrep fork |
| Bandit | https://github.com/PyCQA/bandit | Apache-2.0 | Stage ② Python SAST | ✓ v1.9.4 (2026-02) PyCQA-maintained |
| OSV-Scanner | https://github.com/google/osv-scanner | Apache-2.0 | Stage ② SCA | sibling tool sbom-pilot 既採用、 reuse |
| Sigstore cosign | https://github.com/sigstore/cosign | Apache-2.0 | Stage ④ verify-blob + SLSA L2 | sibling tool sbom-pilot 既採用、 reuse |

## REJECTED candidates

- **CodeQL**: closed-source scan engine + paid license (GitHub Advanced Security only)
- **Semgrep rules**: 2024-12 internal-business-only license change、 採用 NG (OpenGrep fork 採用)
- **sqlmap / commix**: Phase α scope 外 (Stage ③ なし)
- **OWASP/pytm**: last release 2024-04 (stale)、 STRIDE-GPT より maintenance 弱
- **Docker Desktop**: CVE-2025-9074 (CVSS 9.3) + CVE-2026-34040 (CVSS 8.8) + "container is not a sandbox" consensus、 新規採用 NG (Phase β で Podman rootless on WSL2 採用)

## Wedge articulation (5-axis、 literal SSoT)

source-code-level + defensive AppSec + local-first (Ollama $0/month) + TS/JS/Python coverage + confidence-calibrated SARIF + patch suggestion を 同時に満たす OSS は 2026-05 時点で literal 不在。 8 OSS competitor 全件、 5 軸の少なくとも 1 軸で literal disjoint。

商談耐性: 上記 8 OSS literal 列挙で 5 秒 verify 可能。 「5 軸同時 OSS 不在」 を 1 行で 主張可能 narrative。

## Stack-selection rationale

- TypeScript + Node 20 LTS = sibling tool (mcp-guard + sbom-pilot) trilogy 整合 + 既存 reuse ~60% (20 file literal copy)
- Ollama default = $0/month 公約 literal 順守
- pnpm = lockfile + internal package guard 順守

## Sources

- Daybreak primary article: https://www.helpnetsecurity.com/2026/05/12/openai-daybreak-openai-daybreak-vulnerability-validation-initiative/
- OpenAI Codex Security (Daybreak genealogy): https://openai.com/index/codex-security-now-in-research-preview/
- OpenAI Aardvark (Daybreak precursor): https://openai.com/index/introducing-aardvark/
- Tachi: https://github.com/davidmatousek/tachi
- STRIDE-GPT: https://github.com/mrwadams/stride-gpt
- OpenGrep: https://github.com/opengrep/opengrep
- Bandit: https://github.com/PyCQA/bandit
- Buttercup: https://github.com/trailofbits/buttercup
- CVE-2025-9074 NVD: https://nvd.nist.gov/vuln/detail/CVE-2025-9074
- SARIF 2.1.0: https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html
- CycloneDX VEX: https://cyclonedx.org/capabilities/vex/
- SLSA: https://slsa.dev/spec/v1.1/
