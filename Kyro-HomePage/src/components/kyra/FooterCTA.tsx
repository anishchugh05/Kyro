import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
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
    const px = e.clientX - rect.left - rect.width / 2;
    const py = e.clientY - rect.top - rect.height / 2;
    x.set(px * 0.4);
    y.set(py * 0.4);
  };
  const onLeave = () => { x.set(0); y.set(0); setHover(false); };

  const glow = useTransform(sx, [-100, 100], [0.6, 1]);

  return (
    <section id="init" className="bg-noise relative w-full overflow-hidden py-40">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" />
      <MatrixRain opacity={0.06} />

      {/* Collapsing-to-point effect: shrinking rings */}
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

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 text-center">
        <div className="glass mb-6 rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.3em] text-secondary">
          // 05 · initialize
        </div>
        <h2 className="font-mono text-5xl font-bold leading-[1.05] md:text-7xl">
          Hand Kyro the keys.
          <br />
          <span className="text-glow-lime text-secondary">Ship while you sleep.</span>
        </h2>
        <p className="mt-6 max-w-xl font-mono text-sm text-muted-foreground md:text-base">
          One repo. One command. Infinite engineering throughput. Kyro runs forever — you
          just review what shipped this morning.
        </p>

        <motion.button
          ref={ref}
          onMouseMove={onMove}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={onLeave}
          onClick={() => { window.location.href = "http://localhost:5174"; }}
          style={{ x: sx, y: sy }}
          className="group relative mt-12 inline-flex items-center gap-3 overflow-hidden rounded-full bg-secondary px-10 py-5 font-mono text-sm font-bold uppercase tracking-[0.25em] text-secondary-foreground"
        >
          {/* radial glow */}
          <motion.span
            style={{ opacity: glow }}
            className={`pointer-events-none absolute inset-0 -z-10 rounded-full transition-all duration-500 ${
              hover ? "shadow-[0_0_120px_40px_var(--lime)]" : "shadow-glow-lime"
            }`}
          />
          initialize kyro
          <ArrowUpRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </motion.button>

        <div className="mt-6 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          no credit card · sandbox-isolated · revoke any time
        </div>

        {/* footer line */}
        <div className="mt-24 flex w-full items-center justify-between border-t border-border pt-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>kyro © 2026</span>
          <span className="hidden md:inline">// the autonomous software engineer</span>
          <span className="text-primary">status: nominal ●</span>
        </div>
      </div>
    </section>
  );
}
