import { NextRequest, NextResponse } from "next/server";
import { list } from "@vercel/blob";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    console.log("[VIDEO-API] Looking for latest video in Blob storage...");

    // List videos in the 'videos/' folder, sorted by most recent
    const { blobs } = await list({
      prefix: "videos/",
      limit: 10, // Get recent videos
    });

    if (blobs.length === 0) {
      console.log("[VIDEO-API] No videos found in Blob storage");
      return new NextResponse("No videos found", { status: 404 });
    }

    // Sort by uploadedAt date (most recent first) and get the latest video
    const latestVideo = blobs.sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    )[0];

    console.log(`[VIDEO-API] ✅ Found latest video: ${latestVideo.url}`);
    console.log(
      `[VIDEO-API] Video size: ${latestVideo.size} bytes, uploaded: ${latestVideo.uploadedAt}`,
    );

    // Redirect to the Blob URL for direct access (better performance)
    return NextResponse.redirect(latestVideo.url);
  } catch (error) {
    console.error("[VIDEO-API] Error fetching video from Blob storage:", error);
    return new NextResponse("Error fetching video", { status: 500 });
  }
}

export async function HEAD(request: NextRequest) {
  try {
    console.log("[VIDEO-API] HEAD request - checking for latest video...");

    // List videos in the 'videos/' folder
    const { blobs } = await list({
      prefix: "videos/",
      limit: 1, // Just check if any exist
    });

    if (blobs.length === 0) {
      console.log("[VIDEO-API] HEAD: No videos found");
      return new NextResponse(null, { status: 404 });
    }

    const latestVideo = blobs[0];
    console.log(
      `[VIDEO-API] HEAD: Latest video found - ${latestVideo.size} bytes`,
    );

    return new NextResponse(null, {
      status: 200,
      headers: {
        "Content-Length": latestVideo.size.toString(),
        "Content-Type": "video/mp4",
        "Cache-Control": "no-cache",
        "Accept-Ranges": "bytes",
      },
    });
  } catch (error) {
    console.error("[VIDEO-API] HEAD: Error checking video:", error);
    return new NextResponse(null, { status: 500 });
  }
}
