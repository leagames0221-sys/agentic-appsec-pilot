#!/usr/bin/env node
// Mock-provider end-to-end smoke for clone-fresh reviewers.
// Proves: dist/ build works, CLI dispatch works, threat-model + scan
// emit well-formed JSON / SARIF 2.1.0 — without LLM calls, network
// egress, or external SAST tools (opengrep / bandit / osv-scanner).
//
// Run: pnpm run smoke:mock

import { spawnSync } from "node:child_process";
import { readFileSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const tmpDir = join(repoRoot, "_scratch", "smoke-mock");
const cli = join(repoRoot, "dist", "cli", "index.js");

rmSync(tmpDir, { recursive: true, force: true });
mkdirSync(tmpDir, { recursive: true });

let failed = 0;
function run(args, label) {
  const res = spawnSync(process.execPath, [cli, ...args], {
    cwd: tmpDir,
    encoding: "utf8",
  });
  if (res.status !== 0) {
    console.error(`[FAIL] ${label} exit=${res.status}`);
    if (res.stderr) console.error(res.stderr);
    failed += 1;
    return null;
  }
  console.log(`[PASS] ${label}`);
  return res;
}

run(["--help"], "agentic-appsec --help");

const tmOut = join(tmpDir, "threat-model.json");
if (run(
  ["threat-model", repoRoot, "--provider", "mock", "--output", tmOut],
  "threat-model --provider mock",
)) {
  const tm = JSON.parse(readFileSync(tmOut, "utf8"));
  if (!tm.schemaVersion || !Array.isArray(tm.threats)) {
    console.error("[FAIL] threat-model JSON shape invalid (need schemaVersion + threats[])");
    failed += 1;
  } else {
    console.log("[PASS] threat-model JSON shape (schemaVersion + threats[])");
  }
}

const sarifOut = join(tmpDir, "findings.sarif");
if (run(
  ["scan", repoRoot, "--provider", "mock", "--output", sarifOut],
  "scan --provider mock",
)) {
  const sarif = JSON.parse(readFileSync(sarifOut, "utf8"));
  if (sarif.version !== "2.1.0" || !Array.isArray(sarif.runs)) {
    console.error("[FAIL] SARIF shape invalid (need version=2.1.0 + runs[])");
    failed += 1;
  } else {
    console.log("[PASS] SARIF 2.1.0 shape (version + runs[])");
  }
}

if (failed > 0) {
  console.error(`\nmock smoke FAILED (${failed} check(s))`);
  process.exit(1);
}
console.log("\nmock smoke OK — clone-fresh quickstart proven without LLM or external SAST tools.");
