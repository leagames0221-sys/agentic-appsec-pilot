# productContext.md — agentic-appsec-pilot

> Product positioning + user persona + market context の literal SSoT。

## Product

**agentic-appsec-pilot** = Local-first AI-agent harness for defensive AppSec on TS/JS/Python codebases。

3 機能 (Daybreak の publicly disclosed core capability subset を OSS 実装):
1. **Threat model generation** — STRIDE + OWASP LLM Top 10 + OWASP ASI mapping from repo
2. **Vulnerability identification** — SAST (OpenGrep + Bandit) + SCA (OSV-Scanner) + LLM enrichment
3. **Patch suggestion** — LLM-generated remediation + re-scan validation + SARIF 2.1.0 + CycloneDX VEX + SLSA L2

## Target audience

- **個人開発者** が 自分の TS/JS/Python OSS の security posture を ローカル AI で audit したい
- **SMB AppSec team** が paid commercial scanner (Snyk / Endor / Aikido / ZeroPath) の代替を $0/month で欲しい
- **OSS maintainer** が CI に SARIF output を 統合したい (GitHub Code Scanning Free tier 互換)

## Market context (2026-05 時点)

- OpenAI **Daybreak** (2026-05-12 announced、 limited access "Trusted Access for Cyber program") = direct comparator、 但し closed-source + paid + cloud-required
- Anthropic **Mythos** (research preview) + Google **Big Sleep** = frontier-only closed
- 商用: **XBOW / ZeroPath / Snyk Agent Fix / Endor / Aikido / Mobb / Corgea** = 全 件 paid + cloud
- OSS: 近接競合 8 件 verify (Tachi / pwnkit / bughunter-ai / numasec / Buttercup / repomind / Mythos Research / ClawGuard) = **全 件 で 5 軸同時カバーなし**

## 5-axis differentiation

| axis | 本 PJ | 競合最良 |
|---|---|---|
| analysis target | source code (file:line) | Tachi = architecture description (Mermaid/PlantUML) のみ |
| posture | defensive (SAST/SCA + patch) | pwnkit/bughunter-ai/numasec = offensive pentest |
| LLM provider | Ollama local default ($0/month) | repomind = Gemini cloud required |
| language coverage | TS / JS / Python | Buttercup = C / Java only |
| output schema | confidence-calibrated SARIF + patch | 他 OSS は binary yes/no、 patch なし |

## Portfolio positioning

- **trilogy #3** of security tool series (sibling = mcp-guard #1 + sbom-pilot #2)
- 完成時 narrative = 「local-first defensive security trilogy for individual developers / SMB」
- channel B (leagames0221-sys / `tomohiro takada`、 framing = 「AI 開発者 / フルスタックエンジニア」)
