/**
 * Kyro — Autonomous AI Code Repair Engine
 * Copyright © 2026 Anish Chugh. All rights reserved.
 * Version 1.0.0 | June 2026
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */
import { useEffect, useRef } from "react";

export function MatrixRain({ opacity = 0.06 }: { opacity?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0, h = 0;
    const chars = "01アカサタナハマヤラワABCDEF{}<>=>[]";
    let cols: number[] = [];
    const fontSize = 14;

    const resize = () => {
      w = canvas.width = canvas.offsetWidth * devicePixelRatio;
      h = canvas.height = canvas.offsetHeight * devicePixelRatio;
      cols = new Array(Math.floor(w / (fontSize * devicePixelRatio))).fill(0);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      ctx.fillStyle = `rgba(2,2,3,0.08)`;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = `rgba(0,242,255,${opacity * 8})`;
      ctx.font = `${fontSize * devicePixelRatio}px JetBrains Mono`;
      cols.forEach((y, i) => {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize * devicePixelRatio;
        ctx.fillText(ch, x, y);
        cols[i] = y > h + Math.random() * 1000 ? 0 : y + fontSize * devicePixelRatio;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [opacity]);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ opacity }}
      aria-hidden
    />
  );
}
