/**
 * Atomic file write helper.
 *
 * Adapted from companion repo sbom-pilot (https://github.com/leagames0221-sys/sbom-pilot, MIT).
 *
 * Writes content to a temporary path in the same directory, fsyncs, then
 * renames into place. Partial writes are invisible to concurrent readers
 * because `rename(2)` is atomic relative to the filesystem.
 *
 * Spec mapping: AC-009-1, AC-009-2.
 */
import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomBytes } from 'node:crypto';

export interface AtomicWriteOptions {
  /** Open mode for the target file. Defaults to 0o644. */
  readonly mode?: number;
  /** When true, ensure the parent directory exists (mkdir -p). */
  readonly mkdirParent?: boolean;
}

export async function atomicWrite(
  targetPath: string,
  data: string | Uint8Array,
  options: AtomicWriteOptions = {},
): Promise<void> {
  const parent = dirname(targetPath);
  if (options.mkdirParent === true) {
    await fs.mkdir(parent, { recursive: true });
  }

  const tmpSuffix = randomBytes(8).toString('hex');
  const tmpPath = join(parent, `${basename(targetPath)}.tmp-${tmpSuffix}`);

  const payload: Uint8Array =
    typeof data === 'string' ? new TextEncoder().encode(data) : data;

  let handle: import('node:fs').promises.FileHandle | null = null;
  try {
    handle = await fs.open(tmpPath, 'w', options.mode ?? 0o644);
    await handle.writeFile(payload);
    await handle.sync();
    await handle.close();
    handle = null;
    await fs.rename(tmpPath, targetPath);
  } catch (err) {
    if (handle !== null) {
      try {
        await handle.close();
      } catch {
        /* ignore cleanup failure */
      }
    }
    try {
      await fs.unlink(tmpPath);
    } catch {
      /* ignore: temp may not exist yet */
    }
    throw err;
  }
}

function basename(p: string): string {
  const m = p.match(/[^/\\]+$/);
  return m === null ? p : m[0];
}
