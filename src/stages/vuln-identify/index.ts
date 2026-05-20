/**
 * Stage 2 (Vuln Identify) entry point — composes 3 tools + correlator
 * + optional LLM enrichment.
 *
 * Spec mapping: REQ-002 (AC-002-1..5), REQ-003 (AC-003-1..5).
 */
import { runOpengrep, type OpengrepWrapOptions } from './opengrep-wrap.js';
import { runBandit, type BanditWrapOptions } from './bandit-wrap.js';
import { runOsvScanner, type OsvScannerWrapOptions } from './osv-scanner-wrap.js';
import { correlate } from './correlator.js';
import { enrichAll, type EnrichOpts } from './llm-enrich.js';
import type { ScanOpts, ScanResult } from './types.js';

export {
  runOpengrep, parseOpengrepResult,
} from './opengrep-wrap.js';
export { runBandit, parseBanditResult } from './bandit-wrap.js';
export { runOsvScanner, parseOsvResult } from './osv-scanner-wrap.js';
export { correlate } from './correlator.js';
export { enrichFinding, enrichAll } from './llm-enrich.js';
export type { ScanOpts, ScanResult } from './types.js';

export interface ScanWithEnrichOpts extends ScanOpts {
  /** When set, enrich findings via LLM (AC-003-1..5). */
  enrich?: EnrichOpts;
  opengrep?: OpengrepWrapOptions;
  bandit?: BanditWrapOptions;
  osvScanner?: OsvScannerWrapOptions;
}

/**
 * Full scan: opengrep + bandit + osv-scanner → correlator → optional
 * LLM enrichment. Returns aggregated ScanResult.
 */
export async function scan(opts: ScanWithEnrichOpts): Promise<ScanResult> {
  const [opengrep, bandit, osv] = await Promise.all([
    runOpengrep(opts.repoPath, opts.opengrep ?? {}),
    runBandit(opts.repoPath, opts.bandit ?? {}),
    runOsvScanner(opts.repoPath, opts.osvScanner ?? {}),
  ]);

  const merged = [...opengrep.findings, ...bandit.findings, ...osv.findings];
  let correlated = correlate(merged);

  if (opts.enrich !== undefined) {
    correlated = await enrichAll(correlated, opts.enrich);
  }

  const errors: string[] = [];
  if (opengrep.error !== undefined) errors.push(`opengrep: ${opengrep.error}`);
  if (bandit.error !== undefined) errors.push(`bandit: ${bandit.error}`);
  if (osv.error !== undefined) errors.push(`osv-scanner: ${osv.error}`);

  return {
    findings: correlated,
    toolStatus: {
      opengrep: opengrep.status,
      bandit: bandit.status,
      osvScanner: osv.status,
    },
    errors,
  };
}
