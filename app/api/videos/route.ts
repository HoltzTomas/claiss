import { NextRequest, NextResponse } from "next/server";
import { list } from "@vercel/blob";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("id");

    if (videoId) {
      console.log(`[VIDEO-API] Looking for specific video ID: ${videoId}`);

      try {
        // Look for specific video by ID in Blob storage
        const { blobs } = await list({
          prefix: `videos/${videoId}.mp4`,
          limit: 1,
        });

        if (blobs.length > 0) {
          const targetVideo = blobs[0];
          console.log(
            `[VIDEO-API] ✅ Found video by ID in Blob: ${targetVideo.url}`,
          );
          return NextResponse.redirect(targetVideo.url);
        }
      } catch (blobError) {
        console.log(
          `[VIDEO-API] Blob storage unavailable for video ${videoId}, checking /tmp fallback`,
        );
      }

      // Fallback to /tmp file for backward compatibility
      const { existsSync, createReadStream, statSync } = await import("fs");
      const videoPath = "/tmp/latest.mp4";

      if (existsSync(videoPath)) {
        console.log(`[VIDEO-API] Found video in /tmp as fallback`);
        const stat = statSync(videoPath);
        const stream = createReadStream(videoPath);

        return new NextResponse(stream as any, {
          status: 200,
          headers: {
            "Content-Length": stat.size.toString(),
            "Content-Type": "video/mp4",
            "Cache-Control": "no-cache",
            "Accept-Ranges": "bytes",
          },
        });
      } else {
        return new NextResponse("Video not found", { status: 404 });
      }
    } else {
      console.log("[VIDEO-API] Looking for latest video in Blob storage...");

      // List videos in the 'videos/' folder, sorted by most recent
      const { blobs } = await list({
        prefix: "videos/",
        limit: 10,
      });

      if (blobs.length === 0) {
        console.log("[VIDEO-API] No videos found in Blob storage");

        // Fallback to /tmp file
        const { existsSync, createReadStream, statSync } = await import("fs");
        const videoPath = "/tmp/latest.mp4";

        if (existsSync(videoPath)) {
          console.log(`[VIDEO-API] Found video in /tmp as fallback`);
          const stat = statSync(videoPath);
          const stream = createReadStream(videoPath);

          return new NextResponse(stream as any, {
            status: 200,
            headers: {
              "Content-Length": stat.size.toString(),
              "Content-Type": "video/mp4",
              "Cache-Control": "no-cache",
              "Accept-Ranges": "bytes",
            },
          });
        } else {
          return new NextResponse("No videos found", { status: 404 });
        }
      }

      // Sort by uploadedAt date (most recent first) and get the latest video
      const latestVideo = blobs.sort(
        (a, b) =>
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
      )[0];

      console.log(`[VIDEO-API] ✅ Found latest video: ${latestVideo.url}`);
      return NextResponse.redirect(latestVideo.url);
    }
  } catch (error) {
    console.error("[VIDEO-API] Error fetching video:", error);
    return new NextResponse("Error fetching video", { status: 500 });
  }
}

export async function HEAD(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("id");

    if (videoId) {
      console.log(
        `[VIDEO-API] HEAD request - checking for video ID: ${videoId}`,
      );

      try {
        // Look for specific video by ID in Blob storage
        const { blobs } = await list({
          prefix: `videos/${videoId}.mp4`,
          limit: 1,
        });

        if (blobs.length > 0) {
          const targetVideo = blobs[0];
          console.log(
            `[VIDEO-API] HEAD: Found video by ID in Blob - ${targetVideo.size} bytes`,
          );
          return new NextResponse(null, {
            status: 200,
            headers: {
              "Content-Length": targetVideo.size.toString(),
              "Content-Type": "video/mp4",
              "Cache-Control": "no-cache",
              "Accept-Ranges": "bytes",
            },
          });
        }
      } catch (blobError) {
        console.log(
          `[VIDEO-API] HEAD: Blob storage unavailable, checking /tmp fallback`,
        );
      }

      // Fallback to /tmp file
      const { existsSync, statSync } = await import("fs");
      const videoPath = "/tmp/latest.mp4";

      if (existsSync(videoPath)) {
        const stat = statSync(videoPath);
        console.log(
          `[VIDEO-API] HEAD: Found video in /tmp - ${stat.size} bytes`,
        );
        return new NextResponse(null, {
          status: 200,
          headers: {
            "Content-Length": stat.size.toString(),
            "Content-Type": "video/mp4",
            "Cache-Control": "no-cache",
            "Accept-Ranges": "bytes",
          },
        });
      } else {
        console.log("[VIDEO-API] HEAD: Video not found in /tmp");
        return new NextResponse(null, { status: 404 });
      }
    } else {
      // Legacy: checking for latest video without specific ID
      console.log("[VIDEO-API] HEAD request - checking for latest video...");

      try {
        // List videos in the 'videos/' folder
        const { blobs } = await list({
          prefix: "videos/",
          limit: 1, // Just check if any exist
        });

        if (blobs.length > 0) {
          const latestVideo = blobs[0];
          console.log(
            `[VIDEO-API] HEAD: Latest video found in Blob - ${latestVideo.size} bytes`,
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
        }
      } catch (blobError) {
        console.log(
          `[VIDEO-API] HEAD: Blob storage unavailable, checking /tmp fallback`,
        );
      }

      // Fallback to /tmp file
      const { existsSync, statSync } = await import("fs");
      const videoPath = "/tmp/latest.mp4";

      if (existsSync(videoPath)) {
        const stat = statSync(videoPath);
        console.log(
          `[VIDEO-API] HEAD: Found video in /tmp - ${stat.size} bytes`,
        );
        return new NextResponse(null, {
          status: 200,
          headers: {
            "Content-Length": stat.size.toString(),
            "Content-Type": "video/mp4",
            "Cache-Control": "no-cache",
            "Accept-Ranges": "bytes",
          },
        });
      } else {
        console.log("[VIDEO-API] HEAD: No videos found");
        return new NextResponse(null, { status: 404 });
      }
    }
  } catch (error) {
    console.error("[VIDEO-API] HEAD: Error checking video:", error);
    return new NextResponse(null, { status: 500 });
  }
}
