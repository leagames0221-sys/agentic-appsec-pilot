/**
 * Bandit CLI wrap — Python SAST.
 *
 * Spawns `bandit -f json -r <path>` and parses output into Finding[].
 * Spec mapping: AC-002-1, AC-002-3, AC-002-5.
 *
 * License: Bandit is Apache-2.0. We invoke as external binary.
 */
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { Finding } from '../../ir/types.js';
import {
  DEFAULT_PROBABILITY,
  banditSeverity,
  banditConfidence,
} from './types.js';

interface BanditRawResult {
  filename?: string;
  line_number?: number;
  line_range?: number[];
  test_id?: string;
  test_name?: string;
  issue_severity?: string;
  issue_confidence?: string;
  issue_text?: string;
  issue_cwe?: { id?: number; link?: string };
  more_info?: string;
}

interface BanditRawOutput {
  results?: BanditRawResult[];
  errors?: unknown[];
}

export interface BanditWrapOptions {
  cliPath?: string;
  timeoutMs?: number;
}

export async function runBandit(
  repoPath: string,
  options: BanditWrapOptions = {},
): Promise<{ findings: Finding[]; status: 'ok' | 'not-installed' | 'error'; error?: string }> {
  const cliPath = options.cliPath ?? 'bandit';
  const timeoutMs = options.timeoutMs ?? 120_000;

  try {
    const rawJson = await spawnAndCapture(cliPath, ['-f', 'json', '-r', repoPath], timeoutMs);
    const parsed = JSON.parse(rawJson) as BanditRawOutput;
    const findings = (parsed.results ?? []).flatMap(parseBanditResult);
    return { findings, status: 'ok' };
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return { findings: [], status: 'not-installed', error: 'bandit CLI not in PATH; install via `pip install bandit`' };
    }
    return { findings: [], status: 'error', error: err.message };
  }
}

export function parseBanditResult(raw: BanditRawResult): Finding[] {
  if (raw.filename === undefined || raw.line_number === undefined || raw.test_id === undefined) {
    return [];
  }
  const severity = banditSeverity(raw.issue_severity ?? 'LOW');
  const confidence = banditConfidence(raw.issue_confidence ?? 'LOW');
  const probability = DEFAULT_PROBABILITY[confidence];
  const lineRange = raw.line_range ?? [raw.line_number];
  const endLine = lineRange[lineRange.length - 1] ?? raw.line_number;

  const region: Finding['sarifLocation']['region'] = { startLine: raw.line_number };
  if (endLine !== raw.line_number) region.endLine = endLine;

  const cweCitation = raw.issue_cwe?.link ?? raw.more_info;

  const finding: Finding = {
    schemaVersion: '1.0.0',
    id: `F-${randomUUID()}`,
    ruleId: raw.test_id,
    severity,
    confidence,
    probability,
    evidenceTrail: [
      {
        type: 'pattern',
        citation: `${raw.filename}:${raw.line_number}`,
        capturedAt: nowIso(),
        weight: 1.0,
        rationale: `Bandit ${raw.test_id} (${raw.test_name ?? 'unknown'}): ${raw.issue_text ?? ''}`.slice(0, 500),
      },
      ...(cweCitation !== undefined
        ? [
            {
              type: 'advisory' as const,
              citation: cweCitation,
              capturedAt: nowIso(),
              weight: 0.5,
            },
          ]
        : []),
    ],
    sourceUrlLine: `${raw.filename}:${raw.line_number}`,
    message: raw.issue_text ?? `Bandit ${raw.test_id} matched`,
    sarifLocation: {
      artifactLocation: { uri: raw.filename },
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
      // bandit exits 1 when findings exist
      if (code === 0 || code === 1) resolve(stdout);
      else reject(new Error(`${cmd} exit ${code ?? 'null'}: ${stderr.slice(0, 300)}`));
    });
  });
}
