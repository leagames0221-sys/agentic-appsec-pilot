# activeContext.md — agentic-appsec-pilot

> Session 連絡帳 (Cline 5-file pattern)。 PJ 固有 active context の SSoT。 各 session 末尾で next session 向け literal 更新義務。

## Current stage

**Stage 9: Round 1 self-audit clean, independent CONFIRM PENDING** (2026-05-21 pause)

- ✅ Stage 1-8 complete (Foundation + IR + STRIDE-GPT decomposed + LLM providers + vuln-identify + patch-suggest + emitters + CLI + CI + ADR + benchmark)
- ✅ Stage 9 Round 1 writer self-audit: 7/7 PASS at commit `ee6d41f`
- ⏸ Stage 9 independent reviewer (tier-reviewer subagent) BLOCKED on API 529 Overloaded x3 on 2026-05-21
- ⏳ Stage 9 resume = retry tier-reviewer subagent on service recovery (see `docs/verify/round-1-self-audit.md` §Resume protocol)
- ⏳ Stage 10 ★★★ verdict gate = independent 2-round CONFIRM
- ⏳ Stage 11 PUBLIC flip = user explicit promotion gate per ADR-0006 C6

## Next session resume (cold start protocol)

1. cwd = `C:\Users\admin\Projects\agentic-appsec-pilot\`
2. Read: `CLAUDE.md` + `docs/spec.md` + `docs/verify/round-1-self-audit.md` + 本 file
3. Re-verify no regression: `pnpm run test:coverage` + `pnpm run lint:deps` + `pnpm audit --audit-level=high`
4. Invoke `tier-reviewer` subagent with rubric path `docs/verify/phase-alpha-rubric.md` + anchor commit (current HEAD)
5. If service recovered: Round 1 → Writer self-audit → Round 2 → user verdict report
6. If service still 529: pause again + try next session

## Critical context

- **calendar deadline なし** (quality-gate ベース、 前 AI session の 12 日 deadline は literal 棄却)
- **PRIVATE repo** until ★★★ verdict gate + user explicit promotion
- **security tool trilogy #3** (sibling tools = mcp-guard + sbom-pilot)
- **5-axis wedge** narrative literal SSoT = `docs/adr/0001-prior-art-audit.md`
- **Phase β** = `agentic-appsec-exploit-lab` 別 repo (Phase α 完了後 単独 ship)

## Open questions (Stage 2 着手時 user 確認)

- IR section の C2 「LLM enrich」 仕様 = (a) false-positive triage + (b) severity re-rank + (c) exploit context 説明 の 3 機能で literal 確定 OK か
- IR section の C3 「finding correlator」 dedup = file:line 同一性 + rule_id mapping table approach で literal 確定 OK か
- C5 「patch validation」 = (a) re-scan ★★★ + (c) syntax check ★★ 二段検証で literal 確定 OK か
