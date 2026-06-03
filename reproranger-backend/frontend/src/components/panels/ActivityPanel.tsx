/**
 * Kyro — Autonomous AI Code Repair Engine
 * Copyright © 2026 Anish Chugh. All rights reserved.
 * Version 1.0.0 | June 2026
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */
import { useEffect, useRef, useState } from "react";
import { useRanger } from "@/state/RangerContext";
import type { ActivityLogEntry, LogLevel } from "@/state/ranger-types";

const LEVEL_LABEL: Record<LogLevel, string> = {
  info: "INFO",
  thought: "THINK",
  action: "ACT",
  success: "OK",
  error: "ERR",
};

const LEVEL_CLS: Record<LogLevel, string> = {
  info: "text-cyber-blue border-primary/40",
  thought: "text-cyber-purple border-[oklch(0.65_0.25_305/0.5)]",
  action: "text-foreground border-border",
  success: "text-cyber-green border-accent/40",
  error: "text-cyber-red border-destructive/50",
};

const PROVIDER_CLS: Record<string, string> = {
  gemini: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  claude: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  openai: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  python: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  system: "bg-zinc-500/20 text-zinc-400 border-zinc-500/40",
};

const PROVIDER_LABEL: Record<string, string> = {
  gemini: "Gemini",
  claude: "Claude",
  openai: "GPT-4o",
  python: "Python",
  system: "System",
};

export function ActivityPanel() {
  const { logs } = useRanger();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [userScrolled, setUserScrolled] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || userScrolled) return;
    el.scrollTop = el.scrollHeight;
  }, [logs.length, userScrolled]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 32;
    setUserScrolled(!atBottom);
  }

  function scrollToBottom() {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setUserScrolled(false);
  }

  return (
    <section className="pointer-events-auto holo-panel corner-brackets animate-slide-up mx-auto w-full max-w-5xl">
      <div className="holo-panel-header">
        <span>// agent.stream</span>
        <span className="flex items-center gap-3 text-muted-foreground">
          {userScrolled && (
            <button
              onClick={scrollToBottom}
              className="font-mono text-[0.6rem] uppercase tracking-widest text-primary hover:text-primary/80 transition"
            >
              ↓ latest
            </button>
          )}
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyber-green animate-pulse-glow" />
            {logs.length} events
          </span>
        </span>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="thin-scroll max-h-72 min-h-[7rem] overflow-y-auto p-3"
      >
        {logs.length === 0 ? (
          <div className="font-mono text-[0.7rem] text-muted-foreground/70">
            <span className="neon-text-blue">●</span> standby — no agent activity yet
          </div>
        ) : (
          <ul className="space-y-1">
            {logs.map((entry) => (
              <LogRow key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function LogRow({ entry }: { entry: ActivityLogEntry }) {
  const time = entry.timestamp
    ? new Date(entry.timestamp).toLocaleTimeString(undefined, { hour12: false })
    : "";

  const providerCls = entry.provider
    ? (PROVIDER_CLS[entry.provider] ?? PROVIDER_CLS.system)
    : null;
  const providerLabel = entry.provider
    ? (PROVIDER_LABEL[entry.provider] ?? entry.provider)
    : null;

  return (
    <li className="flex items-start gap-3 font-mono text-[0.72rem] leading-relaxed animate-fade-in">
      <span className="w-16 shrink-0 text-muted-foreground/70">{time}</span>

      <span
        className={`shrink-0 rounded border px-1.5 py-px text-[0.6rem] uppercase tracking-widest ${LEVEL_CLS[entry.level]}`}
      >
        {LEVEL_LABEL[entry.level]}
      </span>

      {providerCls && providerLabel && (
        <span
          className={`shrink-0 rounded border px-1.5 py-px text-[0.6rem] uppercase tracking-widest ${providerCls}`}
        >
          {providerLabel}
        </span>
      )}

      <span className="break-words text-foreground/90">{entry.message}</span>
    </li>
  );
}
