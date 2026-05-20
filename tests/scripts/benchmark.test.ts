/**
 * Benchmark smoke test — AC-002-4 (≥ 100 findings/minute target).
 */
import { describe, it, expect } from 'vitest';
import { runBench } from '../../scripts/benchmark.js';

describe('benchmark', () => {
  it('AC-002-4: orchestration sustains >> 100 findings/minute on 1k synthetic findings', () => {
    const r = runBench(1000);
    expect(r.findingsCount).toBe(1000);
    expect(r.total).toBeGreaterThan(0);
    const perMin = (r.findingsCount / r.total) * 60_000;
    expect(perMin).toBeGreaterThan(100);
  });

  it('correlator dedup runs in sub-second time on 1k findings', () => {
    const r = runBench(1000);
    expect(r.correlate).toBeLessThan(1000); // <1s
  });
});
