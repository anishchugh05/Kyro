/**
 * Kyro — Autonomous AI Code Repair Engine
 * Copyright © 2026 Anish Chugh. All rights reserved.
 * Version 1.0.0 | June 2026
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */
import { motion } from "framer-motion";
import { Shield, GitPullRequest, FileCode2, Bug, Workflow, Lock, TestTube2, Boxes } from "lucide-react";
import { MatrixRain } from "./MatrixRain";

const diff = [
  { t: "- async function refresh(token) {", k: "del" },
  { t: "-   const res = await fetch('/api/refresh');", k: "del" },
  { t: "-   return res.json();", k: "del" },
  { t: "+ async function refresh(token: string) {", k: "add" },
  { t: "+   return await mutex.runExclusive(async () => {", k: "add" },
  { t: "+     const res = await fetchWithBackoff('/api/refresh', token);", k: "add" },
  { t: "+     if (!res.ok) throw new AuthError(res.status);", k: "add" },
  { t: "+     return res.json();", k: "add" },
  { t: "+   });", k: "add" },
  { t: "+ }", k: "add" },
];

const tiles = [
  { icon: Shield, title: "Policy-aware", body: "Enforces your codeowners, security rules, and style guide on every patch." },
  { icon: GitPullRequest, title: "PR-native", body: "Ships review-ready PRs with rationale, tests, and risk assessment attached." },
  { icon: Bug, title: "Bug forensics", body: "Reproduces failures locally, bisects history, identifies the root commit." },
  { icon: Workflow, title: "Workflow aware", body: "Reads your CI, your queues, your feature flags. Acts inside your reality." },
  { icon: Lock, title: "Sandbox-isolated", body: "Every change runs inside an ephemeral, read-only-by-default environment." },
  { icon: TestTube2, title: "Test synthesis", body: "Generates regressions tests targeting the exact code path it just touched." },
];

export function FeatureHub() {
  return (
    <section id="hub" className="bg-noise relative w-full overflow-hidden py-32">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-25" />
      <MatrixRain opacity={0.04} />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="mb-16 flex flex-col items-center text-center">
          <div className="glass mb-4 rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
            // 03 · dense intelligence
          </div>
          <h2 className="font-mono text-4xl font-bold leading-tight md:text-6xl">
            Every pixel is a <span className="text-glow-cyan text-primary">signal</span>.
            <br />
            Every signal is <span className="text-glow-lime text-secondary">action</span>.
          </h2>
        </div>

        {/* Dense grid - zero gaps illusion via thin borders */}
        <div className="grid grid-cols-12 gap-2">
          {/* Live diff viewer */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ type: "spring", stiffness: 60, damping: 16 }}
            className="glass col-span-12 overflow-hidden rounded-2xl p-5 md:col-span-7"
          >
            <div className="mb-3 flex items-center justify-between font-mono text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileCode2 className="h-4 w-4 text-primary" />
                src/auth/session.ts
              </div>
              <div className="flex items-center gap-3">
                <span className="text-destructive">−3</span>
                <span className="text-secondary">+7</span>
                <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-secondary">
                  patch ready
                </span>
              </div>
            </div>
            <div className="overflow-hidden rounded-lg bg-background/70 p-4 font-mono text-[12px] leading-6">
              {diff.map((l, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className={
                    l.k === "add"
                      ? "bg-secondary/10 px-2 text-secondary"
                      : "bg-destructive/10 px-2 text-destructive/90"
                  }
                >
                  {l.t}
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Vertical analytics card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ delay: 0.1, type: "spring", stiffness: 60, damping: 16 }}
            className="glass col-span-12 rounded-2xl p-5 md:col-span-5"
          >
            <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              <Boxes className="h-4 w-4 text-secondary" /> throughput · last 24h
            </div>
            <div className="font-mono text-5xl font-bold">
              <span className="text-glow-cyan text-primary">8,412</span>
              <span className="ml-2 align-top text-xs text-secondary">▲ 23%</span>
            </div>
            <div className="mb-4 font-mono text-[11px] text-muted-foreground">autonomous merges shipped</div>
            <div className="flex h-24 items-end gap-1">
              {Array.from({ length: 32 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${20 + ((i * 13) % 80)}%` }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.02, type: "spring", stiffness: 80 }}
                  className="flex-1 rounded-sm"
                  style={{
                    background:
                      i % 5 === 0
                        ? "linear-gradient(to top, var(--lime), transparent)"
                        : "linear-gradient(to top, var(--cyan), transparent)",
                  }}
                />
              ))}
            </div>
          </motion.div>

          {/* Feature tiles */}
          {tiles.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.06, type: "spring", stiffness: 80, damping: 14 }}
              className="glass group relative col-span-6 overflow-hidden rounded-2xl p-5 md:col-span-4 lg:col-span-3"
            >
              <div className="absolute inset-0 -z-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 transition-colors duration-500 group-hover:from-primary/10 group-hover:to-secondary/5" />
              <t.icon className="mb-3 h-5 w-5 text-primary transition-transform group-hover:scale-110" />
              <h4 className="mb-1 font-mono text-base font-bold">{t.title}</h4>
              <p className="font-mono text-xs leading-relaxed text-muted-foreground">{t.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
