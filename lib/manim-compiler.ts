import { execSync } from "child_process";
import {
  writeFileSync,
  mkdirSync,
  existsSync,
  copyFileSync,
  readdirSync,
} from "fs";
import path from "path";
import { put } from "@vercel/blob";
import { compileAnimationWithModal } from "./modal-client-http";
import { generateSimpleVideoId } from "./simple-video-id";

export interface ManimCompilationResult {
  success: boolean;
  videoPath?: string;
  videoUrl?: string;
  videoId?: string;
  error?: string;
  logs?: string;
  compilationType?: "modal" | "local";
  duration?: number;
}

// Environment configuration for compilation method
const USE_MODAL = process.env.USE_MODAL_COMPILATION !== "false"; // Default to true
const MODAL_FALLBACK_TO_LOCAL = process.env.MODAL_FALLBACK_TO_LOCAL !== "false"; // Default to true

export async function compileManimCode(
  pythonCode: string,
  className: string = "Scene",
): Promise<ManimCompilationResult> {
  console.log(`[MANIM-COMPILER] Starting compilation for ${className}`);
  console.log(`[MANIM-COMPILER] Modal enabled: ${USE_MODAL}`);
  console.log(`[MANIM-COMPILER] Local fallback: ${MODAL_FALLBACK_TO_LOCAL}`);

  // Try Modal compilation first (if enabled)
  if (USE_MODAL) {
    try {
      console.log(`[MANIM-COMPILER] 🚀 Attempting Modal compilation...`);
      const modalResult = await compileWithModal(pythonCode, className);

      if (modalResult.success) {
        console.log(`[MANIM-COMPILER] ✅ Modal compilation successful!`);
        return modalResult;
      } else {
        console.log(
          `[MANIM-COMPILER] ⚠️ Modal compilation failed: ${modalResult.error}`,
        );

        // If Modal fails and fallback is disabled, return the Modal error
        if (!MODAL_FALLBACK_TO_LOCAL) {
          return modalResult;
        }
      }
    } catch (modalError) {
      console.log(
        `[MANIM-COMPILER] ⚠️ Modal compilation threw error:`,
        modalError,
      );

      // If Modal throws and fallback is disabled, return the error
      if (!MODAL_FALLBACK_TO_LOCAL) {
        return {
          success: false,
          error: `Modal compilation failed: ${modalError instanceof Error ? modalError.message : String(modalError)}`,
          compilationType: "modal",
        };
      }
    }
  }

  // Fallback to local compilation
  console.log(`[MANIM-COMPILER] 🔄 Falling back to local compilation...`);
  return await compileWithLocal(pythonCode, className);
}

/**
 * Compile using Modal serverless containers (direct call).
 */
