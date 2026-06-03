/**
 * Kyro — Autonomous AI Code Repair Engine
 * Copyright © 2026 Anish Chugh. All rights reserved.
 * Version 1.0.0 | June 2026
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { MatrixRain } from "./MatrixRain";

const STAGES = [
  {
    num: "01",
    name: "Detective",
    model: "Gemini 1.5 Flash",
    provider: "Google",
    providerColor: "#3B82F6",
    bgGlow: "rgba(59,130,246,0.08)",
    borderColor: "rgba(59,130,246,0.45)",
    tokens: 400,
    icon: "🔍",
    desc: "Reads top 5 ranked files (150 lines each). Suspects 2–3 root-cause files and explains why.",
    output: '{"suspected_files":["auth/session.ts"],"reasoning":{...}}',
  },
  {
    num: "02",
    name: "Skeptic",
    model: "Claude Haiku",
    provider: "Anthropic",
    providerColor: "#F97316",
    bgGlow: "rgba(249,115,22,0.08)",
    borderColor: "rgba(249,115,22,0.45)",
    tokens: 300,
    icon: "🤔",
    desc: "Gets only 50-line summaries to save tokens. Challenges the diagnosis and scores its own confidence.",
    output: '{"agrees":true,"confidence":0.91,"final_files":[...]}',
  },
  {
    num: "03",
    name: "Arbitrator",
    model: "Pure Python",
    provider: "Zero cost",
    providerColor: "#EAB308",
    bgGlow: "rgba(234,179,8,0.08)",
    borderColor: "rgba(234,179,8,0.45)",
    tokens: 0,
    icon: "⚖️",
    desc: "No API call. If Skeptic disagrees with ≥70% confidence → override. Otherwise → trust Detective.",
    output: "→ 1 file confirmed for patching",
  },
  {
    num: "04",
    name: "Fixer",
    model: "GPT-4o",
    provider: "OpenAI",
    providerColor: "#22C55E",
    bgGlow: "rgba(34,197,94,0.08)",
    borderColor: "rgba(34,197,94,0.45)",
    tokens: 600,
    icon: "🔧",
    desc: "Generates an exact search/replace patch. Files under 80 lines get full content; larger files get first 80.",
    output: "---FIND--- / ---REPLACE--- / ---END---",
  },
  {
    num: "05",
    name: "Validator",
    model: "Gemini 1.5 Flash",
    provider: "Google",
    providerColor: "#3B82F6",
    bgGlow: "rgba(59,130,246,0.08)",
    borderColor: "rgba(59,130,246,0.45)",
    tokens: 200,
    icon: "🔄",
    desc: "Only fires if tests fail. Reads the error output, diagnoses what went wrong, and guides one retry.",
    output: "Correction applied · tests pass",
  },
];

const TOTAL_TOKENS = 3100;
const COST_PER_REPO = "$0.013";

export function AIDebateSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-15%" });

  return (
    <section
      id="debate"
      ref={sectionRef}
      className="bg-noise relative w-full overflow-hidden py-32"
    >
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-20" />
      <MatrixRain opacity={0.03} />

      {/* Subtle horizontal scan line animation */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute h-px w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent"
            style={{ top: `${25 + i * 25}%` }}
            animate={{ x: ["-100%", "100%"] }}
            transition={{
              duration: 6 + i * 2,
              repeat: Infinity,
              ease: "linear",
              delay: i * 1.8,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mb-16 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="glass mb-4 rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.3em] text-primary"
          >
            // 03 · multi-model intelligence
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, type: "spring", stiffness: 60, damping: 14 }}
            className="font-mono text-4xl font-bold leading-tight md:text-6xl"
          >
            Three AI minds <span className="text-glow-cyan text-primary">debate</span>.
            <br />
            One correct <span className="text-glow-lime text-secondary">answer</span>.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.25 }}
            className="mt-5 max-w-2xl font-mono text-sm text-muted-foreground md:text-base"
          >
            Instead of trusting one model, Kyro runs a structured debate between Gemini,
            Claude, and GPT-4o — each checking the other's work — to maximize accuracy and
            catch hallucinations before they reach your codebase.
          </motion.p>
        </div>

        {/* Pipeline cards */}
        <div className="relative">
          {/* Connecting line behind cards (desktop only) */}
          <div className="pointer-events-none absolute inset-y-0 left-0 right-0 top-1/2 hidden -translate-y-1/2 items-center md:flex">
            <motion.div
              className="h-px w-full bg-gradient-to-r from-blue-500/20 via-orange-500/20 via-yellow-500/20 via-green-500/20 to-blue-500/20"
              initial={{ scaleX: 0, originX: 0 }}
              animate={inView ? { scaleX: 1 } : {}}
              transition={{ duration: 1.4, ease: "easeInOut", delay: 0.3 }}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            {STAGES.map((stage, i) => (
              <StageCard key={stage.num} stage={stage} index={i} inView={inView} />
            ))}
          </div>
        </div>

        {/* Token budget breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ delay: 0.2, type: "spring", stiffness: 55, damping: 16 }}
          className="glass mt-12 rounded-2xl p-6"
        >
          <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              token budget per repo analysis
            </div>
            <div className="flex items-center gap-4 font-mono text-xs">
              <span>
                <span className="text-primary">~{TOTAL_TOKENS.toLocaleString()}</span>
                <span className="text-muted-foreground"> tokens total</span>
              </span>
              <span className="text-border">·</span>
              <span>
                <span className="text-secondary">{COST_PER_REPO}</span>
                <span className="text-muted-foreground"> per analysis</span>
              </span>
              <span className="text-border">·</span>
              <span className="text-muted-foreground">
                auto-fallback to OpenAI if any provider fails
              </span>
            </div>
          </div>

          {/* Token bar breakdown */}
          <div className="space-y-2">
            {STAGES.map((s, i) => {
              const pct = s.tokens === 0 ? 0 : (s.tokens / TOTAL_TOKENS) * 100;
              return (
                <div key={s.num} className="flex items-center gap-3 font-mono text-[11px]">
                  <span className="w-24 shrink-0 text-muted-foreground">{s.name}</span>
                  <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ backgroundColor: s.providerColor }}
                      initial={{ width: 0 }}
                      animate={inView ? { width: s.tokens === 0 ? "0.5%" : `${pct}%` } : {}}
                      transition={{ delay: 0.5 + i * 0.1, duration: 0.9, ease: "easeOut" }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right" style={{ color: s.providerColor }}>
                    {s.tokens === 0 ? "0 · free" : `${s.tokens} tkns`}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Bottom reliability note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-6 font-mono text-[11px] text-muted-foreground"
        >
          {[
            { dot: "text-primary", text: "Gemini detects & validates" },
            { dot: "text-orange-400", text: "Claude challenges assumptions" },
            { dot: "text-yellow-400", text: "Python arbitrates at zero cost" },
            { dot: "text-secondary", text: "GPT-4o writes the fix" },
            { dot: "text-primary", text: "OpenAI fallback always on" },
          ].map((item, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className={`${item.dot} text-base leading-none`}>●</span>
              {item.text}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function StageCard({
  stage,
  index,
  inView,
}: {
  stage: (typeof STAGES)[number];
  index: number;
  inView: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        delay: 0.15 + index * 0.12,
        type: "spring",
        stiffness: 65,
        damping: 14,
      }}
      className="group relative flex flex-col overflow-hidden rounded-2xl"
      style={{
        background: `linear-gradient(135deg, ${stage.bgGlow}, rgba(255,255,255,0.02))`,
        border: `1px solid ${stage.borderColor}`,
      }}
    >
      {/* Colored top accent bar */}
      <div
        className="h-1 w-full"
        style={{ background: `linear-gradient(to right, ${stage.providerColor}, transparent)` }}
      />

      <div className="flex flex-1 flex-col p-4">
        {/* Stage number + icon */}
        <div className="mb-3 flex items-center justify-between">
          <span
            className="font-mono text-[10px] uppercase tracking-[0.2em]"
            style={{ color: stage.providerColor }}
          >
            stage {stage.num}
          </span>
          <span className="text-lg leading-none">{stage.icon}</span>
        </div>

        {/* Name */}
        <h3 className="mb-1 font-mono text-xl font-bold tracking-tight">{stage.name}</h3>

        {/* Provider badge */}
        <div className="mb-3 flex items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest"
            style={{
              backgroundColor: `${stage.providerColor}20`,
              color: stage.providerColor,
              border: `1px solid ${stage.providerColor}40`,
            }}
          >
            {stage.provider}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">{stage.model}</span>
        </div>

        {/* Description */}
        <p className="mb-4 flex-1 font-mono text-[11px] leading-relaxed text-muted-foreground">
          {stage.desc}
        </p>

        {/* Output snippet */}
        <div className="rounded-lg bg-black/40 px-3 py-2">
          <div
            className="mb-1 font-mono text-[9px] uppercase tracking-widest"
            style={{ color: stage.providerColor }}
          >
            output
          </div>
          <code
            className="block overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[10px]"
            style={{ color: `${stage.providerColor}cc` }}
          >
            {stage.output}
          </code>
        </div>
      </div>

      {/* Hover glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${stage.providerColor}18 0%, transparent 70%)`,
        }}
      />
    </motion.div>
  );
}
