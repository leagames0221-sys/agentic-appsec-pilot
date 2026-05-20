# activeContext.md — agentic-appsec-pilot

> Session 連絡帳 (Cline 5-file pattern)。 PJ 固有 active context の SSoT。 各 session 末尾で next session 向け literal 更新義務。

## Current stage

**Phase α writer self-verify clean, awaiting user-explicit PUBLIC flip gate** (2026-05-21)

- ✅ Stage 1-8 complete (Foundation + IR + STRIDE-GPT decomposed + LLM providers + vuln-identify + patch-suggest + emitters + CLI + CI + ADR 0001-0008 + benchmark)
- ✅ Phase α writer self-verify: 7/7 PASS post-fix on commit `92dfc85` ([`docs/verify/phase-alpha-round-1-self-verify.md`](../../docs/verify/phase-alpha-round-1-self-verify.md))
- ✅ Doc-vs-code drift cleanup commit (README Status section, Stage numbering, spec.md File structure plan, cosign/SLSA claim honest disclose) — see latest commit
- ⏳ User-explicit PUBLIC flip gate per ADR-0006 C6 — pending
- Phase β = `agentic-appsec-exploit-lab` 別 repo に分離 (cosign verify-blob + SLSA L2 attestation + exploit sandbox を そちらで実装)

## Verification path (sealed-state default)

Reviewer subagent (tier-reviewer / inspector) は user 直命で 2026-05-21 完全封印。 verification は **writer AI 自身が rubric file Read + binary criteria literal apply + evidence path citation + 「?」 honesty marker** で 実施するのが default。

## Next session resume (cold start protocol)

1. cwd = `C:\Users\admin\Projects\agentic-appsec-pilot\`
2. Read: `CLAUDE.md` + `docs/spec.md` + `docs/verify/phase-alpha-round-1-self-verify.md` + 本 file
3. Re-verify no regression: `pnpm run test:coverage` + `pnpm run lint:deps` + `pnpm audit --audit-level=high`
4. If commits 入っていたら writer self-verify を再実行 (rubric C1-C7 を literal apply + evidence path citation)
5. user 「PUBLIC flip OK」 明示時のみ `gh repo edit ... --visibility public` で flip 実施 (writer 自己昇格禁止)

## Critical context

- **calendar deadline なし** (quality-gate ベース)
- **PRIVATE repo** until user explicit PUBLIC flip gate
- **security tool trilogy #3** (sibling tools = mcp-guard + sbom-pilot)
- **5-axis wedge** narrative literal SSoT = `docs/adr/0001-prior-art-audit.md`
- **Phase β** = `agentic-appsec-exploit-lab` 別 repo (Phase α 完了後 単独 ship、 cosign/SLSA はそちらで実装)

## Known Phase α scope limits (honest disclosure)

- CLI entrypoint integration tests は Phase β scope (現状 cli/*.ts coverage 5-10%、 schema/correlator/prompts 等 logic は 64/64 test で覆われている)
- cosign verify-blob + SLSA L2 attestation は Phase β scope (Phase α は SARIF + VEX emit まで)
- `src/util/` 配下 (credential-scrub / ansi-strip / cosign wrapper) は Phase β scope (Phase α 不要 = scope hygiene)
