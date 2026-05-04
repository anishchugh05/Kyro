import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { AlertTriangle, CheckCircle2, Zap } from "lucide-react";
import { MatrixRain } from "./MatrixRain";

function Building({ state }: { state: "broken" | "fixed" }) {
  const broken = state === "broken";
  const color = broken ? "var(--destructive)" : "var(--lime)";
  return (
    <svg viewBox="0 0 200 260" className="h-[280px] w-full">
      <defs>
        <linearGradient id={`bg-${state}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.9" />
          <stop offset="100%" stopColor={color} stopOpacity="0.4" />
        </linearGradient>
      </defs>
      {/* base shadow */}
      <ellipse cx="100" cy="245" rx="70" ry="6" fill={color} opacity="0.25" />
      {/* tower */}
      <motion.g
        animate={broken ? { x: [0, -1, 1, -1, 0] } : { x: 0 }}
        transition={{ duration: 0.4, repeat: broken ? Infinity : 0 }}
      >
        <rect x="55" y="60" width="90" height="180" rx="6" fill={`url(#bg-${state})`} />
        {/* studs */}
        {[0, 1, 2].map((c) =>
          [0, 1, 2].map((r) => (
            <circle
              key={`${c}-${r}`}
              cx={70 + c * 30}
              cy={50 - r * 0}
              r="6"
              fill={color}
              opacity="0.85"
            />
          ))
        )}
        {/* windows */}
        {Array.from({ length: 5 }).map((_, row) => (
          <g key={row}>
            <rect x="68" y={80 + row * 30} width="22" height="14" fill="#020203" opacity="0.7" />
            <rect x="98" y={80 + row * 30} width="22" height="14" fill="#020203" opacity="0.7" />
          </g>
        ))}
        {broken && (
          <>
            <path d="M55 130 L145 150" stroke="var(--destructive)" strokeWidth="2" />
            <path d="M55 180 L145 200" stroke="var(--destructive)" strokeWidth="2" />
          </>
        )}
      </motion.g>
    </svg>
  );
}

export function RepairSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-30%" });

  return (
    <section id="repair" ref={ref} className="bg-noise relative w-full overflow-hidden py-32">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-25" />
      <MatrixRain opacity={0.05} />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="mb-12 flex flex-col items-center text-center">
          <div className="glass mb-4 rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.3em] text-secondary">
            // 04 · self-healing
          </div>
          <h2 className="font-mono text-4xl font-bold leading-tight md:text-6xl">
            Watch the <span className="text-glow-cyan text-primary">core</span> repair
            <br />
            a <span className="text-glow-lime text-secondary">broken module</span>, live.
          </h2>
        </div>

        <div className="grid grid-cols-1 items-center gap-2 md:grid-cols-3">
          {/* BROKEN */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 60, damping: 16 }}
            className="glass relative overflow-hidden rounded-2xl p-6"
          >
            <div className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-destructive">
              <AlertTriangle className="h-4 w-4 animate-pulse" /> failing module
            </div>
            <Building state="broken" />
            <div className="mt-3 font-mono text-[11px] text-muted-foreground">
              <span className="text-destructive">●</span> tests failing · 14
              <br />
              <span className="text-destructive">●</span> regression detected · session.ts
            </div>
          </motion.div>

          {/* CORE / LASER */}
          <div className="relative flex items-center justify-center py-6">
            <motion.div
              animate={{ scale: [1, 1.08, 1], rotate: [0, 90, 180] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="relative h-32 w-32 rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, #ffffff, #00F2FF 40%, #020203 80%)",
                boxShadow: "0 0 60px var(--cyan), 0 0 120px var(--cyan)",
              }}
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <Zap className="h-6 w-6 text-secondary text-glow-lime" />
            </div>
            {/* laser beams */}
            {inView && (
              <>
                <motion.div
                  initial={{ scaleX: 0, originX: 1 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 1.2, delay: 0.4, ease: "easeOut" }}
                  className="absolute left-[-40%] top-1/2 h-[3px] w-1/2 origin-right rounded-full bg-gradient-to-l from-primary via-primary to-transparent shadow-glow-cyan"
                />
                <motion.div
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 1.2, delay: 0.4, ease: "easeOut" }}
                  className="absolute right-[-40%] top-1/2 h-[3px] w-1/2 origin-left rounded-full bg-gradient-to-r from-secondary via-secondary to-transparent shadow-glow-lime"
                />
              </>
            )}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              kyra core · patching
            </div>
          </div>

          {/* FIXED */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, type: "spring", stiffness: 60, damping: 16 }}
            className="glass relative overflow-hidden rounded-2xl p-6"
          >
            <div className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-secondary">
              <CheckCircle2 className="h-4 w-4" /> repaired · merged
            </div>
            <Building state="fixed" />
            <div className="mt-3 font-mono text-[11px] text-muted-foreground">
              <span className="text-secondary">●</span> tests passing · 14/14
              <br />
              <span className="text-secondary">●</span> PR #3,481 merged · 4.2s ago
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
