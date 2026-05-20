/**
 * `agentic-appsec threat-model <repo>` subcommand.
 *
 * Spec mapping: REQ-001 (AC-001-1..5).
 */
import { promises as fs } from 'node:fs';
import { atomicWrite } from '../io/emitters/atomic.js';
import { createProvider } from '../providers/llm/index.js';
import { generateThreatModel } from '../stages/threat-model/generator.js';
import type { AppType } from '../stages/threat-model/prompts/types.js';
import { ExitCode, AgenticAppsecError } from '../errors/index.js';

export interface ThreatModelCmdOpts {
  repo: string;
  output?: string;
  appType?: AppType;
  authentication?: string;
  internetFacing?: string;
  sensitiveData?: string;
  provider?: string;
  useClaudeCode?: boolean;
}

export async function runThreatModel(
  opts: ThreatModelCmdOpts,
  stdout: NodeJS.WritableStream = process.stdout,
): Promise<void> {
  const provider = createProvider(opts.provider, {
    useClaudeCodeCli: opts.useClaudeCode === true,
  });

  const appInput = await readRepoSummary(opts.repo);

  const tm = await generateThreatModel({
    target: opts.repo,
    appType: opts.appType ?? 'Traditional application',
    authentication: opts.authentication ?? 'unspecified',
    internetFacing: opts.internetFacing ?? 'unspecified',
    sensitiveData: opts.sensitiveData ?? 'unspecified',
    appInput,
    provider,
  });

  const json = `${JSON.stringify(tm, null, 2)}\n`;
  if (opts.output !== undefined) {
    await atomicWrite(opts.output, json, { mkdirParent: true });
  } else {
    stdout.write(json);
  }
}

async function readRepoSummary(repoPath: string): Promise<string> {
  try {
    const stat = await fs.stat(repoPath);
    if (!stat.isDirectory()) {
      throw new AgenticAppsecError(
        ExitCode.InvalidInput,
        `Repo path is not a directory: ${repoPath}`,
      );
    }
  } catch (err) {
    if (err instanceof AgenticAppsecError) throw err;
    throw new AgenticAppsecError(
      ExitCode.InvalidInput,
      `Cannot stat repo path ${repoPath}: ${(err as Error).message}`,
    );
  }

  // Best-effort: concatenate README.md (if present) + top-level package.json.
  // Future Stage 7 enhancement: full repo walker.
  const fragments: string[] = [`Repo path: ${repoPath}`];
  for (const candidate of ['README.md', 'readme.md', 'package.json']) {
    try {
      const content = await fs.readFile(`${repoPath}/${candidate}`, 'utf8');
      fragments.push(`\n--- ${candidate} ---\n${content.slice(0, 4000)}`);
    } catch {
      // skip missing
    }
  }
  return fragments.join('\n');
}
