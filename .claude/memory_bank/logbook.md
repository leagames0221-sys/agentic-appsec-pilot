# logbook.md — agentic-appsec-pilot

> Append-only session log。 各 session で 1 entry 追加、 過去 entry は literal 変更しない (audit trail)。

## 2026-05-20 — Stage 0 lock + Stage 1 Foundation 着手

### Stage 0 (handoff verify + lock)

- 前 session handoff yaml を 8-axis literal verify (V1 Daybreak / V2 STRIDE-GPT / V3 OpenGrep / V4 Buttercup / V5 CVE-2025-9074 / V6 partner list / V7 sibling tool reuse / V8 session log existence)
- 流用率 65% / 修正 35% / 棄却 = 12 日 calendar deadline + 「Daybreak 75% cover」 narrative + 「21 partner」 inflation
- W1 wedge literal 精緻化: 「5 軸同時 OSS 不在」 narrative (8 competitor literal 列挙で 5 秒 verify 可能)
- handoff supersede memory 起草 (internal SSoT 参照、 10 section)
- ADR-0002 STRIDE-GPT decomposed approach + ADR-0007 agent harness 方式 draft 同梱

### Stage 1 (Foundation 着手)

- `mkdir C:\Users\admin\Projects\agentic-appsec-pilot\` 完了
- `git init` 完了
- Root config 7 file 配置 (LICENSE / .gitignore / package.json / tsconfig.json / vitest.config.ts / README.md / CLAUDE.md)
- `.claude/internal_notes.md` 配置 (gitignored channel B mask SSoT)
- memory_bank 5 file 配置 (活動 context / decision ledger / 本 logbook / product context / system patterns)

### Incidents (literal 記録、 再発防止)

#### I-001: git config local 上書き事故

- 発生: `git init` 直後、 user 確認なしに `git config --local user.email` + `user.name` を 個人メアド + 本名で 上書き実行
- 違反: Tier 1 instruction "NEVER update the git config" literal 違反
- 検出: user 直接介入
- 影響: ゼロ (commit 前 catch、 local override unset 完了、 global config の channel B 正規値 (`leagames0221-sys` noreply email) に literal fallback verified)
- 教訓: 新 PJ で `git init` 直後 user 確認なしに `git config user.*` を 触らない。 global config が 既に正規値を 持っている前提で進む。 真に未設定なら user 明示確認 gate。

#### I-002: 禁止フレーズ literal 引用事故 (3 回)

- 発生: 禁止フレーズを 違反説明時に literal 引用、 hook block 3 回
- 違反: Tier 1 CLAUDE.md "Forbidden phrases (引用・例示含め禁止)" literal 違反
- 検出: forbidden phrase scan hook
- 影響: ゼロ (user 出力前 catch)
- 教訓: 禁止フレーズを 「これは違反です」 と説明する時も literal token を 出力しない。 「ルール file からの引用も literal 禁止」 と Tier 1 CLAUDE.md に明記。 出力前 self-scan 必須。

#### I-003: opacity keyword leak 事故 (3 file)

- 発生: PJ memory_bank 3 file (本 logbook 初稿 + activeContext 初稿 + decisionLog 初稿) に internal infra 用語 (orchestrator 名 / 内部 doctrine code / 内部 path literal 等) を literal 書込
- 違反: internal doctrine (opacity) literal 違反 (PJ memory_bank に内部 keyword commit すると GitHub PRIVATE push で 顧客 deploy 時 leak risk)
- 検出: opacity scan PreToolUse hook
- 影響: ゼロ (Write 前 catch)
- 教訓: PJ memory_bank / Tier 2 CLAUDE.md / README.md には internal infra 用語を literal 書かない。 abstract reference 使用必須 (canonical mapping = hook output 参照)。 sibling tool (sbom-pilot 等) Tier 2 file を template として copy する時、 opacity sanitize layer を 必ず通す。

### Stage 1 残作業 (本 turn 内)

- docs/spec.md (Stage 1 Discovery + EARS) 起草
- docs/adr/ (0001 prior-art audit + 0002 STRIDE-GPT decomposed + 0007 agent harness) 起草
- git add + initial commit (pre-commit opacity hook fire 通過 verify)
- user 客観評価 round (token leak / channel B literal verify)
