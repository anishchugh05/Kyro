/**
 * Kyro — Autonomous AI Code Repair Engine
 * Copyright © 2026 Anish Chugh. All rights reserved.
 * Version 1.0.0 | June 2026
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */
import { useRanger } from "@/state/RangerContext";

/**
 * Left panel — Claude Haiku's overview of the analyzed codebase.
 * Appears as soon as indexing completes, before the issue is identified.
 * Gives users confidence that the entire repo was read before any patch was written.
 */
export function CodebaseOverviewPanel() {
  const { overview } = useRanger();

  if (!overview) return null;

  const { text, stats } = overview;

  return (
    <aside className="pointer-events-auto holo-panel corner-brackets animate-slide-in-left w-[22rem] max-w-[90vw]">
      <div className="holo-panel-header">
        <span>// codebase.scan</span>
        <span className="flex items-center gap-1.5 font-mono text-[0.58rem] uppercase tracking-widest text-orange-400/80">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-400 opacity-80" />
          claude haiku
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* AI-generated description */}
        <p className="font-mono text-[0.72rem] leading-relaxed text-foreground/85">
          {text}
        </p>

        {/* Stats strip */}
        <div className="flex items-center gap-4 border-t border-white/6 pt-3">
          <Stat label="files indexed" value={stats.files.toLocaleString()} color="text-primary" />
          <div className="h-3 w-px bg-white/10" />
          <Stat label="lines read" value={stats.lines.toLocaleString()} color="text-secondary" />
        </div>
      </div>
    </aside>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`font-mono text-sm font-bold ${color}`}>{value}</span>
      <span className="font-mono text-[0.6rem] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
