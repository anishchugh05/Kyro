import { useCallback, useEffect, useRef, useState } from "react";
import { useRanger } from "@/state/RangerContext";
import type { WsMessage } from "@/state/ws-types";
import { rawEdgesToFrontend, rawNodesToFrontend } from "@/state/ws-types";
import { getBackendHttpUrl, getBackendWsUrl } from "@/lib/backend";

export interface BackendRunnerState {
  isConnected: boolean;
  jobId: string | null;
  error: string | null;
  run: (repoUrl: string, issueText?: string) => Promise<void>;
  stop: () => void;
}

export function useBackendRunner(): BackendRunnerState {
  const ranger = useRanger();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const dispatch = useCallback(
    (msg: WsMessage) => {
      switch (msg.type) {
        case "phase":
          ranger.setPhase(msg.data.phase);
          break;
        case "nodes":
          ranger.setNodes(rawNodesToFrontend(msg.data.nodes));
          ranger.setEdges(rawEdgesToFrontend(msg.data.edges));
          break;
        case "log":
          ranger.appendLog({
            level: (msg.data.level as never) ?? "info",
            message: msg.data.message,
          });
          break;
        case "issue":
          ranger.setIssue({
            id: msg.data.id,
            title: msg.data.title,
            number: msg.data.number,
            body: msg.data.body,
            labels: msg.data.labels,
            url: msg.data.url,
            targetNodeId: msg.data.targetNodeId,
          });
          break;
        case "diff":
          ranger.setDiff({ path: msg.data.path, lines: msg.data.lines });
          break;
        case "focus":
          ranger.setFocusedNodeId(msg.data.nodeId);
          break;
        case "progress":
          ranger.setProgress(msg.data.value);
          break;
        case "done": {
          const { prUrl, prNumber, prTitle } = msg.data;
          if (prUrl) {
            ranger.appendLog({
              level: "success",
              message: `Pull Request #${prNumber ?? "?"} opened → ${prUrl}`,
            });
            // Patch the issue panel URL so the "view on github" link points to the PR
            ranger.setIssue({
              id: `pr-${prNumber ?? "?"}`,
              title: prTitle ?? "Automated fix",
              body: `PR #${prNumber} was opened by Kyro. Click "view on github" to review and merge.`,
              labels: ["automated", "kyro"],
              url: prUrl,
              number: prNumber ?? undefined,
            });
          } else {
            ranger.appendLog({
              level: "success",
              message: prTitle ? `Fix ready — "${prTitle}" (diff shown in panel)` : "Job complete",
            });
          }
          setIsConnected(false);
          break;
        }
        case "issue_url":
          // Backend upgraded the issue URL after PR creation — patch it in
          ranger.setIssue({
            id: `pr-${msg.data.number ?? "?"}`,
            title: "Pull Request opened",
            body: `Kyro opened PR #${msg.data.number}. Click "view on github" to review.`,
            labels: ["automated", "kyro"],
            url: msg.data.url,
            number: msg.data.number,
          });
          break;
        case "error":
          setError(msg.data.message);
          ranger.appendLog({ level: "error", message: msg.data.message });
          break;
      }
    },
    [ranger],
  );

  const run = useCallback(
    async (repoUrl: string, issueText = "") => {
      setError(null);
      stop();
      ranger.reset();
      ranger.setRepoUrl(repoUrl);
      ranger.appendLog({ level: "info", message: "Connecting to Kyro backend..." });

      let newJobId: string;
      try {
        const backendUrl = getBackendHttpUrl();
        const res = await fetch(`${backendUrl}/api/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repo_url: repoUrl, issue_text: issueText }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({ detail: res.statusText }));
          throw new Error(body.detail ?? `HTTP ${res.status}`);
        }
        const payload = await res.json();
        newJobId = payload.jobId;
        setJobId(newJobId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        ranger.appendLog({ level: "error", message: `Backend error: ${msg}` });
        return;
      }

      const ws = new WebSocket(getBackendWsUrl(newJobId));
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        ranger.appendLog({ level: "info", message: "WebSocket connected — agent starting." });
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          dispatch(JSON.parse(event.data as string) as WsMessage);
        } catch {
          // Ignore malformed frames.
        }
      };

      ws.onerror = () => {
        const msg = "WebSocket connection error";
        setError(msg);
        ranger.appendLog({ level: "error", message: msg });
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
      };
    },
    [dispatch, ranger, stop],
  );

  return { isConnected, jobId, error, run, stop };
}
