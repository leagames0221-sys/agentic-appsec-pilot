#!/usr/bin/env node
/**
 * CLI entry point. Wires 3 subcommands (threat-model / scan / patch)
 * via commander.
 *
 * Adapted from sibling tool mcp-guard (MIT, internal universal pattern).
 *
 * Layer responsibilities:
 *   - First executable line  -> enforceNodeVersion (AC-008-1)
 *   - commander Program      -> 3 subcommands + --version from package.json
 *   - try/catch boundary     -> exit code mapping per src/errors/types.ts
 *
 * Per ADR-0007: paid LLM API direct call literal banned. provider
 * selection routes through src/providers/llm/index.ts factory, which
 * silently falls back to mock for any paid name. The --use-claude-code
 * flag is the ONLY higher-quality reasoning path.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Command } from 'commander';

import { ExitCode, AgenticAppsecError, resolveExitCode } from '../errors/index.js';
import { enforceNodeVersion } from './node-version-check.js';
import { runThreatModel } from './threat-model.js';
import { runScan } from './scan.js';
import { runPatch } from './patch.js';
import type { AppType } from '../stages/threat-model/prompts/types.js';

const ALLOWED_APP_TYPES: readonly AppType[] = [
  'Traditional application',
  'Generative AI application',
  'Agentic AI application',
];

function parseAppType(value: string): AppType {
  if ((ALLOWED_APP_TYPES as readonly string[]).includes(value)) {
    return value as AppType;
  }
  throw new Error(`app-type must be one of: ${ALLOWED_APP_TYPES.join(' | ')} (got "${value}")`);
}

function loadPackageVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const candidates = [
      join(here, '..', '..', 'package.json'),
      join(here, '..', 'package.json'),
    ];
    for (const candidate of candidates) {
      try {
        const text = readFileSync(candidate, 'utf-8');
        const pkg = JSON.parse(text) as { version?: string };
        if (typeof pkg.version === 'string') return pkg.version;
      } catch {
        // try next
      }
    }
  } catch {
    // fall through
  }
  return '0.0.0';
}

export function buildProgram(version: string): Command {
  const program = new Command();
  program
    .name('agentic-appsec')
    .description(
      'Local-first AI-agent harness for defensive AppSec on TS/JS/Python codebases. ' +
        'Threat-model + SAST/SCA + patch-suggestion + SARIF 2.1.0, runs on Ollama by default.',
    )
    .version(version, '-V, --version', 'Print version and exit.')
    .showSuggestionAfterError(true)
    .showHelpAfterError(false);

  program
    .command('threat-model')
    .description('Generate STRIDE + OWASP LLM/ASI threat model for a repo.')
    .argument('<repo>', 'Path to repo root')
    .option('--output <path>', 'Write JSON to file (default: stdout)')
    .option('--app-type <type>', `Application type (${ALLOWED_APP_TYPES.join(' | ')})`, parseAppType)
    .option('--authentication <s>', 'Authentication methods (free text)')
    .option('--internet-facing <s>', 'Internet facing? (yes/no/free text)')
    .option('--sensitive-data <s>', 'Sensitive data handled (free text)')
    .option('--provider <name>', 'LLM provider: mock / ollama / claude-code-cli (default: mock fallback)')
    .option('--use-claude-code', 'Use claude-code CLI for higher-quality reasoning (your own subscription)')
    .action(async (repo: string, flags: Record<string, string | boolean>) => {
      await runThreatModel({
        repo,
        ...(typeof flags['output'] === 'string' ? { output: flags['output'] } : {}),
        ...(flags['appType'] !== undefined ? { appType: flags['appType'] as AppType } : {}),
        ...(typeof flags['authentication'] === 'string' ? { authentication: flags['authentication'] } : {}),
        ...(typeof flags['internetFacing'] === 'string' ? { internetFacing: flags['internetFacing'] } : {}),
        ...(typeof flags['sensitiveData'] === 'string' ? { sensitiveData: flags['sensitiveData'] } : {}),
        ...(typeof flags['provider'] === 'string' ? { provider: flags['provider'] } : {}),
        useClaudeCode: flags['useClaudeCode'] === true,
      });
    });

  program
    .command('scan')
    .description('Run OpenGrep + Bandit + OSV-Scanner, emit SARIF 2.1.0 + optional CycloneDX VEX.')
    .argument('<repo>', 'Path to repo root')
    .option('--output <path>', 'SARIF output file (default: stdout JSON dump)')
    .option('--vex <path>', 'Also emit CycloneDX VEX to this path')
    .option('--enrich', 'LLM enrichment (false-positive triage + severity re-rank + exploit context)')
    .option('--provider <name>', 'LLM provider (used with --enrich)')
    .option('--use-claude-code', 'Use claude-code CLI for enrich (your own subscription)')
    .action(async (repo: string, flags: Record<string, string | boolean>) => {
      await runScan({
        repo,
        ...(typeof flags['output'] === 'string' ? { output: flags['output'] } : {}),
        ...(typeof flags['vex'] === 'string' ? { vex: flags['vex'] } : {}),
        enrich: flags['enrich'] === true,
        ...(typeof flags['provider'] === 'string' ? { provider: flags['provider'] } : {}),
        useClaudeCode: flags['useClaudeCode'] === true,
      });
    });

  program
    .command('patch')
    .description('Generate patch suggestion for a finding in a SARIF file.')
    .argument('<sarif-path>', 'Path to SARIF file emitted by `agentic-appsec scan`')
    .requiredOption('--repo <path>', 'Path to repo root (for source context + validation)')
    .option('--finding-id <id>', 'Specific finding id (default: first finding)')
    .option('--output <path>', 'Write JSON to file (default: stdout)')
    .option('--provider <name>', 'LLM provider')
    .option('--use-claude-code', 'Use claude-code CLI (your own subscription)')
    .option('--skip-rescan', 'Skip re-scan validation (Phase α default)')
    .action(async (sarifPath: string, flags: Record<string, string | boolean>) => {
      await runPatch({
        sarifPath,
        repo: flags['repo'] as string,
        ...(typeof flags['findingId'] === 'string' ? { findingId: flags['findingId'] } : {}),
        ...(typeof flags['output'] === 'string' ? { output: flags['output'] } : {}),
        ...(typeof flags['provider'] === 'string' ? { provider: flags['provider'] } : {}),
        useClaudeCode: flags['useClaudeCode'] === true,
        skipRescan: flags['skipRescan'] === true,
      });
    });

  return program;
}

export async function main(argv: string[] = process.argv): Promise<number> {
  const nodeCheck = enforceNodeVersion(process.version);
  if (!nodeCheck.ok) return nodeCheck.exitCode;

  const program = buildProgram(loadPackageVersion());
  try {
    await program.parseAsync(argv);
    return ExitCode.Success;
  } catch (err) {
    if (err instanceof AgenticAppsecError) {
      process.stderr.write(`${err.message}\n`);
    } else if (err instanceof Error) {
      process.stderr.write(`Error: ${err.message}\n`);
    }
    return resolveExitCode(err);
  }
}

// Entry point only when invoked as a script (not when imported as a module).
const isEntryPoint = (() => {
  try {
    return process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];
  } catch {
    return false;
  }
})();

if (isEntryPoint) {
  void main(process.argv).then((code) => process.exit(code));
}
