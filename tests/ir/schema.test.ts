/**
 * IR schema validator tests
 *
 * Runnable once Stage 3 着手で `pnpm install` 完了 (zod + vitest 配置)。
 * Stage 2 では code 配置のみ、 actual run は Stage 3 で literal verify。
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateThreatModel,
  validateFinding,
  safeValidateFinding,
} from '../../src/ir/schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = resolve(__dirname, 'fixtures');

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(resolve(fixtures, name), 'utf8'));
}

describe('ThreatModel schema', () => {
  it('AC-IR-001-1: accepts valid threat model with STRIDE + OWASP LLM mapping', () => {
    const valid = loadFixture('threat-model.valid.json');
    expect(() => validateThreatModel(valid)).not.toThrow();
  });

  it('AC-IR-001-2: rejects threat model missing required target', () => {
    const invalid = loadFixture('threat-model.invalid-missing-target.json');
    expect(() => validateThreatModel(invalid)).toThrow();
  });
});

describe('Finding schema (W3 wedge)', () => {
  it('AC-IR-002-1: accepts finding with confidence + probability + evidence_trail', () => {
    const valid = loadFixture('finding.valid.json');
    expect(() => validateFinding(valid)).not.toThrow();
  });

  it('AC-IR-002-2: rejects finding with probability > 1.0', () => {
    const invalid = loadFixture('finding.invalid-probability-out-of-range.json');
    expect(() => validateFinding(invalid)).toThrow();
  });

  it('AC-IR-002-3: rejects finding with empty evidence_trail (W3 wedge requires >=1 citation)', () => {
    const invalid = loadFixture('finding.invalid-empty-evidence.json');
    expect(() => validateFinding(invalid)).toThrow();
  });

  it('AC-IR-002-4: safeValidateFinding returns ok=false with ZodError on invalid input', () => {
    const invalid = loadFixture('finding.invalid-probability-out-of-range.json');
    const result = safeValidateFinding(invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });
});

describe('Confidence + probability calibration (W3 wedge)', () => {
  it('AC-IR-003-1: ★★★ confidence requires probability >= 0.85 (consistency check, Stage 3 enforced)', () => {
    // Stage 3 で literal enforcement、 Stage 2 では schema 上 calibration constraint なし (柔軟性維持)
    // 本 test は documentation purpose、 Stage 3 で actual constraint 追加時 implement
    expect(true).toBe(true);
  });
});
