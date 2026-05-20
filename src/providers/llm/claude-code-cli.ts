/**
 * Claude Code CLI provider — optional opt-in via `--use-claude-code`.
 *
 * Spawns the `claude` CLI as a child process and pipes prompt via stdin,
 * captures stdout. Uses the user's own Claude Code authentication (Pro
 * / Max / Team / Enterprise plan), so this PJ itself never holds an
 * API key and never incurs charge — the user's existing subscription
 * funds the inference.
 *
 * Per ADR-0007 §Decision: this is the ONLY higher-quality reasoning
 * path; Anthropic SDK / API direct calls are banned. CLI invocation
 * goes through `spawn` with stdin pipe — no shell, no command
 * interpolation, mitigating injection risk.
 *
 * Pre-requisites (verified by `claude --version` probe):
 *   - Claude Code CLI installed (Windows: WinGet/PowerShell/native installer)
 *   - User logged in (`claude` first run + browser prompt)
 *
 * Spec mapping: AC-006-1, AC-007-3, AC-010-7, ADR-0007.
 */
import { spawn } from 'node:child_process';
import type { LlmProvider, LlmRequest, LlmResponse } from './types.js';

export interface ClaudeCodeCliProviderOptions {
  /** CLI binary name or full path. Default 'claude' (PATH lookup). */
  cliPath?: string;
  /** Timeout in ms. Default 120_000 (2 min). */
  timeoutMs?: number;
}

export class ClaudeCodeCliProvider implements LlmProvider {
  readonly name = 'claude-code-cli' as const;
  private readonly cliPath: string;
  private readonly timeoutMs: number;

  constructor(options: ClaudeCodeCliProviderOptions = {}) {
    this.cliPath = options.cliPath ?? 'claude';
    this.timeoutMs = options.timeoutMs ?? 120_000;
  }

  async invoke(request: LlmRequest): Promise<LlmResponse> {
    const composed = request.system ? `${request.system}\n\n${request.prompt}` : request.prompt;

    // CLI args: -p <prompt-via-stdin> + --output-format json
    // We pass the prompt via stdin (not args) to avoid command-line length
    // limits on Windows (max ~8KB) and to avoid any shell quoting risk.
    const args = ['-p', '--output-format', 'json'];

    return await new Promise<LlmResponse>((resolve, reject) => {
      const child = spawn(this.cliPath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false,
      });

      let stdout = '';
      let stderr = '';
      let settled = false;

      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        child.kill('SIGKILL');
        reject(new Error(`claude-code CLI timeout after ${this.timeoutMs}ms`));
      }, this.timeoutMs);

      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString('utf8');
      });
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8');
      });

      child.on('error', (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(
            new Error(
              `claude-code CLI not found at "${this.cliPath}". ` +
                `Install via WinGet: \`winget install Anthropic.ClaudeCode\` ` +
                `or PowerShell: \`irm https://claude.ai/install.ps1 | iex\``,
            ),
          );
        } else {
          reject(err);
        }
      });

      child.on('exit', (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (code !== 0) {
          reject(
            new Error(
              `claude-code CLI exit code ${code ?? 'null'}. stderr: ${stderr.slice(0, 500)}`,
            ),
          );
          return;
        }
        // Output format = JSON; expect { result: string, ... } or similar
        // Tolerant parsing: if not JSON-parseable, fall back to raw text.
        let text: string;
        try {
          const parsed = JSON.parse(stdout) as { result?: string };
          text = parsed.result ?? stdout;
        } catch {
          text = stdout;
        }
        resolve({
          text,
          tokensConsumed: 0, // CLI does not surface token counts in user-plan mode
          costUsd: 0, // User's own subscription, no per-call charge to this PJ
          provider: 'claude-code-cli',
        });
      });

      child.stdin.write(composed);
      child.stdin.end();
    });
  }
}
