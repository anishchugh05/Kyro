import { useCallback, useEffect, useRef } from "react";
import { useRanger } from "./RangerContext";
import { buildDemoCity, demoDiff, demoIssue, demoLogs } from "./demoData";
import type { RepoNode } from "./ranger-types";

/**
 * useDemoRunner — orchestrates a full hardcoded scenario so the
 * frontend can be visually tested without a backend.
 *
 * Timeline (ms):
 *   0     assembly starts (buildings spawn one-by-one)
 *  3000   exploring (drone orbits)
 *  4000   targeting → focus auth/session.ts, mark buggy
 *  5500   repairing → diff + repair beam
 *  9500   complete → building turns green
 */
export function useDemoRunner() {
  const ranger = useRanger();
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervals = useRef<ReturnType<typeof setInterval>[]>([]);

  const clear = useCallback(() => {
    timeouts.current.forEach(clearTimeout);
    intervals.current.forEach(clearInterval);
    timeouts.current = [];
    intervals.current = [];
  }, []);

  const schedule = (fn: () => void, ms: number) => {
    timeouts.current.push(setTimeout(fn, ms));
  };

  const run = useCallback(
    (repoUrl?: string) => {
      clear();
      ranger.reset();
      if (repoUrl) ranger.setRepoUrl(repoUrl);

      const { nodes, edges } = buildDemoCity();

      // --- Assembly: spawn buildings one-by-one
      ranger.setPhase("assembly");
      ranger.appendLog({ level: "info", message: "Boot sequence initiated." });

      const built: RepoNode[] = [];
      nodes.forEach((n, i) => {
        schedule(
          () => {
            built.push(n);
            ranger.setNodes([...built]);
            ranger.setProgress((i + 1) / nodes.length);
          },
          80 + i * 110,
        );
      });

      // Drop edges in after buildings
      schedule(
        () => {
          ranger.setEdges(edges);
        },
        80 + nodes.length * 110 + 200,
      );

      const assemblyEnd = 80 + nodes.length * 110 + 600;

      // Demo logs play on their own timeline
      demoLogs.forEach((entry) => {
        schedule(() => {
          ranger.appendLog({ level: entry.level, message: entry.message });
        }, entry.at);
      });

      // --- Exploring
      schedule(() => {
        ranger.setPhase("exploring");
        // Light random warnings to feel alive
        const warned = built.map((n, i) =>
          i % 7 === 3 ? { ...n, status: "warning" as const } : n,
        );
        ranger.setNodes(warned);
      }, assemblyEnd);

      // --- Targeting
      const targetingAt = assemblyEnd + 1200;
      schedule(() => {
        ranger.setPhase("targeting");
        ranger.setIssue(demoIssue);
        ranger.setFocusedNodeId(demoIssue.targetNodeId ?? null);
        const updated = built.map((n) =>
          n.id === demoIssue.targetNodeId ? { ...n, status: "buggy" as const } : n,
        );
        ranger.setNodes(updated);
        // Activate edges connected to the target
        const active = edges.map((e) => ({
          ...e,
          active: e.from === demoIssue.targetNodeId || e.to === demoIssue.targetNodeId,
        }));
        ranger.setEdges(active);
      }, targetingAt);

      // --- Repairing
      const repairAt = targetingAt + 1800;
      schedule(() => {
        ranger.setPhase("repairing");
        ranger.setDiff({ path: demoDiff.path, lines: [] });
      }, repairAt);

      // Stream diff lines progressively
      demoDiff.lines.forEach((line, i) => {
        schedule(
          () => {
            ranger.setDiff({
              path: demoDiff.path,
              lines: demoDiff.lines.slice(0, i + 1),
            });
          },
          repairAt + 250 + i * 220,
        );
      });

      const completeAt = repairAt + 250 + demoDiff.lines.length * 220 + 600;

      // --- Complete
      schedule(() => {
        ranger.setPhase("complete");
        const fixed = built.map((n) =>
          n.id === demoIssue.targetNodeId ? { ...n, status: "fixed" as const } : n,
        );
        ranger.setNodes(fixed);
        ranger.setProgress(1);
      }, completeAt);
    },
    [ranger, clear],
  );

  useEffect(() => () => clear(), [clear]);

  return { run, stop: clear };
}
