import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "public", "dsa-404-app.apk");

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "APK file not found on server." },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Disposition": 'attachment; filename="DSA404-App.apk"',
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error serving APK download:", error);
    return NextResponse.json(
      { error: "Failed to download APK file." },
      { status: 500 }
    );
  }
}
