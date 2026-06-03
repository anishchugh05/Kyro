/**
 * Kyro — Autonomous AI Code Repair Engine
 * Copyright © 2026 Anish Chugh. All rights reserved.
 * Version 1.0.0 | June 2026
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */
const TICKS = [
  "Indexing node_modules",
  "Optimizing AST",
  "Heartbeating upstream",
  "Diffing dependency graph",
  "Resolving import map",
  "Scanning for vulnerabilities",
  "Caching embeddings",
  "Pruning dead branches",
  "Compiling type signatures",
  "Analyzing call graph depth",
  "Verifying checksums",
  "Warming inference cache",
  "Mapping file entropy",
  "Syncing remote refs",
  "Profiling hot paths",
  "Deduplicating AST nodes",
  "Calculating cyclomatic complexity",
  "Resolving transitive deps",
];

const LINE = TICKS.join("  ·  ") + "  ·  ";
// Duplicate so the seamless loop works: animate -50% and the second copy fills in
const DOUBLED = LINE + LINE;

export function BottomTicker() {
  return (
    <div className="pointer-events-none w-full overflow-hidden border-t border-panel-border/50 bg-background/30 backdrop-blur-sm">
      <div className="py-1 animate-ticker whitespace-nowrap font-mono text-[0.55rem] uppercase tracking-[0.18em] text-primary/25">
        {DOUBLED}
      </div>
    </div>
  );
}
