import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/kyra/Hero";
import { WarpSection } from "@/components/kyra/WarpSection";
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

function Index() {
  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-background text-foreground">
      <Hero />
      <WarpSection />
      <FeatureHub />
      <RepairSection />
      <FooterCTA />
    </main>
  );
}
