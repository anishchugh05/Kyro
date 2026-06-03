/**
 * Kyro — Autonomous AI Code Repair Engine
 * Copyright © 2026 Anish Chugh. All rights reserved.
 * Version 1.0.0 | June 2026
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */
import { createFileRoute } from "@tanstack/react-router";
import { motion, useScroll, useSpring } from "framer-motion";
import { Hero } from "@/components/kyra/Hero";
import { LanguagesTicker } from "@/components/kyra/LanguagesTicker";
import { WarpSection } from "@/components/kyra/WarpSection";
import { AIDebateSection } from "@/components/kyra/AIDebateSection";
import { FeatureHub } from "@/components/kyra/FeatureHub";
import { RepairSection } from "@/components/kyra/RepairSection";
import { FooterCTA } from "@/components/kyra/FooterCTA";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Kyro — The Autonomous Software Engineer" },
      {
        name: "description",
        content:
          "Kyro ingests entire repositories, maps every dependency, and ships review-ready patches autonomously. The AI software engineer that never sleeps.",
      },
      { property: "og:title", content: "Kyro — The Autonomous Software Engineer" },
      {
        property: "og:description",
        content:
          "Drop a GitHub repo. Watch Kyro map, reason, and self-heal your codebase in real time.",
      },
    ],
  }),
});

function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      className="fixed left-0 right-0 top-0 z-[200] h-[2px] origin-left"
      style={{
        scaleX,
        background: "linear-gradient(to right, var(--cyan), var(--lime), var(--cyan))",
        boxShadow: "0 0 8px var(--cyan)",
      }}
    />
  );
}

function Index() {
  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-background text-foreground">
      <ScrollProgressBar />
      <Hero />
      <LanguagesTicker />
      <WarpSection />
      <AIDebateSection />
      <FeatureHub />
      <RepairSection />
      <FooterCTA />
    </main>
  );
}
