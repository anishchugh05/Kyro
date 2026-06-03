/**
 * Kyro — Autonomous AI Code Repair Engine
 * Copyright © 2026 Anish Chugh. All rights reserved.
 * Version 1.0.0 | June 2026
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */
import { useRanger } from "@/state/RangerContext";

export function RepoPulsePanel() {
  const { nodes, edges, phase, progress } = useRanger();

  const totalFiles = nodes.length;
  const warningCount = nodes.filter((n) => n.status === "warning").length;
  const fixedCount = nodes.filter((n) => n.status === "fixed").length;
  const buggyCount = nodes.filter((n) => n.status === "buggy").length;

  if (phase === "idle" && totalFiles === 0) return null;

  return (
    <aside className="pointer-events-auto holo-panel corner-brackets animate-slide-in-left flex w-[22rem] max-w-[90vw] flex-col">
      <div className="holo-panel-header">
        <span>// repo.pulse</span>
        <span
          className={`font-mono text-[0.6rem] uppercase tracking-widest ${
            phase !== "idle" ? "text-cyber-green animate-pulse" : "text-muted-foreground"
          }`}
        >
          {phase !== "idle" ? "● live" : "○ idle"}
        </span>
      </div>

      <div className="p-3 space-y-3">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-1.5">
          <StatBox label="Files" value={totalFiles} color="blue" />
          <StatBox label="Edges" value={edges.length} color="purple" />
          <StatBox label="Issues" value={warningCount + buggyCount} color="yellow" />
          <StatBox label="Fixed" value={fixedCount} color="green" />
        </div>

        {/* Scan progress */}
        {phase !== "idle" && (
          <div className="space-y-1">
            <div className="flex justify-between font-mono text-[0.58rem] uppercase tracking-widest text-muted-foreground">
              <span>Scan Progress</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div className="h-1 rounded-full bg-background/60 border border-panel-border overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-700"
                style={{ width: `${Math.max(2, progress * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Vulnerability heatmap */}
        {nodes.length > 0 && (
          <div className="space-y-1.5">
            <div className="font-mono text-[0.58rem] uppercase tracking-widest text-muted-foreground">
              Codebase Health Map
            </div>
            <div className="flex flex-wrap gap-0.5">
              {nodes.map((n) => (
                <div
                  key={n.id}
                  title={n.label ?? n.id}
                  className={`h-2 w-2 rounded-sm transition-all duration-500 ${
                    n.status === "buggy"
                      ? "bg-cyber-red shadow-[0_0_4px_#ff3b5c]"
                      : n.status === "warning"
                        ? "bg-[#ffb454]"
                        : n.status === "fixed"
                          ? "bg-cyber-green shadow-[0_0_4px_#3dffa0]"
                          : "bg-primary/25"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "blue" | "yellow" | "green" | "purple";
}) {
  const cls =
    color === "blue"
      ? "text-cyber-blue"
      : color === "yellow"
        ? "text-[#ffb454]"
        : color === "green"
          ? "text-cyber-green"
          : "text-cyber-purple";
  return (
    <div className="rounded border border-panel-border bg-background/35 p-1.5 text-center">
      <div className={`font-mono text-base font-bold leading-none ${cls}`}>{value}</div>
      <div className="mt-0.5 font-mono text-[0.5rem] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
