import { useState, useEffect, type FormEvent } from "react";
import { useRanger } from "@/state/RangerContext";
import { useDemoRunner } from "@/state/useDemoRunner";
import { useBackendRunner } from "@/hooks/useBackendRunner";
import { getBackendHttpUrl, isDemoModeEnabled, normalizeRepoUrl } from "@/lib/backend";

const BACKEND_URL = getBackendHttpUrl();
const BACKEND_AVAILABLE = Boolean(BACKEND_URL);
const DEMO_ENABLED = isDemoModeEnabled();

export function TopNav({ initialRepo = "" }: { initialRepo?: string }) {
  const { repoUrl, phase } = useRanger();
  const [draft, setDraft] = useState(initialRepo);
  const [formError, setFormError] = useState<string | null>(null);
  const [mode, setMode] = useState<"demo" | "live">(BACKEND_AVAILABLE ? "live" : "demo");
  const { run: runDemo } = useDemoRunner();
  const { run: runLive, isConnected, error } = useBackendRunner();

  useEffect(() => {
    if (!initialRepo) return;
    const url = normalizeRepoUrl(initialRepo);
    if (!url) return;
    if (mode === "live" && BACKEND_AVAILABLE) {
      void runLive(url);
    } else if (mode === "demo" && DEMO_ENABLED) {
      runDemo(url);
    }
    // Only fire once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const url = normalizeRepoUrl(draft);
    if (!url) {
      setFormError("Enter a GitHub repository URL or owner/repo to analyze.");
      return;
    }
    if (mode === "live") {
      if (!BACKEND_AVAILABLE) {
        setFormError("Backend URL is not configured (set VITE_BACKEND_URL).");
        return;
      }
      void runLive(url);
      return;
    }
    if (DEMO_ENABLED) runDemo(url);
  };

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center px-4 pt-4">
      {/* Widened to max-w-6xl so the URL input has breathing room */}
      <div className="pointer-events-auto holo-panel corner-brackets w-full max-w-6xl animate-slide-up">
        <div className="flex items-center gap-3 px-5 py-3">
          <Logo />

          {/* Brand — only on medium+ screens */}
          <div className="hidden lg:flex flex-col leading-tight shrink-0">
            <span className="font-mono text-[0.6rem] tracking-[0.25em] text-muted-foreground uppercase">
              Autonomous · AI · Engineer
            </span>
            <KyroGlitchLogo />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-1.5 min-w-0">
            <div className="flex items-center gap-2">
              {/* URL input — takes all remaining space */}
              <div className="relative flex-1 min-w-0">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-cyber-blue/60 select-none">
                  {">"}
                </span>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="github.com/owner/repository"
                  className="w-full rounded-md bg-background/70 border border-panel-border pl-8 pr-4 py-2.5 font-mono text-base text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary focus:ring-2 focus:ring-ring transition"
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>

              {/* Live / Demo toggle — only shown when both modes are available */}
              {DEMO_ENABLED && (
                <div className="flex shrink-0 rounded-md border border-panel-border overflow-hidden">
                  {(["live", "demo"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`px-3 py-2.5 font-mono text-[0.6rem] uppercase tracking-widest transition whitespace-nowrap ${
                        mode === m
                          ? m === "live"
                            ? "bg-accent/25 text-accent"
                            : "bg-primary/20 text-primary"
                          : "bg-background/40 text-muted-foreground hover:text-foreground"
                      } border-r border-panel-border last:border-r-0`}
                    >
                      {m === "live" ? "⚡ Live" : "◎ Demo"}
                    </button>
                  ))}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={mode === "live" && isConnected}
                className="btn-magnetic shrink-0 rounded-md border border-primary/50 bg-primary/15 px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-primary hover:bg-primary/25 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
              >
                {mode === "live" && isConnected ? "Analyzing…" : "Analyze Repo"}
              </button>
            </div>

            {/* Inline errors — compact, no extra row when clean */}
            {(formError || error) && (
              <div className="font-mono text-[0.68rem] text-destructive truncate">
                ✗ {formError ?? error}
              </div>
            )}
          </form>

          <PhaseChip phase={phase} />
        </div>

        {/* Active target URL bar — shown after analysis starts */}
        {repoUrl && (
          <div className="flex items-center gap-2 px-5 pb-2.5 font-mono text-[0.65rem] text-muted-foreground">
            <span className="shrink-0">target ::</span>
            <span className="text-cyber-green min-w-0 break-all">{repoUrl}</span>
            {mode === "live" && isConnected && (
              <span className="shrink-0 text-accent animate-pulse ml-1">● live</span>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

function KyroGlitchLogo() {
  return (
    <div className="relative select-none">
      {/* Base text */}
      <span
        className="relative z-10 font-mono text-sm font-bold tracking-[0.3em] text-primary"
        style={{ textShadow: "0 0 18px oklch(0.78 0.18 230 / 0.75)" }}
      >
        KYRO
      </span>
      {/* Glitch ghost layer — animates with clip-path at long intervals */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 font-mono text-sm font-bold tracking-[0.3em] animate-glitch"
      >
        KYRO
      </span>
    </div>
  );
}

function Logo() {
  return (
    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-primary/40 bg-primary/10 shadow-[0_0_12px_rgba(58,169,255,0.5)]">
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-primary">
        <path
          fill="currentColor"
          d="M12 2 4 6v6c0 5 3.4 9.4 8 10 4.6-.6 8-5 8-10V6l-8-4Zm0 4 4 2v3.6c0 3-2 5.7-4 6.4-2-.7-4-3.4-4-6.4V8l4-2Z"
        />
      </svg>
    </div>
  );
}

function PhaseChip({ phase }: { phase: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    idle:      { label: "Idle",       cls: "text-muted-foreground border-border" },
    assembly:  { label: "Assembling", cls: "neon-text-blue border-primary/50 animate-pulse-glow" },
    exploring: { label: "Exploring",  cls: "neon-text-blue border-primary/50" },
    targeting: { label: "Targeting",  cls: "neon-text-red border-destructive/60 animate-pulse-glow" },
    repairing: { label: "Repairing",  cls: "neon-text-blue border-primary/60 animate-pulse-glow" },
    complete:  { label: "Complete",   cls: "neon-text-green border-accent/60" },
  };
  const meta = map[phase] ?? map.idle;
  return (
    <div
      className={`hidden md:flex shrink-0 items-center gap-2 rounded-md border px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-widest ${meta.cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {meta.label}
    </div>
  );
}
