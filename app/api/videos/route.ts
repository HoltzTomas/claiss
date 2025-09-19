import { NextRequest, NextResponse } from "next/server";
import { createReadStream, existsSync, statSync } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const videoPath = "/tmp/latest.mp4";

    if (!existsSync(videoPath)) {
      return new NextResponse("Video not found", { status: 404 });
    }

    const stat = statSync(videoPath);
    const fileSize = stat.size;
    const range = request.headers.get("range");

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const stream = createReadStream(videoPath, { start, end });

      return new NextResponse(stream as any, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": "video/mp4",
          "Cache-Control": "no-cache",
        },
      });
    } else {
      const stream = createReadStream(videoPath);

      return new NextResponse(stream as any, {
        status: 200,
        headers: {
          "Content-Length": fileSize.toString(),
          "Content-Type": "video/mp4",
          "Cache-Control": "no-cache",
          "Accept-Ranges": "bytes",
        },
      });
    }
  } catch (error) {
    console.error("Error serving video:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

export async function HEAD(request: NextRequest) {
  try {
    const videoPath = "/tmp/latest.mp4";

    if (!existsSync(videoPath)) {
      return new NextResponse(null, { status: 404 });
    }

    const stat = statSync(videoPath);

    return new NextResponse(null, {
      status: 200,
      headers: {
        "Content-Length": stat.size.toString(),
        "Content-Type": "video/mp4",
        "Cache-Control": "no-cache",
        "Accept-Ranges": "bytes",
      },
    });
  } catch (error) {
    console.error("Error checking video:", error);
    return new NextResponse(null, { status: 500 });
  }
}
