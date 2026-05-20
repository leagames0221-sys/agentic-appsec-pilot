/**
 * Patch-suggest tests — AC-004-1..4.
 */
import { describe, it, expect } from 'vitest';
import { suggestPatch } from '../../../src/stages/patch-suggest/index.js';
import { MockProvider } from '../../../src/providers/llm/index.js';
import type { Finding } from '../../../src/ir/types.js';
import type { LlmProvider, LlmRequest, LlmResponse } from '../../../src/providers/llm/index.js';

const baseFinding: Finding = {
  schemaVersion: '1.0.0',
  id: 'F-patch-001',
  ruleId: 'javascript.xss',
  severity: 'high',
  confidence: '★★★',
  probability: 0.92,
  evidenceTrail: [{ type: 'pattern', citation: 'src/x.js:10', capturedAt: '2026-05-20T12:00:00Z' }],
  sourceUrlLine: 'src/x.js:10',
  message: 'Reflected XSS detected',
  sarifLocation: { artifactLocation: { uri: 'src/x.js' }, region: { startLine: 10 } },
};

class StubPatchProvider implements LlmProvider {
  readonly name = 'mock' as const;
  // eslint-disable-next-line @typescript-eslint/require-await
  async invoke(_req: LlmRequest): Promise<LlmResponse> {
    return {
      text: JSON.stringify({
        diff:
          '--- a/src/x.js\n+++ b/src/x.js\n@@ -10,1 +10,1 @@\n-  res.send(`<h1>Hello ${req.query.name}</h1>`)\n+  res.send(`<h1>Hello ${escapeHtml(req.query.name)}</h1>`)\n',
        rationale: 'Wrap untrusted input in escapeHtml.',
      }),
      tokensConsumed: 400,
      costUsd: 0,
      provider: 'mock',
    };
  }
}

describe('suggestPatch', () => {
  it('AC-004-1: returns finding with remediationSuggestion.diff populated', async () => {
    const out = await suggestPatch(baseFinding, {
      provider: new StubPatchProvider(),
      repoPath: process.cwd(),
      skipRescan: true,
    });
    expect(out.remediationSuggestion).toBeDefined();
    expect(out.remediationSuggestion?.diff).toContain('--- a/src/x.js');
    expect(out.remediationSuggestion?.diff).toContain('escapeHtml');
  });

  it('AC-004-1: generatedBy carries provider:model:prompt-id', async () => {
    const out = await suggestPatch(baseFinding, {
      provider: new StubPatchProvider(),
      repoPath: process.cwd(),
      skipRescan: true,
    });
    expect(out.remediationSuggestion?.generatedBy).toContain('mock');
    expect(out.remediationSuggestion?.generatedBy).toContain('patch-suggest');
  });

  it('AC-004-4: mock provider (non-JSON) returns finding unchanged (no remediation)', async () => {
    const out = await suggestPatch(baseFinding, {
      provider: new MockProvider(),
      repoPath: process.cwd(),
      skipRescan: true,
    });
    expect(out.remediationSuggestion).toBeUndefined();
    expect(out.confidence).toBe(baseFinding.confidence);
  });
});
