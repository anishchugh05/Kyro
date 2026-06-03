/**
 * Kyro — Autonomous AI Code Repair Engine
 * Copyright © 2026 Anish Chugh. All rights reserved.
 * Version 1.0.0 | June 2026
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 *
 * Shared types for the Kyro frontend.
 * The backend will populate these — keep all fields optional/agnostic
 * so partial payloads render gracefully.
 */

export type AgentPhase =
  | "idle" // Awaiting repo URL
  | "assembly" // Building the Repo City
  | "exploring" // City built, drone idle / exploring
  | "targeting" // Drone homing in on a buggy file
  | "repairing" // Drone fixing the file
  | "complete"; // Fix verified

export type NodeStatus = "neutral" | "healthy" | "warning" | "buggy" | "fixed";

/** A "building" in the Repo City — typically a file or module. */
export interface RepoNode {
  id: string;
  label?: string; // e.g. "auth/session.ts"
  /** Grid coordinates (we map to world position). */
  x: number;
  z: number;
  /** Number of stacked Lego bricks. Defaults to 3. */
  height?: number;
  status?: NodeStatus;
  meta?: Record<string, unknown>;
}

/** A "street" — dependency between two nodes. */
export interface RepoEdge {
  id: string;
  from: string; // node id
  to: string; // node id
  active?: boolean;
}

export interface IssueContext {
  id?: string;
  title?: string;
  number?: number;
  body?: string;
  labels?: string[];
  url?: string;
  targetNodeId?: string; // which building to highlight
}

export type DiffLineKind = "add" | "del" | "ctx" | "hunk";

export interface DiffLine {
  kind: DiffLineKind;
  content: string;
  lineNo?: number;
}

export interface DiffFile {
  path?: string;
  lines: DiffLine[];
}

export type LogLevel = "info" | "thought" | "action" | "success" | "error";

export interface ActivityLogEntry {
  id: string;
  timestamp?: string; // ISO
  level: LogLevel;
  message: string;
  /** Which AI provider produced this event, e.g. "gemini" | "claude" | "openai" | "python" */
  provider?: string;
}

export interface CodebaseOverview {
  text: string;
  stats: { files: number; lines: number };
}

export interface RangerState {
  repoUrl: string;
  phase: AgentPhase;
  nodes: RepoNode[];
  edges: RepoEdge[];
  issue: IssueContext | null;
  diff: DiffFile | null;
  logs: ActivityLogEntry[];
  /** ID of the currently targeted building. */
  focusedNodeId: string | null;
  /** Optional progress 0..1 for the current phase. */
  progress: number;
  /** Claude-generated codebase overview, set once indexing completes. */
  overview: CodebaseOverview | null;
}
