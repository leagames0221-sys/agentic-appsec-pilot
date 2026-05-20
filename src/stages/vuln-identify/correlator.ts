/**
 * Finding correlator — dedup across SAST / SCA sources.
 *
 * Spec mapping: AC-002-2 (dedup via (artifactLocation.uri, region.startLine,
 * ruleId) triple).
 *
 * Strategy:
 *   1. Group findings by (uri, startLine, ruleId) triple
 *   2. For each group, merge evidence trails (preserve all citations)
 *   3. Keep the highest confidence + corresponding probability
 *   4. Keep the highest severity (critical > high > medium > low > info)
 */

import type { Finding, Confidence, Severity } from '../../ir/types.js';

const severityRank: Record<Severity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

const confidenceRank: Record<Confidence, number> = {
  '★★★': 3,
  '★★': 2,
  '★': 1,
  '?': 0,
};

function triple(f: Finding): string {
  return `${f.sarifLocation.artifactLocation.uri}::${f.sarifLocation.region.startLine}::${f.ruleId}`;
}

function pickHigherSeverity(a: Severity, b: Severity): Severity {
  return severityRank[a] >= severityRank[b] ? a : b;
}

function pickHigherConfidence(a: Confidence, b: Confidence): Confidence {
  return confidenceRank[a] >= confidenceRank[b] ? a : b;
}

/**
 * Merges findings from multiple sources. Returns deduped list where each
 * (uri, startLine, ruleId) triple appears at most once with merged
 * evidence_trail. Preserves the highest confidence + probability +
 * severity. First-seen `id` is kept (random uuid).
 */
export function correlate(findings: Finding[]): Finding[] {
  const byTriple = new Map<string, Finding>();
  for (const f of findings) {
    const key = triple(f);
    const existing = byTriple.get(key);
    if (existing === undefined) {
      byTriple.set(key, { ...f, evidenceTrail: [...f.evidenceTrail] });
      continue;
    }
    const mergedConfidence = pickHigherConfidence(existing.confidence, f.confidence);
    const mergedSeverity = pickHigherSeverity(existing.severity, f.severity);
    // probability: max of the two (more evidence → higher confidence)
    const mergedProbability = Math.max(existing.probability, f.probability);
    byTriple.set(key, {
      ...existing,
      severity: mergedSeverity,
      confidence: mergedConfidence,
      probability: mergedProbability,
      evidenceTrail: [...existing.evidenceTrail, ...f.evidenceTrail],
    });
  }
  return Array.from(byTriple.values());
}
