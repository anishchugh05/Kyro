import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type {
  ActivityLogEntry,
  AgentPhase,
  DiffFile,
  IssueContext,
  RangerState,
  RepoEdge,
  RepoNode,
} from "./ranger-types";

/**
 * RangerContext is the single injection point for backend data.
 * All setters are exposed so the backend integration layer can push
 * updates from sockets / SSE / polling without the UI knowing how.
 */
interface RangerContextValue extends RangerState {
  setRepoUrl: (url: string) => void;
  setPhase: (phase: AgentPhase) => void;
  setNodes: (nodes: RepoNode[]) => void;
  setEdges: (edges: RepoEdge[]) => void;
  setIssue: (issue: IssueContext | null) => void;
  setDiff: (diff: DiffFile | null) => void;
  setFocusedNodeId: (id: string | null) => void;
  setProgress: (p: number) => void;
  appendLog: (entry: Omit<ActivityLogEntry, "id"> & { id?: string }) => void;
  clearLogs: () => void;
  reset: () => void;
}

const initialState: RangerState = {
  repoUrl: "",
  phase: "idle",
  nodes: [],
  edges: [],
  issue: null,
  diff: null,
  logs: [],
  focusedNodeId: null,
  progress: 0,
};

const RangerContext = createContext<RangerContextValue | null>(null);

export function RangerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RangerState>(initialState);

  const setRepoUrl = useCallback((repoUrl: string) => setState((s) => ({ ...s, repoUrl })), []);
  const setPhase = useCallback((phase: AgentPhase) => setState((s) => ({ ...s, phase })), []);
  const setNodes = useCallback((nodes: RepoNode[]) => setState((s) => ({ ...s, nodes })), []);
  const setEdges = useCallback((edges: RepoEdge[]) => setState((s) => ({ ...s, edges })), []);
  const setIssue = useCallback(
    (issue: IssueContext | null) => setState((s) => ({ ...s, issue })),
    [],
  );
  const setDiff = useCallback((diff: DiffFile | null) => setState((s) => ({ ...s, diff })), []);
  const setFocusedNodeId = useCallback(
    (focusedNodeId: string | null) => setState((s) => ({ ...s, focusedNodeId })),
    [],
  );
  const setProgress = useCallback((progress: number) => setState((s) => ({ ...s, progress })), []);
  const appendLog = useCallback<RangerContextValue["appendLog"]>((entry) => {
    setState((s) => ({
      ...s,
      logs: [
        ...s.logs,
        {
          id: entry.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: entry.timestamp ?? new Date().toISOString(),
          level: entry.level,
          message: entry.message,
        },
      ].slice(-200),
    }));
  }, []);
  const clearLogs = useCallback(() => setState((s) => ({ ...s, logs: [] })), []);
  const reset = useCallback(() => setState(initialState), []);

  const value = useMemo<RangerContextValue>(
    () => ({
      ...state,
      setRepoUrl,
      setPhase,
      setNodes,
      setEdges,
      setIssue,
      setDiff,
      setFocusedNodeId,
      setProgress,
      appendLog,
      clearLogs,
      reset,
    }),
    [
      state,
      setRepoUrl,
      setPhase,
      setNodes,
      setEdges,
      setIssue,
      setDiff,
      setFocusedNodeId,
      setProgress,
      appendLog,
      clearLogs,
      reset,
    ],
  );

  return <RangerContext.Provider value={value}>{children}</RangerContext.Provider>;
}

export function useRanger() {
  const ctx = useContext(RangerContext);
  if (!ctx) throw new Error("useRanger must be used within a RangerProvider");
  return ctx;
}
