# activeContext.md — agentic-appsec-pilot

> Session 連絡帳 (Cline 5-file pattern)。 PJ 固有 active context の SSoT。 各 session 末尾で next session 向け literal 更新義務。

## Current stage

**Stage 1: Foundation** (in progress、 2026-05-20 着手)

- ✅ Stage 0 lock complete (handoff supersede 起草 + W1 5-axis wedge narrative literal 精緻化 + ADR-0002 / ADR-0007 draft、 詳細 = internal SSoT 参照)
- 🔄 Stage 1: directory + git init + 配置 + opacity hook fire test + user 客観評価 round
- ⏳ Stage 2: IR design (threat-model + finding + evidence-trail schema)

## Next session resume (cold start protocol)

1. cwd = `C:\Users\admin\Projects\agentic-appsec-pilot\`
2. Read: `CLAUDE.md` + `docs/spec.md` + 本 file
3. Read Stage 0 lock SSoT = internal SSoT 参照 (handoff supersede memory、 2026-05-20)
4. user 確認 = Stage 2 IR design 着手 OK か

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