async function compileWithModal(
  pythonCode: string,
  className: string,
): Promise<ManimCompilationResult> {
  try {
    // Direct call to modal-client (no HTTP roundtrip!)
    const result = await compileAnimationWithModal(
      pythonCode,
      className,
      "low_quality",
    );

    if (result.success && result.video_bytes) {
      // Save video to Vercel Blob instead of tmp directory
      const buffer = Buffer.from(result.video_bytes);

      console.log(
        `[MANIM-COMPILER] 📤 Uploading video to Vercel Blob... (${buffer.length} bytes)`,
      );

      try {
        // Generate simple video ID and upload to Blob
        const videoId = generateSimpleVideoId();
        const blob = await put(`videos/${videoId}.mp4`, buffer, {
          access: "public",
          contentType: "video/mp4",
        });

        console.log(`[MANIM-COMPILER] ✅ Video uploaded to Blob: ${blob.url}`);
        console.log(`[MANIM-COMPILER] Video ID: ${videoId}`);

        return {
          success: true,
          videoPath: blob.pathname,
          videoUrl: blob.url,
          videoId: videoId,
          logs: result.logs,
          duration: result.duration,
          compilationType: "modal",
        };
      } catch (blobError) {
        console.error(
          `[MANIM-COMPILER] ❌ Failed to upload to Blob, falling back to /tmp:`,
          blobError,
        );

        // Fallback to original /tmp approach if Blob fails
        try {
          const { writeFileSync } = await import("fs");
          const videoId = generateSimpleVideoId();
          writeFileSync("/tmp/latest.mp4", buffer);

          console.log(`[MANIM-COMPILER] ✅ Video saved to /tmp as fallback`);
          console.log(`[MANIM-COMPILER] Video ID: ${videoId} (tmp fallback)`);

          return {
            success: true,
            videoPath: "/tmp/latest.mp4",
            videoUrl: `/api/videos?id=${videoId}`,
            videoId: videoId,
            logs: result.logs,
            duration: result.duration,
            compilationType: "modal",
          };
        } catch (tmpError) {
          console.error(
            `[MANIM-COMPILER] ❌ Failed to save to /tmp as well:`,
            tmpError,
          );

          return {
            success: false,
            error: `Failed to save video (Blob: ${blobError instanceof Error ? blobError.message : String(blobError)}, tmp: ${tmpError instanceof Error ? tmpError.message : String(tmpError)})`,
            logs: result.logs,
            duration: result.duration,
            compilationType: "modal",
          };
        }
      }
    } else {
      return {
        success: false,
        error: result.error || "Modal compilation failed",
        logs: result.logs,
        duration: result.duration,
        compilationType: "modal",
      };
    }
  } catch (error) {
    throw new Error(
      `Modal compilation failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Compile using local Manim installation (original implementation).
 */
async function compileWithLocal(
  pythonCode: string,
  className: string,
): Promise<ManimCompilationResult> {
  const tempDir = `/tmp/manim-current`;
  const fileName = `current_animation.py`;
  const filePath = path.join(tempDir, fileName);
  const outputDir = "/tmp";

  try {
    console.log(`[MANIM-COMPILER] Starting local compilation for ${className}`);

    // Create temporary directory
    mkdirSync(tempDir, { recursive: true });

    // Write Python code to file
    writeFileSync(filePath, pythonCode);
    console.log(`[MANIM-COMPILER] ✅ Python file written: ${filePath}`);

    // Activate UV environment and run Manim with LaTeX support
    const uvEnvPath = path.join(process.cwd(), "manim-test");
    const command = `export LIBGS=/opt/homebrew/lib/libgs.dylib && eval "$(/usr/libexec/path_helper -s)" && source ${uvEnvPath}/bin/activate && manim ${filePath} ${className} -ql --disable_caching`;

    console.log(`[MANIM-COMPILER] 🚀 Executing: ${command}`);

    // Execute Manim compilation
    const output = execSync(command, {
      cwd: tempDir,
      encoding: "utf8",
      timeout: 120000, // 120 second timeout (2 minutes)
    });

    console.log(`[MANIM-COMPILER] ✅ Local compilation completed`);

    // Find the generated video file in the standard Manim output structure
    const manimOutputPath = path.join(
      tempDir,
      "media",
      "videos",
      "current_animation",
      "480p15",
      `${className}.mp4`,
    );
    const finalVideoPath = path.join(outputDir, "latest.mp4"); // Store in /tmp

    console.log(`[MANIM-COMPILER] 🔍 Looking for video at: ${manimOutputPath}`);

    if (existsSync(manimOutputPath)) {
      try {
        // Read the video file and upload to Vercel Blob
        const { readFileSync } = await import("fs");
        const videoBuffer = readFileSync(manimOutputPath);

        console.log(
          `[MANIM-COMPILER] 📤 Uploading local video to Vercel Blob... (${videoBuffer.length} bytes)`,
        );

        // Generate simple video ID and upload to Blob
        const videoId = generateSimpleVideoId();
        const blob = await put(`videos/${videoId}.mp4`, videoBuffer, {
          access: "public",
          contentType: "video/mp4",
        });

        console.log(
          `[MANIM-COMPILER] ✅ Local video uploaded to Blob: ${blob.url}`,
        );
        console.log(`[MANIM-COMPILER] Video ID: ${videoId}`);

        return {
          success: true,
          videoPath: blob.pathname,
          videoUrl: blob.url,
          videoId: videoId,
          logs: output,
          compilationType: "local",
        };
      } catch (blobError) {
        console.error(
          `[MANIM-COMPILER] ❌ Failed to upload local video to Blob, falling back to /tmp:`,
          blobError,
        );

        // Fallback to original /tmp approach if Blob fails
        try {
          const { readFileSync, copyFileSync } = await import("fs");
          const videoId = generateSimpleVideoId();
          const videoBuffer = readFileSync(manimOutputPath);
          copyFileSync(manimOutputPath, finalVideoPath);

          console.log(
            `[MANIM-COMPILER] ✅ Local video saved to /tmp as fallback`,
          );
          console.log(`[MANIM-COMPILER] Video ID: ${videoId} (tmp fallback)`);

          return {
            success: true,
            videoPath: finalVideoPath,
            videoUrl: `/api/videos?id=${videoId}`,
            videoId: videoId,
            logs: output,
            compilationType: "local",
          };
        } catch (tmpError) {
          console.error(
            `[MANIM-COMPILER] ❌ Failed to save local video to /tmp as well:`,
            tmpError,
          );

          return {
            success: false,
            error: `Failed to save local video (Blob: ${blobError instanceof Error ? blobError.message : String(blobError)}, tmp: ${tmpError instanceof Error ? tmpError.message : String(tmpError)})`,
            logs: output,
            compilationType: "local",
          };
        }
      }
    } else {
      // Try to find any video file in the output directory
      try {
        const videoDir = path.dirname(manimOutputPath);
        const files = readdirSync(videoDir);
        const mp4Files = files.filter((f) => f.endsWith(".mp4"));
        console.log(`[MANIM-COMPILER] 📁 Files in ${videoDir}:`, files);
        console.log(`[MANIM-COMPILER] 🎬 MP4 files found:`, mp4Files);
      } catch (e) {
        console.log(
          `[MANIM-COMPILER] ❌ Could not read directory: ${path.dirname(manimOutputPath)}`,
        );
      }

      throw new Error(
        `Video file was not generated at expected path: ${manimOutputPath}`,
      );
    }
  } catch (error) {
    console.error(`[MANIM-COMPILER] ❌ Local compilation failed:`, error);

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      logs: error instanceof Error ? error.stack : undefined,
      compilationType: "local",
    };
  }
}

export function extractManimCode(
  text: string,
): { code: string; className: string } | null {
  // Look for Python code blocks
  const codeBlockRegex = /```(?:python)?\s*([\s\S]*?)\s*```/gi;
  const match = codeBlockRegex.exec(text);

  if (!match) return null;

  const code = match[1];

  // Extract class name (look for class definition)
  const classMatch = code.match(/class\s+(\w+)\s*\(/);
  const className = classMatch ? classMatch[1] : "Scene";

  // Validate it's Manim code
  if (code.includes("from manim import") || code.includes("manim")) {
    return { code, className };
  }

  return null;
}
