/**
 * Kyro — Autonomous AI Code Repair Engine
 * Copyright © 2026 Anish Chugh. All rights reserved.
 * Version 1.0.0 | June 2026
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */
import { useRanger } from "@/state/RangerContext";
import { useDemoRunner } from "@/state/useDemoRunner";
import { buildDemoCity, demoDiff, demoIssue } from "@/state/demoData";
import type { AgentPhase } from "@/state/ranger-types";

const PHASES: AgentPhase[] = [
  "idle",
  "assembly",
  "exploring",
  "targeting",
  "repairing",
  "complete",
];

/**
 * Floating dev/demo panel — lets you scrub phases manually and
 * re-run the full scripted scenario. Hidden from production with
 * a toggle if needed; for the hackathon we keep it visible.
 */
export function DemoControls() {
  const { run, stop } = useDemoRunner();
  const ranger = useRanger();

  const jumpTo = (phase: AgentPhase) => {
    stop();
    const { nodes, edges } = buildDemoCity();

    if (phase === "idle") {
      ranger.reset();
      return;
    }

    // Always seed the city for non-idle phases
    ranger.setNodes(nodes);
    ranger.setEdges(edges);
    ranger.setPhase(phase);

    if (phase === "assembly") {
      ranger.setIssue(null);
      ranger.setDiff(null);
      ranger.setFocusedNodeId(null);
      return;
    }

    if (phase === "exploring") {
      ranger.setIssue(null);
      ranger.setDiff(null);
      ranger.setFocusedNodeId(null);
      return;
    }

    // Targeting / repairing / complete share the bug context
    ranger.setIssue(demoIssue);
    ranger.setFocusedNodeId(demoIssue.targetNodeId ?? null);
    ranger.setEdges(
      edges.map((e) => ({
        ...e,
        active: e.from === demoIssue.targetNodeId || e.to === demoIssue.targetNodeId,
      })),
    );

    if (phase === "targeting") {
      ranger.setNodes(
        nodes.map((n) => (n.id === demoIssue.targetNodeId ? { ...n, status: "buggy" } : n)),
      );
      ranger.setDiff(null);
    } else if (phase === "repairing") {
      ranger.setNodes(
        nodes.map((n) => (n.id === demoIssue.targetNodeId ? { ...n, status: "buggy" } : n)),
      );
      ranger.setDiff(demoDiff);
    } else if (phase === "complete") {
      ranger.setNodes(
        nodes.map((n) => (n.id === demoIssue.targetNodeId ? { ...n, status: "fixed" } : n)),
      );
      ranger.setDiff(demoDiff);
    }
  };

  return (
    <div className="pointer-events-auto holo-panel corner-brackets animate-slide-up">
      <div className="holo-panel-header">
        <span>// demo control</span>
        <span className="text-muted-foreground">scrub phases</span>
      </div>
      <div className="flex flex-col gap-2 px-3 py-2">
        <div className="flex gap-1.5">
          <button
            onClick={() => run("github.com/acme/app")}
            className="flex-1 rounded-md border border-accent/50 bg-accent/15 px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-accent hover:bg-accent/25 hover:shadow-[0_0_18px_oklch(0.82_0.22_145_/_0.5)] transition"
          >
            ▶ Run Scenario
          </button>
          <button
            onClick={() => {
              stop();
              ranger.reset();
            }}
            className="rounded-md border border-destructive/50 bg-destructive/15 px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-destructive hover:bg-destructive/25 transition"
          >
            ■ Reset
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {PHASES.map((p) => (
            <button
              key={p}
              onClick={() => jumpTo(p)}
              className={`rounded-md border px-2 py-1 font-mono text-[0.6rem] uppercase tracking-widest transition ${
                ranger.phase === p
                  ? "border-primary bg-primary/25 text-primary shadow-[0_0_14px_oklch(0.78_0.18_230_/_0.6)]"
                  : "border-panel-border bg-background/40 text-muted-foreground hover:text-primary hover:border-primary/50"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
