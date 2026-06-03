/**
 * Kyro — Autonomous AI Code Repair Engine
 * Copyright © 2026 Anish Chugh. All rights reserved.
 * Version 1.0.0 | June 2026
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */
import { useRanger } from "@/state/RangerContext";

/**
 * Left panel — selected GitHub Issue context.
 * Displays nothing (a graceful empty state) until an issue is set.
 */
export function IssuePanel() {
  const { issue } = useRanger();

  return (
    <aside className="pointer-events-auto holo-panel corner-brackets animate-slide-in-left flex w-[22rem] max-w-[90vw] flex-col max-h-[min(28rem,45vh)]">
      <div className="holo-panel-header">
        <span>// issue.context</span>
        {issue?.number != null && <span className="text-muted-foreground">#{issue.number}</span>}
      </div>

      <div className="thin-scroll flex-1 overflow-y-auto p-4">
        {!issue ? (
          <EmptyState
            label="Awaiting issue selection"
            sub="When the agent picks a target issue from the repo, its context will materialize here."
          />
        ) : (
          <div className="space-y-3">
            <h2 className="font-mono text-sm font-semibold neon-text-blue leading-snug">
              {issue.title ?? "Untitled issue"}
            </h2>

            {issue.labels && issue.labels.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {issue.labels.map((l) => (
                  <span
                    key={l}
                    className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-primary"
                  >
                    {l}
                  </span>
                ))}
              </div>
            )}

            {issue.body && (
              <div className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground/85">
                {issue.body}
              </div>
            )}

            {issue.url && (
              <a
                href={issue.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono text-[0.65rem] uppercase tracking-widest text-cyber-green hover:underline"
              >
                view on github →
              </a>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function EmptyState({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="flex h-full flex-col items-start gap-2 py-8 text-left">
      <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <p className="font-mono text-[0.7rem] leading-relaxed text-muted-foreground/70">{sub}</p>
      <div className="mt-3 h-px w-full bg-gradient-to-r from-primary/40 to-transparent" />
    </div>
  );
}
