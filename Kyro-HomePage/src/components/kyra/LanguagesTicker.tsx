/**
 * Kyro — Autonomous AI Code Repair Engine
 * Copyright © 2026 Anish Chugh. All rights reserved.
 * Version 1.0.0 | June 2026
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

/**
 * Infinite scrolling ticker of every language Kyro can analyze.
 * Languages are sourced from CODE_EXTENSIONS in repo_ingestor.py — 100% factual.
 */

const LANGUAGES = [
  { name: "Python",     ext: ".py",     color: "#3B82F6" },
  { name: "TypeScript", ext: ".ts",     color: "#00F2FF" },
  { name: "TSX",        ext: ".tsx",    color: "#00D4E8" },
  { name: "JavaScript", ext: ".js",     color: "#CCFF00" },
  { name: "JSX",        ext: ".jsx",    color: "#A8D400" },
  { name: "Go",         ext: ".go",     color: "#00ACD7" },
  { name: "Rust",       ext: ".rs",     color: "#F97316" },
  { name: "Java",       ext: ".java",   color: "#F59E0B" },
  { name: "Kotlin",     ext: ".kt",     color: "#A855F7" },
  { name: "Ruby",       ext: ".rb",     color: "#EF4444" },
  { name: "PHP",        ext: ".php",    color: "#818CF8" },
  { name: "C#",         ext: ".cs",     color: "#22C55E" },
  { name: "C++",        ext: ".cpp",    color: "#60A5FA" },
  { name: "C",          ext: ".c",      color: "#93C5FD" },
  { name: "Swift",      ext: ".swift",  color: "#FB923C" },
  { name: "Vue",        ext: ".vue",    color: "#34D399" },
  { name: "Svelte",     ext: ".svelte", color: "#FF3E00" },
];

export function LanguagesTicker() {
  // Duplicate the list so the CSS infinite scroll is seamless
  const doubled = [...LANGUAGES, ...LANGUAGES];

  return (
    <div className="relative w-full overflow-hidden border-y border-white/6 bg-black/30 py-5">
      {/* Left + right fade masks */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24"
        style={{ background: "linear-gradient(to right, #020409, transparent)" }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24"
        style={{ background: "linear-gradient(to left, #020409, transparent)" }}
      />

      {/* Scrolling track */}
      <div
        className="flex w-max gap-6"
        style={{
          animation: "kyro-ticker 30s linear infinite",
        }}
      >
        {doubled.map((lang, i) => (
          <div
            key={i}
            className="flex shrink-0 items-center gap-2 rounded-full border px-4 py-1.5 font-mono text-xs font-semibold uppercase tracking-[0.2em] transition-opacity hover:opacity-100"
            style={{
              borderColor: `${lang.color}40`,
              backgroundColor: `${lang.color}10`,
              color: lang.color,
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: lang.color, boxShadow: `0 0 6px ${lang.color}` }}
            />
            {lang.name}
            <span style={{ color: `${lang.color}70` }}>{lang.ext}</span>
          </div>
        ))}
      </div>

      {/* Keyframe injected as a style tag — no Tailwind config needed */}
      <style>{`
        @keyframes kyro-ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
