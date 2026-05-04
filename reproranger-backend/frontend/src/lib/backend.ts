const DEFAULT_BACKEND_URL = "http://localhost:8000";

export function getBackendHttpUrl(): string {
  const configured = import.meta.env.VITE_BACKEND_URL as string | undefined;
  return configured?.trim().replace(/\/+$/, "") || DEFAULT_BACKEND_URL;
}

export function getBackendWsUrl(jobId: string): string {
  return `${getBackendHttpUrl().replace(/^http/, "ws")}/ws/${jobId}`;
}

export function isDemoModeEnabled(): boolean {
  return (
    String(import.meta.env.VITE_ENABLE_DEMO ?? "")
      .trim()
      .toLowerCase() === "true"
  );
}

export function normalizeRepoUrl(input: string): string {
  const value = input.trim().replace(/\/+$/, "");

  if (!value) {
    return "";
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (value.startsWith("github.com/")) {
    return `https://${value}`;
  }

  return `https://github.com/${value.replace(/^\/+/, "")}`;
}
