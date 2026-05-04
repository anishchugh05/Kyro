import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Github, Sparkles, ArrowRight, Cpu } from "lucide-react";
import { LegoCity } from "./LegoCity";
import { MatrixRain } from "./MatrixRain";

export function Hero() {
  const [url, setUrl] = useState("");
  const [pulse, setPulse] = useState(0);
  const scrollRef = useRef(0);
  const sectionRef = useRef<HTMLDivElement>(null);

  // map page scroll within the hero section to 0..1 for the camera rig
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = sectionRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const total = rect.height;
        const scrolled = Math.max(0, -rect.top);
        scrollRef.current = Math.min(1, scrolled / Math.max(1, total));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const WORKSPACE_URL = "http://localhost:5174";

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    setPulse(1);
    window.setTimeout(() => setPulse(0), 180);
  };

  const onInitialize = () => {
    const dest = url.trim()
      ? `${WORKSPACE_URL}/?repo=${encodeURIComponent(url.trim())}`
      : WORKSPACE_URL;
    window.location.href = dest;
  };

  return (
    <section
      ref={sectionRef}
      className="relative h-[100svh] w-full overflow-hidden bg-noise"
    >
      {/* 3D city — pushed to background layer */}
      <div className="absolute inset-0 z-0">
        <LegoCity pulse={pulse} scrollRef={scrollRef} />
      </div>

      {/* Subtle grid + matrix overlays (kept low) */}
      <div className="pointer-events-none absolute inset-0 z-[1] bg-grid opacity-25" />
      <div className="absolute inset-0 z-[1]">
        <MatrixRain opacity={0.04} />
      </div>
      <div className="pointer-events-none absolute inset-0 z-[1] scanline opacity-60" />

      {/* RADIAL FOG MASK — dims the 3D directly behind the headline */}
      <div
        className="pointer-events-none absolute inset-0 z-[5]"
        style={{
          background:
            "radial-gradient(ellipse 60% 55% at 50% 55%, rgba(2,2,3,0.85) 0%, rgba(2,2,3,0.55) 40%, rgba(2,2,3,0) 75%)",
        }}
      />
      {/* Top + bottom legibility gradients */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-40"
        style={{ background: "linear-gradient(to bottom, rgba(2,2,3,0.9), transparent)" }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-48"
        style={{ background: "linear-gradient(to top, rgba(2,2,3,0.95), transparent)" }}
      />

      {/* Top nav */}
      <header className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2 font-mono text-sm">
          <Cpu className="h-4 w-4 text-primary" />
          <span className="text-glow-cyan font-bold tracking-[0.3em]">KYRO</span>
          <span className="text-muted-foreground">// v0.1.0-alpha</span>
        </div>
        <nav className="hidden items-center gap-8 font-mono text-xs text-muted-foreground md:flex">
          <a href="#engine" className="transition-colors hover:text-primary">/engine</a>
          <a href="#hub" className="transition-colors hover:text-primary">/intelligence</a>
          <a href="#repair" className="transition-colors hover:text-primary">/repair</a>
          <a href="#init" className="transition-colors hover:text-secondary">/initialize</a>
        </nav>
        <div className="glass flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary shadow-glow-lime" />
          agent online
        </div>
      </header>

      {/* Center content — high z, crisp on top of fog */}
      <div className="relative z-20 flex h-full flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 60, damping: 14 }}
          className="glass mb-8 flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.3em]"
        >
          <Sparkles className="h-3 w-3 text-secondary" />
          <span className="text-glow-lime">autonomous · self-healing · always-on</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 50, damping: 14 }}
          className="max-w-5xl font-mono text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl lg:text-[5.5rem]"
          style={{ textShadow: "0 4px 40px rgba(0,0,0,0.9)" }}
        >
          The autonomous
          <br />
          <span className="text-glow-cyan text-primary">software engineer</span>
          <br />
          <span className="text-muted-foreground">that</span>{" "}
          <span className="text-glow-lime text-secondary">never sleeps.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 max-w-2xl font-mono text-sm text-muted-foreground md:text-base"
          style={{ textShadow: "0 2px 16px rgba(0,0,0,0.9)" }}
        >
          Kyro ingests entire repositories, maps every dependency, reasons about failure
          modes — then ships the patch. Drop a repo. Watch the city rebuild itself.
        </motion.p>

        {/* Repo input */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.45, type: "spring", stiffness: 80, damping: 14 }}
          className="glass shadow-glow-cyan mt-10 flex w-full max-w-2xl items-center gap-2 rounded-2xl p-2"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-background/60">
            <Github className="h-5 w-5 text-primary" />
          </div>
          <input
            value={url}
            onChange={onChange}
            onKeyDown={(e) => e.key === "Enter" && onInitialize()}
            placeholder="github.com/your-org/your-repo"
            className="flex-1 bg-transparent px-2 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground/60 md:text-base"
          />
          <button
            onClick={onInitialize}
            className="group flex h-11 items-center gap-2 rounded-xl bg-primary px-5 font-mono text-xs font-bold uppercase tracking-widest text-primary-foreground transition-transform hover:scale-[1.03] active:scale-95"
          >
            initialize
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
        >
          <span>⌘ 19,431 repos analyzed</span>
          <span className="text-primary">●</span>
          <span>2.3M LOC patched autonomously</span>
          <span className="text-secondary">●</span>
          <span>99.4% green CI rate</span>
        </motion.div>
      </div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-6 left-1/2 z-30 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground"
      >
        scroll to dive ↓
      </motion.div>
    </section>
  );
}
