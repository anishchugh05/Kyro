import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Brain, Network, Activity, GitBranch, Zap, Eye } from "lucide-react";
import { MatrixRain } from "./MatrixRain";

const terminalLines = [
  { t: "$ kyro ingest --repo ./monorepo", c: "text-primary" },
  { t: "→ parsing AST across 1,284 files…", c: "text-muted-foreground" },
  { t: "→ building dependency graph (12.3k edges)", c: "text-muted-foreground" },
  { t: "✓ context window assembled: 3.1M tokens", c: "text-secondary" },
  { t: "$ kyro reason --target auth/session.ts", c: "text-primary" },
  { t: "→ detected: race condition on token refresh", c: "text-destructive" },
  { t: "→ proposing patch: mutex + exponential backoff", c: "text-muted-foreground" },
  { t: "✓ tests synthesized · 14 pass · 0 regressions", c: "text-secondary" },
  { t: "$ kyro ship --pr", c: "text-primary" },
];

export function WarpSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const blur = useTransform(scrollYProgress, [0, 0.5, 1], [8, 0, 8]);

  return (
    <section id="engine" ref={ref} className="bg-noise relative w-full overflow-hidden py-32">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" />
      <MatrixRain opacity={0.04} />

      {/* Warp streaks */}
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-[2px] rounded-full bg-gradient-to-r from-transparent via-primary to-transparent"
            style={{
              top: `${(i * 37) % 100}%`,
              left: 0,
              right: 0,
              opacity: 0.18,
            }}
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 2 + (i % 5), repeat: Infinity, ease: "linear", delay: i * 0.1 }}
          />
        ))}
      </div>

      <motion.div style={{ y }} className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="mb-16 flex flex-col items-center text-center">
          <div className="glass mb-4 rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.3em] text-secondary">
            // 02 · deep context ingestion
          </div>
          <h2 className="font-mono text-4xl font-bold leading-tight md:text-6xl">
            Warp through your <span className="text-glow-cyan text-primary">codebase</span>
            <br />
            at the speed of <span className="text-glow-lime text-secondary">thought</span>.
          </h2>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-12 gap-3">
          {/* Card 1 — dependency graph */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ type: "spring", stiffness: 60, damping: 16 }}
            style={{ filter: useTransform(blur, (b) => `blur(${b}px)`) }}
            className="glass relative col-span-12 row-span-2 overflow-hidden rounded-2xl p-6 md:col-span-7"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                <Network className="h-4 w-4 text-primary" />
                autonomous mapping
              </div>
              <span className="font-mono text-[10px] text-secondary">live</span>
            </div>
            <h3 className="mb-2 font-mono text-2xl font-bold">Dependency graph, materialized.</h3>
            <p className="mb-6 max-w-md font-mono text-sm text-muted-foreground">
              Every import, every type flow, every transitive closure — rendered as a
              navigable lattice Kyro walks before touching a single line.
            </p>
            <DependencyGraph />
          </motion.div>

          {/* Card 2 — reasoning terminal */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ delay: 0.1, type: "spring", stiffness: 60, damping: 16 }}
            className="glass relative col-span-12 row-span-2 overflow-hidden rounded-2xl p-6 md:col-span-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                <Brain className="h-4 w-4 text-secondary" />
                reasoning engine
              </div>
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-destructive" />
                <span className="h-2 w-2 rounded-full bg-secondary" />
                <span className="h-2 w-2 rounded-full bg-primary" />
              </div>
            </div>
            <div className="h-[260px] overflow-hidden rounded-lg bg-background/60 p-3 font-mono text-[11px] leading-relaxed">
              {terminalLines.map((l, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 }}
                  className={l.c}
                >
                  {l.t}
                </motion.div>
              ))}
              <span className="caret text-primary" />
            </div>
          </motion.div>

          {/* Mini stat tiles */}
          {[
            { icon: Activity, label: "patches/min", value: "37.4", color: "text-primary" },
            { icon: GitBranch, label: "branches scanned", value: "1,294", color: "text-secondary" },
            { icon: Zap, label: "avg latency", value: "82ms", color: "text-primary" },
            { icon: Eye, label: "files in context", value: "12.4k", color: "text-secondary" },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + i * 0.08, type: "spring", stiffness: 80, damping: 14 }}
              className="glass col-span-6 rounded-2xl p-4 md:col-span-3"
            >
              <s.icon className={`mb-2 h-4 w-4 ${s.color}`} />
              <div className="font-mono text-2xl font-bold">{s.value}</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

function DependencyGraph() {
  const nodes = [
    { x: 50, y: 80, r: 8, c: "var(--cyan)" },
    { x: 140, y: 50, r: 6, c: "var(--lime)" },
    { x: 230, y: 100, r: 10, c: "var(--cyan)" },
    { x: 320, y: 60, r: 7, c: "var(--lime)" },
    { x: 410, y: 130, r: 9, c: "var(--cyan)" },
    { x: 100, y: 180, r: 7, c: "var(--lime)" },
    { x: 220, y: 220, r: 11, c: "var(--cyan)" },
    { x: 360, y: 200, r: 6, c: "var(--lime)" },
    { x: 470, y: 240, r: 8, c: "var(--cyan)" },
  ];
  const edges = [
    [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [2, 6], [6, 7], [7, 8], [4, 8], [1, 6], [3, 7],
  ];
  return (
    <svg viewBox="0 0 520 280" className="h-[260px] w-full">
      <defs>
        <linearGradient id="edge" x1="0" x2="1">
          <stop offset="0%" stopColor="#00F2FF" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#CCFF00" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      {edges.map(([a, b], i) => (
        <motion.line
          key={i}
          x1={nodes[a].x} y1={nodes[a].y}
          x2={nodes[b].x} y2={nodes[b].y}
          stroke="url(#edge)" strokeWidth="1.2"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay: i * 0.08 }}
        />
      ))}
      {nodes.map((n, i) => (
        <motion.circle
          key={i}
          cx={n.x} cy={n.y} r={n.r}
          fill={n.c}
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 + i * 0.05, type: "spring", stiffness: 200, damping: 12 }}
          style={{ filter: `drop-shadow(0 0 6px ${n.c})`, transformOrigin: `${n.x}px ${n.y}px` }}
        />
      ))}
    </svg>
  );
}
