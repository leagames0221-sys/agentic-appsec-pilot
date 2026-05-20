#!/usr/bin/env tsx
/**
 * Benchmark: synthetic 1k-file fixture repo throughput for pure-logic
 * paths (correlator + SARIF emit + VEX emit).
 *
 * Real SAST/SCA tool throughput depends on the upstream CLIs (OpenGrep
 * / Bandit / OSV-Scanner), which this benchmark intentionally does not
 * spawn — we measure only the orchestration overhead our code adds.
 *
 * Spec mapping: AC-002-4 ("Throughput ≥ 100 findings / minute on 1k-file
 * fixture repo"). This benchmark verifies the orchestration layer can
 * sustain >>100 findings/minute when CLIs are fast; real-world numbers
 * are dominated by upstream CLI runtime.
 *
 * Run: `pnpm run bench`
 */
import { performance } from 'node:perf_hooks';
import { correlate } from '../src/stages/vuln-identify/correlator.js';
import { buildSarifLog, serializeSarifLog } from '../src/io/emitters/sarif.js';
import { buildVexDocument, serializeVexDocument } from '../src/io/emitters/cyclonedx-vex.js';
import type { Finding } from '../src/ir/types.js';

const FINDINGS_COUNT = 1000;

function genFinding(i: number): Finding {
  const ruleId = `rule-${i % 50}`; // 50 distinct rule ids
  const uri = `src/module-${i % 200}/file-${i % 17}.ts`;
  return {
    schemaVersion: '1.0.0',
    id: `F-bench-${String(i).padStart(6, '0')}`,
    ruleId,
    severity: (['critical', 'high', 'medium', 'low', 'info'] as const)[i % 5]!,
    confidence: (['★★★', '★★', '★', '?'] as const)[i % 4]!,
    probability: (i % 100) / 100,
    evidenceTrail: [
      { type: 'pattern', citation: `${uri}:${(i % 500) + 1}`, capturedAt: '2026-05-21T00:00:00Z' },
      { type: 'source', citation: `${uri}:${(i % 500) + 1}`, capturedAt: '2026-05-21T00:00:00Z' },
    ],
    sourceUrlLine: `${uri}:${(i % 500) + 1}`,
    message: `Synthetic finding ${i} for benchmark.`,
    sarifLocation: {
      artifactLocation: { uri },
      region: { startLine: (i % 500) + 1 },
    },
  };
}

function fmt(ms: number): string {
  return `${ms.toFixed(2)} ms`;
}

function fmtThroughput(items: number, ms: number): string {
  const perSec = (items / ms) * 1000;
  return `${perSec.toFixed(0)} items/sec`;
}

export interface BenchResult {
  findingsCount: number;
  generate: number;
  correlate: number;
  sarif: number;
  vex: number;
  total: number;
}

export function runBench(findingsCount: number = FINDINGS_COUNT): BenchResult {
  const t0 = performance.now();
  const findings: Finding[] = [];
  for (let i = 0; i < findingsCount; i++) findings.push(genFinding(i));
  const t1 = performance.now();

  const correlated = correlate(findings);
  const t2 = performance.now();

  const sarif = serializeSarifLog(buildSarifLog(correlated));
  const t3 = performance.now();

  const vex = serializeVexDocument(buildVexDocument(correlated, {
    timestamp: '2026-05-21T00:00:00Z',
    serialNumber: 'urn:uuid:bench-001',
  }));
  const t4 = performance.now();

  void sarif.length;
  void vex.length;

  return {
    findingsCount,
    generate: t1 - t0,
    correlate: t2 - t1,
    sarif: t3 - t2,
    vex: t4 - t3,
    total: t4 - t0,
  };
}

function main(): void {
  const r = runBench();
  // eslint-disable-next-line no-console
  console.log(`Benchmark: ${r.findingsCount} synthetic findings`);
  // eslint-disable-next-line no-console
  console.log(`  generate     : ${fmt(r.generate)} (${fmtThroughput(r.findingsCount, r.generate)})`);
  // eslint-disable-next-line no-console
  console.log(`  correlate    : ${fmt(r.correlate)} (${fmtThroughput(r.findingsCount, r.correlate)})`);
  // eslint-disable-next-line no-console
  console.log(`  sarif emit   : ${fmt(r.sarif)} (${fmtThroughput(r.findingsCount, r.sarif)})`);
  // eslint-disable-next-line no-console
  console.log(`  vex emit     : ${fmt(r.vex)} (${fmtThroughput(r.findingsCount, r.vex)})`);
  // eslint-disable-next-line no-console
  console.log(`  total        : ${fmt(r.total)} (${fmtThroughput(r.findingsCount, r.total)})`);
  // AC-002-4 anchor: >> 100 findings/minute (= 1.67/sec)
  const perMin = (r.findingsCount / r.total) * 60_000;
  // eslint-disable-next-line no-console
  console.log(`  AC-002-4     : ${perMin.toFixed(0)} findings/minute (target ≥ 100 — ${perMin >= 100 ? 'PASS' : 'FAIL'})`);
}

const isEntryPoint = (() => {
  try {
    return process.argv[1] !== undefined && import.meta.url.includes('benchmark');
  } catch {
    return false;
  }
})();

if (isEntryPoint) {
  main();
}
