import { NextResponse } from "next/server";
import { syncUserProfile, syncBatchProfiles } from "@/lib/coding-platforms/sync-engine";
import { detectPlatformAndUsername } from "@/lib/coding-platforms/detector";
import { PlatformId } from "@/lib/coding-platforms/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get("input") || searchParams.get("url") || "";
  let platform = searchParams.get("platform") as PlatformId | null;
  let username = searchParams.get("username") || "";

  if (input) {
    const detection = detectPlatformAndUsername(input);
    if (detection.platform !== "UNKNOWN") {
      platform = detection.platform;
      username = detection.username;
    } else {
      username = detection.username;
    }
  }

  if (!platform || !username) {
    return NextResponse.json(
      { error: "Platform and username (or profile URL) are required" },
      { status: 400 }
    );
  }

  const forceRefresh = searchParams.get("refresh") === "true";
  const profile = await syncUserProfile(platform, username, forceRefresh);

  return NextResponse.json({ profile });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const profiles = body.profiles; // Array of { platform, username } or Record<platform, username>
    const forceRefresh = Boolean(body.forceRefresh);

    let profileList: { platform: PlatformId; username: string }[] = [];

    if (Array.isArray(profiles)) {
      profileList = profiles;
    } else if (typeof profiles === "object" && profiles !== null) {
      profileList = Object.entries(profiles).map(([platform, username]) => ({
        platform: platform as PlatformId,
        username: String(username),
      }));
    }

    if (profileList.length === 0) {
      return NextResponse.json({ error: "No profiles provided" }, { status: 400 });
    }

    const results = await syncBatchProfiles(profileList, forceRefresh);
    return NextResponse.json({ profiles: results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to sync profiles" }, { status: 500 });
  }
}
