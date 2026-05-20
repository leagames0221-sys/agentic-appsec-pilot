/**
 * OpenGrep CLI wrap — TypeScript / JavaScript / Python SAST.
 *
 * Spawns `opengrep scan --json <path>` and parses the Semgrep-compatible
 * JSON output into Finding[]. Spec mapping: AC-002-1, AC-002-3, AC-002-5.
 *
 * License: OpenGrep is LGPL-2.1. We invoke it as an external binary
 * (no static linking, no source incorporation), keeping our project MIT.
 */
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { Finding } from '../../ir/types.js';
import {
  DEFAULT_CONFIDENCE,
  DEFAULT_PROBABILITY,
  semgrepSeverity,
} from './types.js';

interface OpengrepRawResult {
  check_id?: string;
  path?: string;
  start?: { line?: number; col?: number };
  end?: { line?: number; col?: number };
  extra?: {
    message?: string;
    severity?: string;
    metadata?: Record<string, unknown>;
  };
}

interface OpengrepRawOutput {
  results?: OpengrepRawResult[];
  errors?: unknown[];
}

export interface OpengrepWrapOptions {
  cliPath?: string;
  timeoutMs?: number;
}

export async function runOpengrep(
  repoPath: string,
  options: OpengrepWrapOptions = {},
): Promise<{ findings: Finding[]; status: 'ok' | 'not-installed' | 'error'; error?: string }> {
  const cliPath = options.cliPath ?? 'opengrep';
  const timeoutMs = options.timeoutMs ?? 120_000;

  try {
    const rawJson = await spawnAndCapture(cliPath, ['scan', '--json', '--quiet', repoPath], timeoutMs);
    const parsed = JSON.parse(rawJson) as OpengrepRawOutput;
    const findings = (parsed.results ?? []).flatMap(parseOpengrepResult);
    return { findings, status: 'ok' };
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return { findings: [], status: 'not-installed', error: 'opengrep CLI not in PATH; install from https://github.com/opengrep/opengrep/releases' };
    }
    return { findings: [], status: 'error', error: err.message };
  }
}

export function parseOpengrepResult(raw: OpengrepRawResult): Finding[] {
  if (raw.check_id === undefined || raw.path === undefined || raw.start?.line === undefined) {
    return [];
  }
  const severity = semgrepSeverity(raw.extra?.severity ?? 'WARNING');
  const confidence = DEFAULT_CONFIDENCE.opengrep;
  const probability = DEFAULT_PROBABILITY[confidence];
  const startLine = raw.start.line;

  const region: Finding['sarifLocation']['region'] = { startLine };
  if (raw.start.col !== undefined) region.startColumn = raw.start.col;
  if (raw.end?.line !== undefined) region.endLine = raw.end.line;
  if (raw.end?.col !== undefined) region.endColumn = raw.end.col;

  const finding: Finding = {
    schemaVersion: '1.0.0',
    id: `F-${randomUUID()}`,
    ruleId: raw.check_id,
    severity,
    confidence,
    probability,
    evidenceTrail: [
      {
        type: 'pattern',
        citation: `${raw.path}:${startLine}`,
        capturedAt: nowIso(),
        weight: 1.0,
        rationale: `OpenGrep rule match: ${raw.check_id}`,
      },
    ],
    sourceUrlLine: `${raw.path}:${startLine}`,
    message: raw.extra?.message ?? `OpenGrep rule ${raw.check_id} matched`,
    sarifLocation: {
      artifactLocation: { uri: raw.path },
      region,
    },
  };
  return [finding];
}

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function spawnAndCapture(cmd: string, args: string[], timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: false });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGKILL');
      reject(new Error(`${cmd} timeout after ${timeoutMs}ms`));
    }, timeoutMs);
    child.stdout.on('data', (c: Buffer) => { stdout += c.toString('utf8'); });
    child.stderr.on('data', (c: Buffer) => { stderr += c.toString('utf8'); });
    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });
    child.on('exit', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // opengrep / semgrep exit 1 when findings exist — treat as success
      if (code === 0 || code === 1) resolve(stdout);
      else reject(new Error(`${cmd} exit ${code ?? 'null'}: ${stderr.slice(0, 300)}`));
    });
  });
}
