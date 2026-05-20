/**
 * Stage 4 (Patch Suggest) entry point — generates patch + validates.
 *
 * Spec mapping: REQ-004 (AC-004-1..4).
 */
import type { Finding, RemediationSuggestion } from '../../ir/types.js';
import type { LlmProvider } from '../../providers/llm/index.js';
import { generatePatch } from './generator.js';
import { validatePatch } from './validator.js';

export { generatePatch } from './generator.js';
export { validatePatch } from './validator.js';
export type { GeneratePatchOpts } from './generator.js';
export type { ValidatePatchOpts, ValidatePatchResult } from './validator.js';

export interface SuggestPatchOpts {
  provider: LlmProvider;
  repoPath: string;
  contextLines?: number;
  modelHint?: string;
  skipRescan?: boolean;
  tscPath?: string;
  pythonPath?: string;
}

/**
 * Generate + validate a patch for one finding. Returns the finding with
 * `remediationSuggestion` populated when patch generation succeeded.
 * Returns the finding unchanged when LLM unavailable / response unparseable
 * (AC-004-4: never throw, surface state honestly).
 */
export async function suggestPatch(finding: Finding, opts: SuggestPatchOpts): Promise<Finding> {
  const patch = await generatePatch(finding, {
    provider: opts.provider,
    repoPath: opts.repoPath,
    ...(opts.contextLines !== undefined ? { contextLines: opts.contextLines } : {}),
    ...(opts.modelHint !== undefined ? { modelHint: opts.modelHint } : {}),
  });
  if (patch === undefined) {
    return finding;
  }

  const validation = await validatePatch({
    repoPath: opts.repoPath,
    diff: patch.diff,
    targetUri: finding.sarifLocation.artifactLocation.uri,
    ...(opts.skipRescan !== undefined ? { skipRescan: opts.skipRescan } : {}),
    ...(opts.tscPath !== undefined ? { tscPath: opts.tscPath } : {}),
    ...(opts.pythonPath !== undefined ? { pythonPath: opts.pythonPath } : {}),
  });

  const remediation: RemediationSuggestion = { ...patch };
  if (validation.rescanValidated !== undefined) remediation.rescanValidated = validation.rescanValidated;
  if (validation.syntaxValid !== undefined) remediation.syntaxValid = validation.syntaxValid;

  return { ...finding, remediationSuggestion: remediation };
}
