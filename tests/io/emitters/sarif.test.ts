/**
 * SARIF emitter tests — AC-002-1, AC-005-1..5.
 */
import { describe, it, expect } from 'vitest';
import { buildSarifLog, severityToSarifLevel, pathToSarifUri } from '../../../src/io/emitters/sarif.js';
import type { Finding } from '../../../src/ir/types.js';

function makeFinding(over: Partial<Finding> = {}): Finding {
  return {
    schemaVersion: '1.0.0',
    id: 'F-001',
    ruleId: 'javascript.xss',
    severity: 'high',
    confidence: '★★★',
    probability: 0.92,
    evidenceTrail: [
      { type: 'pattern', citation: 'src/x.js:10', capturedAt: '2026-05-20T12:00:00Z' },
    ],
    sourceUrlLine: 'src/x.js:10',
    message: 'Reflected XSS detected',
    sarifLocation: { artifactLocation: { uri: 'src/x.js' }, region: { startLine: 10, startColumn: 3 } },
    ...over,
  };
}

describe('SARIF emitter', () => {
  it('AC-002-1: produces SARIF 2.1.0 with $schema + version', () => {
    const log = buildSarifLog([makeFinding()]);
    expect(log.version).toBe('2.1.0');
    expect(log.$schema).toContain('sarif-2.1.0');
    expect(log.runs.length).toBe(1);
    expect(log.runs[0]?.tool.driver.name).toBe('agentic-appsec-pilot');
  });

  it('AC-005-1: result.properties.confidence is ★★★/★★/★/? literal', () => {
    const log = buildSarifLog([makeFinding({ confidence: '★★' })]);
    expect(log.runs[0]?.results[0]?.properties?.['confidence']).toBe('★★');
  });

  it('AC-005-2: result.properties.probability is number 0.0-1.0', () => {
    const log = buildSarifLog([makeFinding({ probability: 0.42 })]);
    const prob = log.runs[0]?.results[0]?.properties?.['probability'];
    expect(typeof prob).toBe('number');
    expect(prob as number).toBeGreaterThanOrEqual(0);
    expect(prob as number).toBeLessThanOrEqual(1);
  });

  it('AC-005-3: result.properties.evidenceTrail is array with >=1 entry', () => {
    const log = buildSarifLog([makeFinding()]);
    const trail = log.runs[0]?.results[0]?.properties?.['evidenceTrail'];
    expect(Array.isArray(trail)).toBe(true);
    expect((trail as unknown[]).length).toBeGreaterThanOrEqual(1);
  });

  it('rules array dedupes by ruleId with stable index', () => {
    const findings = [
      makeFinding({ id: 'F-a', ruleId: 'rule-1' }),
      makeFinding({ id: 'F-b', ruleId: 'rule-1' }), // same rule
      makeFinding({ id: 'F-c', ruleId: 'rule-2' }),
    ];
    const log = buildSarifLog(findings);
    expect(log.runs[0]?.tool.driver.rules.length).toBe(2);
    expect(log.runs[0]?.results[0]?.ruleIndex).toBe(0);
    expect(log.runs[0]?.results[1]?.ruleIndex).toBe(0);
    expect(log.runs[0]?.results[2]?.ruleIndex).toBe(1);
  });

  it('severity maps to SARIF level', () => {
    expect(severityToSarifLevel('critical')).toBe('error');
    expect(severityToSarifLevel('high')).toBe('error');
    expect(severityToSarifLevel('medium')).toBe('warning');
    expect(severityToSarifLevel('low')).toBe('note');
    expect(severityToSarifLevel('info')).toBe('none');
  });

  it('pathToSarifUri converts Windows backslash to forward slash', () => {
    expect(pathToSarifUri('src\\handlers\\x.js')).toBe('src/handlers/x.js');
  });
});
