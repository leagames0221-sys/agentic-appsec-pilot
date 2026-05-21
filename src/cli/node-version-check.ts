// Node runtime gate. Runs as the first executable statement in
// src/cli/index.ts so users on a too-old runtime get an actionable
// error before commander even loads.
//
// Adapted from companion repo mcp-guard (https://github.com/leagames0221-sys/mcp-guard, MIT).
//
// "Too old" = major < MIN_NODE_MAJOR. Spec-required Node 20 LTS for
// stable fetch / AbortSignal / ESM behaviour. Spec mapping: AC-008-1,
// AC-008-2.

import { ExitCode } from '../errors/index.js';
import type { ExitCodeValue } from '../errors/index.js';

export const MIN_NODE_MAJOR = 20;

export interface NodeVersionCheckResult {
  ok: boolean;
  observed: string;
  observedMajor: number;
  exitCode: ExitCodeValue;
  message?: string;
}

export function parseMajor(versionString: string): number {
  const m = versionString.match(/^v?(\d+)\./);
  return m !== null ? Number.parseInt(m[1]!, 10) : Number.NaN;
}

export function checkNodeVersion(versionString: string): NodeVersionCheckResult {
  const major = parseMajor(versionString);
  if (!Number.isFinite(major)) {
    return {
      ok: false,
      observed: versionString,
      observedMajor: Number.NaN,
      exitCode: ExitCode.ConfigError,
      message:
        `Could not parse Node.js version string "${versionString}". ` +
        `agentic-appsec-pilot requires Node.js ${MIN_NODE_MAJOR} or newer. ` +
        `Install from https://nodejs.org/ and re-run.`,
    };
  }
  if (major < MIN_NODE_MAJOR) {
    return {
      ok: false,
      observed: versionString,
      observedMajor: major,
      exitCode: ExitCode.ConfigError,
      message:
        `agentic-appsec-pilot requires Node.js ${MIN_NODE_MAJOR} or newer; observed ${versionString}. ` +
        `Install Node.js ${MIN_NODE_MAJOR} LTS from https://nodejs.org/ and re-run.`,
    };
  }
  return { ok: true, observed: versionString, observedMajor: major, exitCode: ExitCode.Success };
}

export function enforceNodeVersion(
  versionString: string,
  stderr: NodeJS.WritableStream = process.stderr,
): NodeVersionCheckResult {
  const result = checkNodeVersion(versionString);
  if (!result.ok && result.message !== undefined) {
    stderr.write(`${result.message}\n`);
  }
  return result;
}
