import { NextResponse } from "next/server";
import { analyzeCodingProfiles } from "@/lib/coding-platforms/analytics";
import { NormalizedCodingProfile } from "@/lib/coding-platforms/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const profiles: Record<string, NormalizedCodingProfile> = body.profiles || {};

    const analytics = analyzeCodingProfiles(profiles);
    return NextResponse.json({ analytics });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to generate analytics" }, { status: 500 });
  }
}
