import { useRanger } from "@/state/RangerContext";

const PHASE_CONFIDENCE: Record<string, number> = {
  idle: 0,
  assembly: 0.2,
  exploring: 0.45,
  targeting: 0.65,
  repairing: 0.8,
  complete: 0.97,
};

const PHASE_STATUS: Record<string, string> = {
  idle: "Awaiting analysis target.",
  assembly: "Cloning & mapping repository...",
  exploring: "Scanning file structure...",
  targeting: "Pinpointing root cause...",
  repairing: "Generating targeted patch...",
  complete: "Fix verified — ready for review.",
};

export function ConfidencePanel() {
  const { phase, logs } = useRanger();

  const errorCount = logs.filter((l) => l.level === "error").length;
  const base = PHASE_CONFIDENCE[phase] ?? 0;
  const confidence = Math.max(0, Math.min(1, base - errorCount * 0.12));
  const pct = Math.round(confidence * 100);

  const kyroTime =
    phase === "complete" ? "Done" : phase === "idle" ? "—" : "< 2 min";

  const color =
    confidence > 0.72
      ? "#3dffa0"
      : confidence > 0.42
        ? "#ffb454"
        : confidence > 0.05
          ? "#ff3b5c"
          : "oklch(0.65 0.03 250)";

  const R = 34;
  const circ = 2 * Math.PI * R;
  const dash = circ * confidence;

  return (
    <aside className="pointer-events-auto holo-panel corner-brackets animate-slide-in-right flex w-[26rem] max-w-[92vw] flex-col">
      <div className="holo-panel-header shrink-0">
        <span>// kyro.confidence</span>
        <span className="font-mono text-[0.6rem] uppercase tracking-widest text-muted-foreground">
          AI certainty
        </span>
      </div>

      <div className="p-3 space-y-3">
        {/* Gauge + label */}
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            <svg width="84" height="84" viewBox="0 0 84 84">
              {/* Track */}
              <circle
                cx="42"
                cy="42"
                r={R}
                fill="none"
                stroke="oklch(0.78 0.18 230 / 0.12)"
                strokeWidth="5"
              />
              {/* Progress arc */}
              <circle
                cx="42"
                cy="42"
                r={R}
                fill="none"
                stroke={color}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circ}`}
                transform="rotate(-90 42 42)"
                style={{
                  transition: "stroke-dasharray 0.9s ease, stroke 0.5s ease",
                  filter: `drop-shadow(0 0 5px ${color})`,
                }}
              />
              <text
                x="42"
                y="46"
                textAnchor="middle"
                fontFamily="monospace"
                fontSize="15"
                fontWeight="bold"
                fill={color}
              >
                {pct}%
              </text>
            </svg>
          </div>

          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="font-mono text-xs font-semibold text-foreground/90">
              {confidence > 0.8
                ? "High Confidence"
                : confidence > 0.5
                  ? "Moderate Confidence"
                  : confidence > 0.1
                    ? "Building Confidence..."
                    : "Initializing..."}
            </div>
            <div className="font-mono text-[0.62rem] leading-relaxed text-muted-foreground">
              {PHASE_STATUS[phase] ?? "Processing..."}
            </div>
            {errorCount > 0 && (
              <div className="font-mono text-[0.58rem] text-cyber-red">
                {errorCount} error{errorCount > 1 ? "s" : ""} detected — confidence adjusted
              </div>
            )}
          </div>
        </div>

        {/* Time-to-fix comparison */}
        <div className="rounded border border-panel-border bg-background/35 px-3 py-2.5 space-y-1.5">
          <div className="font-mono text-[0.58rem] uppercase tracking-widest text-muted-foreground">
            Time-to-Fix Estimate
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="font-mono text-[0.58rem] uppercase text-muted-foreground/70">
                Kyro
              </div>
              <div className="font-mono text-sm font-bold text-cyber-green">{kyroTime}</div>
            </div>
            <div>
              <div className="font-mono text-[0.58rem] uppercase text-muted-foreground/70">
                Human avg
              </div>
              <div className="font-mono text-sm font-bold text-muted-foreground">4–8 hrs</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
