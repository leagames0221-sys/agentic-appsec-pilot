/**
 * `agentic-appsec scan <repo>` subcommand.
 *
 * Spec mapping: REQ-002 (AC-002-1..5), REQ-003 (AC-003-1..5).
 */
import { createProvider } from '../providers/llm/index.js';
import { scan as runVulnScan } from '../stages/vuln-identify/index.js';
import { emitSarifReport } from '../io/emitters/sarif.js';
import { emitVexDocument } from '../io/emitters/cyclonedx-vex.js';

export interface ScanCmdOpts {
  repo: string;
  output?: string;
  vex?: string;
  enrich?: boolean;
  provider?: string;
  useClaudeCode?: boolean;
}

export async function runScan(
  opts: ScanCmdOpts,
  stdout: NodeJS.WritableStream = process.stdout,
  stderr: NodeJS.WritableStream = process.stderr,
): Promise<{ findingsCount: number; toolStatus: Record<string, string> }> {
  const provider = createProvider(opts.provider, {
    useClaudeCodeCli: opts.useClaudeCode === true,
  });

  const result = await runVulnScan({
    repoPath: opts.repo,
    ...(opts.enrich === true ? { enrich: { provider } } : {}),
  });

  // Honest status reporting per AC-003-5
  for (const e of result.errors) {
    stderr.write(`[scan] ${e}\n`);
  }
  stderr.write(
    `[scan] tool status: opengrep=${result.toolStatus.opengrep}, bandit=${result.toolStatus.bandit}, osv-scanner=${result.toolStatus.osvScanner}\n`,
  );

  if (opts.output !== undefined) {
    await emitSarifReport(result.findings, opts.output);
    stderr.write(`[scan] SARIF emitted to ${opts.output} (${result.findings.length} findings)\n`);
  } else {
    stdout.write(`${JSON.stringify({ findings: result.findings, toolStatus: result.toolStatus }, null, 2)}\n`);
  }

  if (opts.vex !== undefined) {
    await emitVexDocument(result.findings, opts.vex);
    stderr.write(`[scan] CycloneDX VEX emitted to ${opts.vex}\n`);
  }

  return {
    findingsCount: result.findings.length,
    toolStatus: result.toolStatus as unknown as Record<string, string>,
  };
}
