/**
 * Kyro — Autonomous AI Code Repair Engine
 * Copyright © 2026 Anish Chugh. All rights reserved.
 * Version 1.0.0 | June 2026
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */
import { useRanger } from "@/state/RangerContext";
import type { DiffLine } from "@/state/ranger-types";

export function DiffPanel() {
  const { diff } = useRanger();

  return (
    <aside className="pointer-events-auto holo-panel corner-brackets scanline animate-slide-in-right flex w-[26rem] max-w-[92vw] flex-col max-h-[calc(100vh-30rem)]">
      <div className="holo-panel-header shrink-0">
        <span>// patch.stream</span>
        <span className="text-muted-foreground truncate max-w-[12rem]">{diff?.path ?? "—"}</span>
      </div>

      <div className="thin-scroll flex-1 overflow-y-auto bg-black/45 font-mono text-[0.72rem] leading-relaxed">
        {!diff || diff.lines.length === 0 ? (
          <div className="p-4 text-muted-foreground/70">
            <span className="neon-text-blue">$</span> awaiting patch stream
            <span className="ml-1 inline-block h-3 w-1.5 animate-blink bg-current align-middle" />
          </div>
        ) : (
          <pre className="m-0 p-0">
            {diff.lines.map((l, i) => (
              <DiffRow key={i} line={l} />
            ))}
          </pre>
        )}
      </div>
    </aside>
  );
}

function DiffRow({ line }: { line: DiffLine }) {
  const sigil =
    line.kind === "add" ? "+" : line.kind === "del" ? "-" : line.kind === "hunk" ? "@" : " ";

  const cls =
    line.kind === "add"
      ? "bg-[oklch(0.82_0.22_145/0.10)] text-cyber-green"
      : line.kind === "del"
        ? "bg-[oklch(0.65_0.27_22/0.12)] text-cyber-red"
        : line.kind === "hunk"
          ? "text-cyber-purple bg-[oklch(0.65_0.25_305/0.08)]"
          : "text-foreground/75";

  return (
    <div className={`flex items-start px-3 py-0.5 ${cls}`}>
      <span className="w-6 select-none text-right pr-2 text-muted-foreground/60">
        {line.lineNo ?? ""}
      </span>
      <span className="w-4 select-none text-center opacity-80">{sigil}</span>
      <span className="whitespace-pre-wrap break-all">{line.content}</span>
    </div>
  );
}
