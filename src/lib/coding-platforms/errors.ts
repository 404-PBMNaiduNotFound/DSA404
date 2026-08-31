import { FetchStatus } from "./types";

export class PlatformError extends Error {
  public readonly status: FetchStatus;
  public readonly platform: string;
  public readonly username: string;

  constructor(status: FetchStatus, platform: string, username: string, message?: string) {
    super(message || `Fetch failed for ${platform} user ${username} with status ${status}`);
    this.name = "PlatformError";
    this.status = status;
    this.platform = platform;
    this.username = username;
  }
}

export function handleFetchError(err: any, platform: string, username: string): FetchStatus {
  if (err instanceof PlatformError) return err.status;
  if (err.name === "AbortError") return "TEMPORARY_ERROR";
  const msg = (err.message || "").toLowerCase();
  if (msg.includes("not found") || msg.includes("404")) return "PROFILE_NOT_FOUND";
  if (msg.includes("private")) return "PRIVATE_PROFILE";
  if (msg.includes("rate limit") || msg.includes("429")) return "RATE_LIMITED";
  if (msg.includes("auth")) return "AUTH_REQUIRED";
  return "FETCH_FAILED";
}
