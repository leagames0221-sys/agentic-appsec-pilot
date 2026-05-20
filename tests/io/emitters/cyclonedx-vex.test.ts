/**
 * CycloneDX VEX emitter tests.
 */
import { describe, it, expect } from 'vitest';
import { buildVexDocument } from '../../../src/io/emitters/cyclonedx-vex.js';
import type { Finding } from '../../../src/ir/types.js';

function makeFinding(over: Partial<Finding> = {}): Finding {
  return {
    schemaVersion: '1.0.0',
    id: 'F-001',
    ruleId: 'CVE-2024-12345',
    severity: 'high',
    confidence: '★★★',
    probability: 0.9,
    evidenceTrail: [{ type: 'advisory', citation: 'osv.dev/...', capturedAt: '2026-05-20T12:00:00Z' }],
    sourceUrlLine: 'package-lock.json:1',
    message: 'Critical vulnerability in dependency',
    sarifLocation: { artifactLocation: { uri: 'package-lock.json' }, region: { startLine: 1 } },
    ...over,
  };
}

describe('CycloneDX VEX emitter', () => {
  it('produces valid CycloneDX 1.6 document shape', () => {
    const doc = buildVexDocument([makeFinding()], {
      timestamp: '2026-05-20T12:00:00Z',
      serialNumber: 'urn:uuid:test-001',
    });
    expect(doc.bomFormat).toBe('CycloneDX');
    expect(doc.specVersion).toBe('1.6');
    expect(doc.serialNumber).toBe('urn:uuid:test-001');
    expect(doc.vulnerabilities.length).toBe(1);
  });

  it('maps confidence to analysis.state', () => {
    const docHigh = buildVexDocument([makeFinding({ confidence: '★★★' })]);
    expect(docHigh.vulnerabilities[0]?.analysis.state).toBe('exploitable');

    const docMed = buildVexDocument([makeFinding({ confidence: '★★' })]);
    expect(docMed.vulnerabilities[0]?.analysis.state).toBe('exploitable');

    const docLow = buildVexDocument([makeFinding({ confidence: '★' })]);
    expect(docLow.vulnerabilities[0]?.analysis.state).toBe('in_triage');

    const docUnk = buildVexDocument([makeFinding({ confidence: '?' })]);
    expect(docUnk.vulnerabilities[0]?.analysis.state).toBe('not_affected');
  });

  it('derives source from ruleId pattern', () => {
    const cve = buildVexDocument([makeFinding({ ruleId: 'CVE-2024-99999' })]);
    expect(cve.vulnerabilities[0]?.source?.name).toBe('NVD');
    expect(cve.vulnerabilities[0]?.source?.url).toContain('nvd.nist.gov');

    const ghsa = buildVexDocument([makeFinding({ ruleId: 'GHSA-abcd-1234-efgh' })]);
    expect(ghsa.vulnerabilities[0]?.source?.name).toBe('GHSA');

    const bandit = buildVexDocument([makeFinding({ ruleId: 'B301' })]);
    expect(bandit.vulnerabilities[0]?.source?.name).toBe('Bandit');
  });
});
