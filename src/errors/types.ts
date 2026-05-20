// Exit code constants aligned with POSIX sysexits.h.
// Adapted from sibling tool mcp-guard (MIT, internal universal pattern).
// Spec mapping: AC-008-1, ADR-0007.

export const ExitCode = {
  Success: 0,
  FindingsExceedThreshold: 1,
  InvalidInput: 2,
  UsageError: 64,
  DataFormatError: 65,
  InternalError: 70,
  IoError: 74,
  ConfigError: 78,
  PermissionError: 77,
} as const;

export type ExitCodeValue = (typeof ExitCode)[keyof typeof ExitCode];

export interface StructuredErrorPayload {
  code: ExitCodeValue;
  name: string;
  message: string;
  details?: Record<string, unknown>;
}

export class AgenticAppsecError extends Error {
  readonly code: ExitCodeValue;
  readonly details?: Record<string, unknown>;
  constructor(code: ExitCodeValue, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AgenticAppsecError';
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

export function resolveExitCode(err: unknown): ExitCodeValue {
  if (err instanceof AgenticAppsecError) return err.code;
  if (err instanceof Error) return ExitCode.InternalError;
  return ExitCode.InternalError;
}
