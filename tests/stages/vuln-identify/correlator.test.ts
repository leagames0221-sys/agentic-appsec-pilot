/**
 * Correlator tests — AC-002-2 (dedup via (uri, startLine, ruleId)).
 */
import { describe, it, expect } from 'vitest';
import { correlate } from '../../../src/stages/vuln-identify/correlator.js';
import type { Finding } from '../../../src/ir/types.js';

function makeFinding(
  id: string,
  uri: string,
  startLine: number,
  ruleId: string,
  severity: Finding['severity'],
  confidence: Finding['confidence'],
  probability: number,
): Finding {
  return {
    schemaVersion: '1.0.0',
    id,
    ruleId,
    severity,
    confidence,
    probability,
    evidenceTrail: [
      { type: 'pattern', citation: `${uri}:${startLine}`, capturedAt: '2026-05-20T12:00:00Z' },
    ],
    sourceUrlLine: `${uri}:${startLine}`,
    message: `Sample finding ${id}`,
    sarifLocation: { artifactLocation: { uri }, region: { startLine } },
  };
}

describe('correlate', () => {
  it('AC-002-2: deduplicates findings with same (uri, startLine, ruleId)', () => {
    const findings = [
      makeFinding('a', 'src/x.js', 10, 'rule-1', 'medium', '★★', 0.7),
      makeFinding('b', 'src/x.js', 10, 'rule-1', 'high', '★★★', 0.92),
      makeFinding('c', 'src/x.js', 11, 'rule-1', 'low', '★', 0.5), // different line, keep
    ];
    const out = correlate(findings);
    expect(out.length).toBe(2);
    const merged = out.find((f) => f.sarifLocation.region.startLine === 10)!;
    expect(merged.confidence).toBe('★★★'); // highest
    expect(merged.severity).toBe('high'); // highest
    expect(merged.probability).toBe(0.92); // max
    expect(merged.evidenceTrail.length).toBe(2); // merged
  });

  it('preserves findings with different ruleId at same location', () => {
    const findings = [
      makeFinding('a', 'src/x.js', 10, 'rule-1', 'low', '★', 0.5),
      makeFinding('b', 'src/x.js', 10, 'rule-2', 'low', '★', 0.5),
    ];
    const out = correlate(findings);
    expect(out.length).toBe(2);
  });

  it('returns empty for empty input', () => {
    expect(correlate([])).toEqual([]);
  });
});
