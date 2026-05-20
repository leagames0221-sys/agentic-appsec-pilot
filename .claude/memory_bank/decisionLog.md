# decisionLog.md — agentic-appsec-pilot

> 設計判断の literal SSoT (ADR short-form ledger)。 詳細 rationale は `docs/adr/NNNN-*.md`。

## 2026-05-20 — D001: Phase α scope = Stage ① + ② + ④ (Stage ③ exploit sandbox は Phase β 別 repo)

- Decision: Stage ③ exploit sandbox を `agentic-appsec-exploit-lab` 別 repo として Phase α 完了後 単独 ship
- Rationale: kernel-share 問題 (WSL2 + Podman = single shared Linux kernel) の構造的解消、 4-round ping-pong 構造的解消 (root cause = scope creep)
- Status: Accepted
- Reference: handoff supersede memory §1 (internal SSoT 参照)

## 2026-05-20 — D002: Stack = TypeScript + Node 20 LTS + pnpm + vitest + Ollama default

- Decision: TS + Node 20 LTS、 sibling tool (mcp-guard / sbom-pilot) trilogy 整合
- Rationale: 既存 sibling tool reuse ~60% (合計 20 file literal copy 可)、 stack 学習 cost ゼロ
- Status: Accepted
- Reference: ADR-0001 §stack-selection

## 2026-05-20 — D003: STRIDE-GPT = decomposed prior art approach (直接 Python wrap せず)

- Decision: STRIDE prompt + OWASP LLM/ASI mapping + DREAD schema を TS に literal 移植、 Python + Streamlit dep 引込まず
- Rationale: TS/Node 20 PJ への Python + Streamlit dep は architectural mismatch、 5 軸 wedge の local-first narrative も汚染
- Status: Accepted
- Reference: ADR-0002

## 2026-05-20 — D004: Agent harness = Ollama default + optional `claude-code` CLI spawn

- Decision: Anthropic API direct call 禁止、 Ollama default + 任意で claude-code CLI invoke (--use-claude-code flag)
- Rationale: $0 月公約 literal 順守、 internal doctrine (local-first wrangler) 順守、 paid-API 6-layer defense 維持
- Status: Accepted
- Reference: ADR-0007

## 2026-05-20 — D005: SCA tool = OSV-Scanner (Trivy 不採用)

- Decision: OSV-Scanner literal 統一 (sibling tool sbom-pilot reuse 最大化)
- Rationale: sibling tool で OSV severity ranking + OSV ID 既統一済、 trilogy 整合
- Status: Accepted
- Reference: ADR-0003 (Stage 2 で起草)

## 2026-05-20 — D006: Confidence schema = SARIF 2.1.0 propertyBag extension (spec 拡張ではない)

- Decision: SARIF 2.1.0 標準 spec 内の propertyBag に confidence + probability + evidence_trail を literal embed
- Rationale: SARIF spec 改変ではなく既存 extension 機構の使用、 商談で 「spec 拡張」 主張すると literal 嘘になるため narrative 厳密化
- Status: Accepted
- Reference: ADR-0005 (Stage 2 で起草)

## 2026-05-20 — D007: 12 日 calendar deadline 棄却 + quality-gate ベース進行

- Decision: 前 AI session の 「12 日 ship (5/20 → 6/1)」 deadline は literal 棄却、 各 stage の quality gate (test PASS + reviewer CONFIRM 等) で進行
- Rationale: deadline は前 AI 捏造、 user 要件ではない。 17-26 work-day 目安 (calendar 拘束なし)
- Status: Accepted
- Reference: handoff supersede memory §1

## 2026-05-20 — D008: PUBLIC flip gate = ★★★ verdict + user explicit promotion (AI 自己昇格禁止)

- Decision: independent reviewer fresh-context 2-round CONFIRM (+ user 判断で 3 round 拡張可) + user explicit promotion gate
- Rationale: sibling tool sbom-pilot pattern literal 順守、 closure-bias detection 適用
- Status: Accepted
- Reference: ADR-0006 (Stage 8 で起草)
