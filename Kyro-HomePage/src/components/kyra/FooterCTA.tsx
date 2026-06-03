/**
 * Kyro — Autonomous AI Code Repair Engine
 * Copyright © 2026 Anish Chugh. All rights reserved.
 * Version 1.0.0 | June 2026
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */
import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowUpRight, Cpu } from "lucide-react";
import { MatrixRain } from "./MatrixRain";

export function FooterCTA() {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 18 });
  const sy = useSpring(y, { stiffness: 200, damping: 18 });
  const [hover, setHover] = useState(false);

  const onMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left - rect.width / 2) * 0.4);
    y.set((e.clientY - rect.top - rect.height / 2) * 0.4);
  };
  const onLeave = () => { x.set(0); y.set(0); setHover(false); };
  const glow = useTransform(sx, [-100, 100], [0.6, 1]);

  const workspaceUrl =
    (import.meta.env.VITE_WORKSPACE_URL as string | undefined)?.trim() || "http://localhost:5174";

  return (
    <section id="init" className="bg-noise relative w-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" />
      <MatrixRain opacity={0.06} />

      {/* Collapsing-to-point rings */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-primary/20"
            initial={{ width: 800, height: 800, opacity: 0 }}
            whileInView={{ width: 80, height: 80, opacity: [0, 0.4, 0] }}
            viewport={{ once: false, margin: "-30%" }}
            transition={{ duration: 3, delay: i * 0.6, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* ── CTA content (centred) ──────────────────────────────────────── */}
      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 pt-40 pb-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass mb-6 rounded-full px-3 py-1 font-mono text-xs uppercase tracking-[0.3em] text-secondary"
        >
          // 06 · initialize
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.08, type: "spring", stiffness: 55, damping: 14 }}
          className="font-mono text-5xl font-bold leading-[1.05] md:text-7xl"
        >
          Hand Kyro the keys.
          <br />
          <span className="text-glow-lime text-secondary">Ship while you sleep.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-6 max-w-xl font-mono text-base text-muted-foreground md:text-lg"
        >
          One repo. One command. Infinite engineering throughput. Kyro runs forever
          — you just review what shipped this morning.
        </motion.p>

        <motion.button
          ref={ref}
          onMouseMove={onMove}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={onLeave}
          onClick={() => { window.location.href = workspaceUrl; }}
          style={{ x: sx, y: sy }}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="group relative mt-12 inline-flex items-center gap-3 overflow-hidden rounded-full bg-secondary px-10 py-5 font-mono text-sm font-bold uppercase tracking-[0.25em] text-secondary-foreground"
        >
          <motion.span
            style={{ opacity: glow }}
            className={`pointer-events-none absolute inset-0 -z-10 rounded-full transition-all duration-500 ${
              hover ? "shadow-[0_0_120px_40px_var(--lime)]" : "shadow-glow-lime"
            }`}
          />
          initialize kyro
          <ArrowUpRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </motion.button>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-5 font-mono text-sm uppercase tracking-[0.3em] text-muted-foreground"
        >
          no credit card · sandbox-isolated · revoke any time
        </motion.div>
      </div>

      {/* ── Full-width footer bar ──────────────────────────────────────── */}
      <div className="relative z-10 border-t border-white/8">
        {/* Top row — spans full width */}
        <div className="flex items-center justify-between px-10 py-5 font-mono text-sm text-muted-foreground">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-primary/40 bg-primary/10">
              <Cpu className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="font-bold tracking-[0.25em] text-foreground/90">KYRO</span>
            <span className="text-muted-foreground/60">v1.0.0</span>
          </div>

          {/* Tagline — hidden on small screens */}
          <span className="hidden lg:block text-muted-foreground/70">
            // the autonomous software engineer
          </span>

          {/* Status */}
          <div className="flex items-center gap-2 text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs uppercase tracking-widest">status: nominal</span>
          </div>
        </div>

        {/* Copyright row */}
        <div className="border-t border-white/5 px-10 py-4 text-center font-mono text-xs text-muted-foreground/55">
          © 2026 Anish Chugh. All rights reserved. · Kyro v1.0.0 · Built for engineers who ship.
        </div>
      </div>
    </section>
  );
}
