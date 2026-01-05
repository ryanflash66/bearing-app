/**
 * Performance Monitoring Utilities
 * 
 * Provides helpers for metrics collection and baselining.
 * Story H.3: Performance & Latency Baselines
 */

export interface PerformanceMetric {
  operation: string;
  durationMs: number;
  tags?: Record<string, string>;
  timestamp: string;
}

/**
 * High-precision timer using performance.now()
 * Returns a tuple of [result, durationMs]
 */
export async function measurePromise<T>(
  operation: () => Promise<T>
): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  const result = await operation();
  const end = performance.now();
  return {
    result,
    durationMs: Math.round(end - start)
  };
}

/**
 * Format duration for logging
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Simple in-memory metric accumulator for baseline scripts
 */
export class MetricCollector {
  private metrics: PerformanceMetric[] = [];

  record(operation: string, durationMs: number, tags?: Record<string, string>) {
    this.metrics.push({
      operation,
      durationMs,
      tags,
      timestamp: new Date().toISOString()
    });
  }

  getBaseline(operation: string) {
    const ops = this.metrics.filter(m => m.operation === operation);
    if (ops.length === 0) return null;

    const total = ops.reduce((sum, m) => sum + m.durationMs, 0);
    const avg = Math.round(total / ops.length);
    const min = Math.min(...ops.map(m => m.durationMs));
    const max = Math.max(...ops.map(m => m.durationMs));

    return {
      operation,
      count: ops.length,
      avgMs: avg,
      minMs: min,
      maxMs: max
    };
  }
}
