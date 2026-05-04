import type {
  AgentPhase,
  DiffLine,
  IssueContext,
  NodeStatus,
  RepoEdge,
  RepoNode,
} from "./ranger-types";

export type WsMessage =
  | { type: "phase"; data: { phase: AgentPhase } }
  | { type: "nodes"; data: { nodes: RawNode[]; edges: RawEdge[] } }
  | { type: "log"; data: { level: string; message: string } }
  | { type: "issue"; data: IssueContext & { targetNodeId?: string } }
  | { type: "diff"; data: { path: string; lines: DiffLine[] } }
  | { type: "focus"; data: { nodeId: string | null } }
  | { type: "progress"; data: { value: number } }
  | { type: "done"; data: { jobId: string; prTitle?: string; prUrl?: string | null; prNumber?: number | null; diff?: string } }
  | { type: "issue_url"; data: { url: string; number?: number } }
  | { type: "error"; data: { message: string } };

export interface RawNode {
  id: string;
  label: string;
  x: number;
  z: number;
  height: number;
  status?: NodeStatus;
}

export interface RawEdge {
  id: string;
  from: string;
  to: string;
  active?: boolean;
}

export function rawNodesToFrontend(raw: RawNode[]): RepoNode[] {
  return raw.map((n) => ({
    id: n.id,
    label: n.label,
    x: n.x,
    z: n.z,
    height: n.height ?? 3,
    status: n.status ?? "neutral",
  }));
}

export function rawEdgesToFrontend(raw: RawEdge[]): RepoEdge[] {
  return raw.map((e) => ({
    id: e.id,
    from: e.from,
    to: e.to,
    active: e.active ?? false,
  }));
}
