/**
 * Stage 2 parser tests — AC-002-1 / AC-002-3.
 * Tests the pure-function parsers without spawning external CLIs.
 */
import { describe, it, expect } from 'vitest';
import { parseOpengrepResult } from '../../../src/stages/vuln-identify/opengrep-wrap.js';
import { parseBanditResult } from '../../../src/stages/vuln-identify/bandit-wrap.js';
import { parseOsvResult } from '../../../src/stages/vuln-identify/osv-scanner-wrap.js';
import { findingSchema } from '../../../src/ir/schema.js';

describe('parseOpengrepResult', () => {
  it('AC-002-3: parses a valid OpenGrep result to Finding shape', () => {
    const raw = {
      check_id: 'javascript.lang.security.audit.xss.reflected-input',
      path: 'src/handlers/profile.js',
      start: { line: 42, col: 3 },
      end: { line: 42, col: 58 },
      extra: {
        message: 'Reflected XSS: req.query.name embedded in HTML',
        severity: 'ERROR',
      },
    };
    const findings = parseOpengrepResult(raw);
    expect(findings.length).toBe(1);
    const f = findings[0]!;
    expect(f.ruleId).toBe('javascript.lang.security.audit.xss.reflected-input');
    expect(f.severity).toBe('high'); // ERROR -> high
    expect(f.confidence).toBe('★★');
    expect(f.sarifLocation.region.startLine).toBe(42);
    expect(f.evidenceTrail[0]?.type).toBe('pattern');
    expect(() => findingSchema.parse(f)).not.toThrow();
  });

  it('rejects malformed entries (missing check_id)', () => {
    const findings = parseOpengrepResult({ path: 'x.js', start: { line: 1 } });
    expect(findings).toEqual([]);
  });
});

describe('parseBanditResult', () => {
  it('AC-002-3: parses a valid Bandit result with HIGH confidence', () => {
    const raw = {
      filename: 'app/views.py',
      line_number: 23,
      line_range: [23, 24],
      test_id: 'B301',
      test_name: 'blacklist_calls',
      issue_severity: 'HIGH',
      issue_confidence: 'HIGH',
      issue_text: 'Use of unsafe yaml.load detected.',
      issue_cwe: { id: 502, link: 'https://cwe.mitre.org/data/definitions/502.html' },
    };
    const findings = parseBanditResult(raw);
    expect(findings.length).toBe(1);
    const f = findings[0]!;
    expect(f.ruleId).toBe('B301');
    expect(f.severity).toBe('high');
    expect(f.confidence).toBe('★★★');
    expect(f.evidenceTrail.length).toBe(2); // pattern + advisory (CWE link)
    expect(f.evidenceTrail[1]?.type).toBe('advisory');
    expect(() => findingSchema.parse(f)).not.toThrow();
  });

  it('maps MEDIUM/LOW confidence to ★★/★', () => {
    const med = parseBanditResult({
      filename: 'x.py', line_number: 1, test_id: 'B101',
      issue_severity: 'MEDIUM', issue_confidence: 'MEDIUM',
      issue_text: 'medium',
    })[0]!;
    const low = parseBanditResult({
      filename: 'x.py', line_number: 2, test_id: 'B102',
      issue_severity: 'LOW', issue_confidence: 'LOW',
      issue_text: 'low',
    })[0]!;
    expect(med.confidence).toBe('★★');
    expect(low.confidence).toBe('★');
  });
});

describe('parseOsvResult', () => {
  it('AC-002-3: parses OSV-Scanner result with vulnerabilities', () => {
    const raw = {
      source: { path: 'package-lock.json', type: 'lockfile' },
      packages: [
        {
          package: { name: 'lodash', version: '4.17.20', ecosystem: 'npm' },
          vulnerabilities: [
            {
              id: 'GHSA-35jh-r3h4-6jhm',
              summary: 'Command Injection in lodash',
              aliases: ['CVE-2021-23337'],
              database_specific: { severity: 'HIGH' },
            },
          ],
        },
      ],
    };
    const findings = parseOsvResult(raw);
    expect(findings.length).toBe(1);
    const f = findings[0]!;
    expect(f.ruleId).toBe('GHSA-35jh-r3h4-6jhm');
    expect(f.severity).toBe('high');
    expect(f.confidence).toBe('★★★');
    expect(f.evidenceTrail[0]?.type).toBe('advisory');
    expect(f.evidenceTrail[0]?.citation).toContain('osv.dev/vulnerability/GHSA');
    expect(() => findingSchema.parse(f)).not.toThrow();
  });

  it('handles result with empty packages array', () => {
    const findings = parseOsvResult({ source: { path: 'x.lock', type: 'lockfile' }, packages: [] });
    expect(findings).toEqual([]);
  });
});
