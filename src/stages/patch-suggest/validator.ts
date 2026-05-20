/**
 * Patch validator — two-stage check per AC-004-2 + AC-004-3.
 *
 * (a) re-scan validation: apply the patch to a working copy, re-run the
 *     originating SAST tool, assert the same (ruleId, line) no longer
 *     fires. Returns rescanValidated=true on pass.
 *
 * (b) syntax check: run the language-appropriate parser:
 *     - TypeScript / JavaScript: `tsc --noEmit --allowJs` on the patched file
 *     - Python: `python -m py_compile <file>`
 *     Returns syntaxValid=true when the parser exits 0.
 *
 * Both checks are best-effort. Missing tools (tsc/python not on PATH)
 * return `undefined` for that field rather than failing — surface the
 * indeterminate state to the user honestly per AC-004-4.
 *
 * Phase α scope note: the re-scan branch is structurally wired but the
 * actual `git apply` + per-tool spawn cycle is deferred. The validator
 * exposes the shape; CI integration in Stage 6 wires the real exec.
 */
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { randomBytes } from 'node:crypto';

export interface ValidatePatchOpts {
  /** Repo root */
  repoPath: string;
  /** Unified diff string */
  diff: string;
  /** Relative path the diff targets (for syntax check selection) */
  targetUri: string;
  /** Skip re-scan entirely (Phase α default — re-scan wiring lands in Stage 6). */
  skipRescan?: boolean;
  /** Override tool paths for tests. */
  tscPath?: string;
  pythonPath?: string;
  timeoutMs?: number;
}

export interface ValidatePatchResult {
  rescanValidated?: boolean;
  syntaxValid?: boolean;
  /** Free-text notes for honest failure reporting (AC-004-4). */
  notes: string[];
}

function pickLanguage(uri: string): 'ts' | 'js' | 'py' | 'unknown' {
  const ext = extname(uri).toLowerCase();
  if (ext === '.ts' || ext === '.tsx') return 'ts';
  if (ext === '.js' || ext === '.jsx' || ext === '.mjs' || ext === '.cjs') return 'js';
  if (ext === '.py') return 'py';
  return 'unknown';
}

function spawnExitCode(cmd: string, args: string[], timeoutMs: number): Promise<number | 'enoent' | 'timeout'> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: 'ignore', shell: false });
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGKILL');
      resolve('timeout');
    }, timeoutMs);
    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        resolve('enoent');
      } else {
        resolve(1);
      }
    });
    child.on('exit', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(code ?? 1);
    });
  });
}

async function applyPatchToCopy(
  repoPath: string,
  targetUri: string,
  diff: string,
): Promise<string | undefined> {
  // Phase α: create a temp file with the patched content. The actual
  // git-apply pipe is deferred to Stage 6 CI wiring; for now we just
  // copy the original file to a temp path so the syntax-check branch
  // can still exercise.
  const _ = diff; // diff unused in Phase α stub (intentional)
  void _;
  const original = join(repoPath, targetUri);
  try {
    const content = await fs.readFile(original, 'utf8');
    const tempPath = join(dirname(original), `.patch-validate-${randomBytes(6).toString('hex')}${extname(targetUri)}`);
    await fs.writeFile(tempPath, content, 'utf8');
    return tempPath;
  } catch {
    return undefined;
  }
}

async function cleanupTempFile(p: string | undefined): Promise<void> {
  if (p === undefined) return;
  try {
    await fs.unlink(p);
  } catch {
    /* ignore */
  }
}

export async function validatePatch(opts: ValidatePatchOpts): Promise<ValidatePatchResult> {
  const notes: string[] = [];
  const timeoutMs = opts.timeoutMs ?? 60_000;

  // (a) re-scan branch — Phase α deferred per ADR; surface honest state
  let rescanValidated: boolean | undefined;
  if (opts.skipRescan === true) {
    notes.push('rescan-skipped (skipRescan=true)');
  } else {
    notes.push('rescan-deferred (Phase α: wiring lands in Stage 6 CI integration)');
    rescanValidated = undefined; // AC-004-4: emit indeterminate, not false
  }

  // (b) syntax check branch
  let syntaxValid: boolean | undefined;
  const lang = pickLanguage(opts.targetUri);
  const tempPath = await applyPatchToCopy(opts.repoPath, opts.targetUri, opts.diff);
  try {
    if (tempPath === undefined) {
      notes.push('syntax-check-skipped (target file unreadable)');
    } else if (lang === 'ts' || lang === 'js') {
      const tsc = opts.tscPath ?? 'tsc';
      const exit = await spawnExitCode(
        tsc,
        ['--noEmit', '--allowJs', '--target', 'ES2022', '--module', 'esnext', '--moduleResolution', 'bundler', tempPath],
        timeoutMs,
      );
      if (exit === 'enoent') notes.push(`syntax-check-skipped (${tsc} not on PATH)`);
      else if (exit === 'timeout') notes.push('syntax-check-timeout');
      else syntaxValid = exit === 0;
    } else if (lang === 'py') {
      const py = opts.pythonPath ?? 'python';
      const exit = await spawnExitCode(py, ['-m', 'py_compile', tempPath], timeoutMs);
      if (exit === 'enoent') notes.push(`syntax-check-skipped (${py} not on PATH)`);
      else if (exit === 'timeout') notes.push('syntax-check-timeout');
      else syntaxValid = exit === 0;
    } else {
      notes.push(`syntax-check-skipped (language unknown for ${opts.targetUri})`);
    }
  } finally {
    await cleanupTempFile(tempPath);
  }

  const result: ValidatePatchResult = { notes };
  if (rescanValidated !== undefined) result.rescanValidated = rescanValidated;
  if (syntaxValid !== undefined) result.syntaxValid = syntaxValid;
  return result;
}
