import { RangerProvider } from "@/state/RangerContext";
import { RepoCityCanvas } from "@/canvas/RepoCityCanvas";
import { TopNav } from "@/components/panels/TopNav";
import { IssuePanel } from "@/components/panels/IssuePanel";
import { DiffPanel } from "@/components/panels/DiffPanel";
import { ActivityPanel } from "@/components/panels/ActivityPanel";
import { RepoPulsePanel } from "@/components/panels/RepoPulsePanel";
import { ConfidencePanel } from "@/components/panels/ConfidencePanel";
import { BottomTicker } from "@/components/panels/BottomTicker";
import { DemoControls } from "@/components/panels/DemoControls";
import { isDemoModeEnabled } from "@/lib/backend";

export function RangerWorkspace() {
  const demoEnabled = isDemoModeEnabled();

  return (
    <RangerProvider>
      <main className="relative h-screen w-screen overflow-hidden bg-background grid-bg">
        {/* 3D scene */}
        <RepoCityCanvas />

        {/* Vignette */}
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 40%, oklch(0.07 0.02 260 / 0.85) 100%)",
          }}
        />

        {/* UI shell */}
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col">
          <TopNav />

          {/* Main panel row */}
          <div className="flex flex-1 items-start justify-between gap-4 px-4 pb-2 pt-24 md:pt-28 overflow-hidden min-h-0">
            {/* Left column */}
            <div className="flex flex-col items-start gap-3 w-[22rem] shrink-0 max-h-full overflow-hidden">
              <IssuePanel />
              <RepoPulsePanel />
              {demoEnabled && <DemoControls />}
            </div>

            {/* Centre — transparent, lets 3D canvas show through */}
            <div className="flex flex-1 min-w-0" aria-hidden />

            {/* Right column */}
            <div className="flex flex-col items-start gap-3 shrink-0">
              <DiffPanel />
              <ConfidencePanel />
            </div>
          </div>

          {/* Bottom ticker */}
          <BottomTicker />

          {/* Agent log stream */}
          <div className="px-4 pb-4 pt-1">
            <ActivityPanel />
          </div>
        </div>
      </main>
    </RangerProvider>
  );
}
