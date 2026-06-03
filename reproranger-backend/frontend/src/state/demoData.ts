/**
 * Kyro — Autonomous AI Code Repair Engine
 * Copyright © 2026 Anish Chugh. All rights reserved.
 * Version 1.0.0 | June 2026
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */
import type { DiffFile, IssueContext, RepoEdge, RepoNode } from "./ranger-types";

/** Generate a deterministic-ish demo city of buildings on a grid. */
export function buildDemoCity(): { nodes: RepoNode[]; edges: RepoEdge[] } {
  const labels = [
    "auth/session.ts",
    "auth/login.tsx",
    "api/users.ts",
    "api/posts.ts",
    "api/comments.ts",
    "db/schema.ts",
    "db/client.ts",
    "components/Header.tsx",
    "components/Sidebar.tsx",
    "components/Footer.tsx",
    "utils/format.ts",
    "utils/logger.ts",
    "hooks/useAuth.ts",
    "hooks/useFetch.ts",
    "pages/index.tsx",
    "pages/dashboard.tsx",
    "lib/cache.ts",
    "lib/queue.ts",
    "config/env.ts",
    "tests/auth.test.ts",
  ];

  const nodes: RepoNode[] = [];
  const cols = 5;
  labels.forEach((label, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    // Pseudo-random heights using sin
    const h = 2 + Math.floor((Math.sin(i * 12.9898) * 0.5 + 0.5) * 5);
    nodes.push({
      id: `n${i}`,
      label,
      x: col - (cols - 1) / 2,
      z: row - 1.5,
      height: h,
      status: "neutral",
    });
  });

  const edges: RepoEdge[] = [
    ["n0", "n1"],
    ["n0", "n12"],
    ["n2", "n5"],
    ["n3", "n5"],
    ["n4", "n5"],
    ["n2", "n6"],
    ["n3", "n6"],
    ["n12", "n0"],
    ["n13", "n2"],
    ["n14", "n7"],
    ["n14", "n8"],
    ["n15", "n7"],
    ["n15", "n8"],
    ["n15", "n12"],
    ["n16", "n6"],
    ["n17", "n16"],
    ["n18", "n5"],
    ["n19", "n0"],
    ["n10", "n11"],
    ["n11", "n18"],
  ].map(([from, to], i) => ({ id: `e${i}`, from, to, active: false }));

  return { nodes, edges };
}

export const demoIssue: IssueContext = {
  id: "issue-482",
  number: 482,
  title: "Session token not refreshed on stale logins",
  body: "Users who reopen the app after >24h get logged out. Suspect session/refresh logic in auth/session.ts is dropping the refresh token before validating expiry.",
  labels: ["bug", "auth", "p1"],
  url: "https://github.com/acme/app/issues/482",
  targetNodeId: "n0", // auth/session.ts
};

export const demoDiff: DiffFile = {
  path: "auth/session.ts",
  lines: [
    {
      kind: "hunk",
      content: "@@ -42,9 +42,15 @@ export async function refreshSession(token: string) {",
    },
    { kind: "ctx", content: "  const decoded = decodeToken(token);", lineNo: 42 },
    { kind: "ctx", content: "  if (!decoded) return null;", lineNo: 43 },
    { kind: "del", content: "  if (decoded.exp < Date.now()) {", lineNo: 44 },
    { kind: "del", content: "    clearRefreshToken();", lineNo: 45 },
    { kind: "del", content: "    return null;", lineNo: 46 },
    { kind: "del", content: "  }", lineNo: 47 },
    { kind: "add", content: "  const refresh = await getRefreshToken();" },
    { kind: "add", content: "  if (decoded.exp < Date.now() && !refresh) {" },
    { kind: "add", content: "    clearRefreshToken();" },
    { kind: "add", content: "    return null;" },
    { kind: "add", content: "  }" },
    { kind: "add", content: "  if (refresh) {" },
    { kind: "add", content: "    return await rotateSession(refresh);" },
    { kind: "add", content: "  }" },
    { kind: "ctx", content: "  return decoded;", lineNo: 48 },
    { kind: "ctx", content: "}", lineNo: 49 },
  ],
};

export const demoLogs: Array<{
  level: "info" | "thought" | "action" | "success" | "error";
  message: string;
  /** ms after run start */
  at: number;
}> = [
  { level: "info", at: 0, message: "Cloning repository acme/app @ main..." },
  { level: "info", at: 600, message: "Indexed 142 files across 12 modules." },
  { level: "thought", at: 1200, message: "Building dependency graph & spatial layout..." },
  { level: "action", at: 1800, message: "Constructing Repo City visualization." },
  { level: "info", at: 3200, message: "City assembly complete. 20 modules online." },
  { level: "thought", at: 3800, message: "Scanning open issues... found #482 (p1, bug, auth)." },
  { level: "action", at: 4400, message: "Locating responsible module: auth/session.ts" },
  { level: "thought", at: 5000, message: "Drone vectoring to target building." },
  { level: "action", at: 6000, message: "Deploying repair beam — analyzing AST." },
  {
    level: "thought",
    at: 6800,
    message: "Hypothesis: refresh token cleared before re-validation.",
  },
  { level: "action", at: 7600, message: "Patching refreshSession() — preserving refresh token." },
  { level: "action", at: 8400, message: "Running test suite: tests/auth.test.ts" },
  { level: "success", at: 9400, message: "All tests pass (24/24). Building marked FIXED." },
  {
    level: "success",
    at: 10000,
    message: "Pull request #631 opened: 'fix: preserve refresh token on stale session'.",
  },
];
