/**
 * Patch generator — LLM-suggested unified diff for a finding.
 *
 * Spec mapping: REQ-004 (AC-004-1).
 *
 * The generator builds a prompt from the finding + surrounding source
 * context, calls the LLM provider, and parses the response into a
 * `RemediationSuggestion`. Validation (re-scan + syntax) happens in
 * validator.ts.
 *
 * Local-first design: Ollama default, $0/month. Provider failures
 * gracefully degrade — patch_suggest still returns a structured "patch
 * candidate unavailable" record rather than throwing.
 */
import { promises as fs } from 'node:fs';
import type { Finding, RemediationSuggestion } from '../../ir/types.js';
import type { LlmProvider } from '../../providers/llm/index.js';

export interface GeneratePatchOpts {
  provider: LlmProvider;
  /** Repo root for resolving relative paths in finding.sarifLocation.artifactLocation.uri */
  repoPath: string;
  /** Number of context lines to read around the finding. Default 10. */
  contextLines?: number;
  /** Model hint passed through to provider (for citation). Default 'gemma3:4b'. */
  modelHint?: string;
}

interface PatchLlmOutput {
  diff?: string;
  rationale?: string;
}

function buildPrompt(finding: Finding, sourceContext: string, modelHint: string): { system: string; user: string } {
  const system =
    'You are a senior secure-code engineer. Produce a minimal unified-diff patch ' +
    'that fixes the supplied finding without introducing new behaviour. Respond as ' +
    'strict JSON only, no prose. Keep the diff minimal: change only what is required.';

  const user = `Finding:
- rule_id: ${finding.ruleId}
- severity: ${finding.severity}
- confidence: ${finding.confidence}
- location: ${finding.sourceUrlLine}
- message: ${finding.message}

Source context (~10 lines around the finding):
\`\`\`
${sourceContext}
\`\`\`

Generate a unified diff patch that:
1. Targets the EXACT file at the location above
2. Uses standard unified-diff format (--- / +++ / @@ / context + leading + or -)
3. Changes only the minimal lines required to fix
4. Preserves indentation + style of the surrounding code
5. Does NOT add new imports / dependencies without justification

Respond as JSON:
{
  "diff": "--- a/path\\n+++ b/path\\n@@ ... @@\\n  context\\n- bad line\\n+ fixed line\\n  context\\n",
  "rationale": "Brief explanation of why this fixes the finding."
}

Model hint: ${modelHint}`;
  return { system, user };
}

function parsePatchResponse(text: string): PatchLlmOutput | undefined {
  const cleaned = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
  try {
    const obj = JSON.parse(cleaned) as Record<string, unknown>;
    const out: PatchLlmOutput = {};
    if (typeof obj['diff'] === 'string') out.diff = obj['diff'];
    if (typeof obj['rationale'] === 'string') out.rationale = obj['rationale'];
    return out;
  } catch {
    return undefined;
  }
}

async function readSourceContext(
  repoPath: string,
  finding: Finding,
  contextLines: number,
): Promise<string> {
  const filePath = `${repoPath}/${finding.sarifLocation.artifactLocation.uri}`;
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    const start = Math.max(0, finding.sarifLocation.region.startLine - contextLines - 1);
    const end = Math.min(lines.length, finding.sarifLocation.region.startLine + contextLines);
    return lines
      .slice(start, end)
      .map((line, i) => `${String(start + i + 1).padStart(4, ' ')}: ${line}`)
      .join('\n');
  } catch {
    return '[source context unavailable]';
  }
}

/**
 * Generate a patch suggestion for one finding via the LLM provider.
 * Returns `undefined` when the provider is non-real (mock) or response
 * cannot be parsed — caller emits the finding without remediation.
 */
export async function generatePatch(
  finding: Finding,
  opts: GeneratePatchOpts,
): Promise<RemediationSuggestion | undefined> {
  const modelHint = opts.modelHint ?? 'gemma3:4b';
  const sourceContext = await readSourceContext(opts.repoPath, finding, opts.contextLines ?? 10);
  const { system, user } = buildPrompt(finding, sourceContext, modelHint);

  let response;
  try {
    response = await opts.provider.invoke({ system, prompt: user, jsonMode: true, maxTokens: 1500 });
  } catch {
    return undefined;
  }

  const parsed = parsePatchResponse(response.text);
  if (parsed === undefined || parsed.diff === undefined || parsed.diff.length === 0) {
    return undefined;
  }

  return {
    diff: parsed.diff,
    generatedBy: `${response.provider}:${modelHint}@patch-suggest-v1`,
  };
}
