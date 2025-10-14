/**
 * Scene concatenation system using FFmpeg
 * Merges individual scene videos into a final video
 */

import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { put } from '@vercel/blob';
import type { Scene } from './scene-types';
import { configureFfmpeg } from './ffmpeg-config';

// Configure FFmpeg paths (works in dev and production)
configureFfmpeg();

/**
 * Concatenation options
 */
export interface ConcatenationOptions {
  /** Output quality */
  quality?: 'low' | 'medium' | 'high';

  /** Whether to add transitions between scenes */
  addTransitions?: boolean;

  /** Transition duration in seconds */
  transitionDuration?: number;

  /** Output format */
  format?: 'mp4' | 'mov' | 'webm';
}

/**
 * Concatenation result
 */
export interface ConcatenationResult {
  success: boolean;
  videoUrl?: string;
  videoId?: string;
  duration?: number;
  error?: string;
}

/**
 * Download video from URL to temporary file
 */
async function downloadVideo(url: string, outputPath: string): Promise<void> {
  console.log(`[CONCATENATOR] Downloading video from ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  await fs.writeFile(outputPath, Buffer.from(buffer));

  console.log(`[CONCATENATOR] Downloaded to ${outputPath}`);
}

/**
 * Create FFmpeg input list file
 */
async function createInputListFile(videoPaths: string[]): Promise<string> {
  const listPath = path.join('/tmp', `concat-list-${Date.now()}.txt`);

  const content = videoPaths
    .map(p => `file '${p}'`)
    .join('\n');

  await fs.writeFile(listPath, content);

  console.log(`[CONCATENATOR] Created input list: ${listPath}`);
  return listPath;
}

/**
 * Concatenate scene videos using FFmpeg concat demuxer (fast, no re-encoding)
 */
async function concatenateWithDemuxer(
  videoPaths: string[],
  outputPath: string
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      // Create input list file for concat demuxer
      const listPath = await createInputListFile(videoPaths);

      console.log(`[CONCATENATOR] Concatenating ${videoPaths.length} videos...`);

      ffmpeg()
        .input(listPath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions([
          '-c', 'copy' // Copy streams without re-encoding (fastest)
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log(`[CONCATENATOR] FFmpeg command: ${commandLine}`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`[CONCATENATOR] Progress: ${Math.round(progress.percent)}%`);
          }
        })
        .on('end', async () => {
          console.log(`[CONCATENATOR] ✅ Concatenation completed`);

          // Clean up input list file
          try {
            await fs.unlink(listPath);
          } catch (e) {
            console.warn(`[CONCATENATOR] Failed to clean up list file:`, e);
          }

          resolve();
        })
        .on('error', async (error) => {
          console.error(`[CONCATENATOR] ❌ FFmpeg error:`, error);

          // Clean up input list file
          try {
            await fs.unlink(listPath);
          } catch (e) {
            console.warn(`[CONCATENATOR] Failed to clean up list file:`, e);
          }

          reject(new Error(`Concatenation failed: ${error.message}`));
        })
        .run();
    } catch (error) {
      console.error(`[CONCATENATOR] Setup error:`, error);
      reject(error);
    }
  });
}

/**
 * Concatenate scene videos with crossfade transitions
 */
async function concatenateWithTransitions(
  videoPaths: string[],
  outputPath: string,
  transitionDuration: number = 0.5
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      console.log(`[CONCATENATOR] Concatenating with transitions...`);

      const command = ffmpeg();

      // Add all video inputs
      videoPaths.forEach(videoPath => {
        command.input(videoPath);
      });

      // Build complex filter for crossfade transitions
      const filterComplex: string[] = [];
      let currentStream = '[0:v]';

      for (let i = 0; i < videoPaths.length - 1; i++) {
        const nextStream = `[${i + 1}:v]`;
        const outputStream = i === videoPaths.length - 2 ? '[v]' : `[v${i}]`;

        filterComplex.push(
          `${currentStream}${nextStream}xfade=transition=fade:duration=${transitionDuration}:offset=${i * 10}${outputStream}`
        );

        currentStream = outputStream;
      }

      command
        .complexFilter(filterComplex)
        .outputOptions([
          '-map', '[v]',
          '-c:v', 'libx264',
          '-preset', 'medium',
          '-crf', '23'
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log(`[CONCATENATOR] FFmpeg command: ${commandLine}`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`[CONCATENATOR] Progress: ${Math.round(progress.percent)}%`);
          }
        })
        .on('end', () => {
          console.log(`[CONCATENATOR] ✅ Concatenation with transitions completed`);
          resolve();
        })
        .on('error', (error) => {
          console.error(`[CONCATENATOR] ❌ FFmpeg error:`, error);
          reject(new Error(`Concatenation failed: ${error.message}`));
        })
        .run();
    } catch (error) {
      console.error(`[CONCATENATOR] Setup error:`, error);
      reject(error);
    }
  });
}

/**
 * Main concatenation function
 */
export async function concatenateScenes(
  scenes: Scene[],
  options: ConcatenationOptions = {}
): Promise<ConcatenationResult> {
  const startTime = Date.now();

  try {
    console.log(`[CONCATENATOR] Starting concatenation of ${scenes.length} scenes`);

    // Filter and sort scenes
    const validScenes = scenes
      .filter(s => s.status === 'compiled' && s.videoUrl)
      .sort((a, b) => a.order - b.order);

    if (validScenes.length === 0) {
      return {
        success: false,
        error: 'No compiled scenes to concatenate'
      };
    }

    if (validScenes.length === 1) {
      // Single scene, just return its URL
      return {
        success: true,
        videoUrl: validScenes[0].videoUrl,
        videoId: validScenes[0].videoId,
        duration: validScenes[0].duration
      };
    }

    // Download scene videos to temp directory
    const tempDir = path.join('/tmp', `concat-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    const tempPaths: string[] = [];

    for (let i = 0; i < validScenes.length; i++) {
      const scene = validScenes[i];
      const tempPath = path.join(tempDir, `scene-${i}.mp4`);

      await downloadVideo(scene.videoUrl!, tempPath);
      tempPaths.push(tempPath);
    }

    // Output path
    const outputPath = path.join(tempDir, 'final-video.mp4');

    // Concatenate
    if (options.addTransitions) {
      await concatenateWithTransitions(
        tempPaths,
        outputPath,
        options.transitionDuration || 0.5
      );
    } else {
      await concatenateWithDemuxer(tempPaths, outputPath);
    }

    // Upload final video to Vercel Blob
    console.log(`[CONCATENATOR] Uploading final video to Blob...`);
    const finalVideoBuffer = await fs.readFile(outputPath);
    const videoId = `final-${Date.now()}`;

    const blob = await put(`videos/${videoId}.mp4`, finalVideoBuffer, {
      access: 'public',
      contentType: 'video/mp4'
    });

    console.log(`[CONCATENATOR] ✅ Final video uploaded: ${blob.url}`);

    // Clean up temp files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
      console.log(`[CONCATENATOR] Cleaned up temp directory`);
    } catch (e) {
      console.warn(`[CONCATENATOR] Failed to clean up temp directory:`, e);
    }

    const duration = (Date.now() - startTime) / 1000;

    return {
      success: true,
      videoUrl: blob.url,
      videoId,
      duration
    };
  } catch (error) {
    console.error(`[CONCATENATOR] ❌ Concatenation error:`, error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown concatenation error'
    };
  }
}

/**
 * Estimate concatenation time
 */
export function estimateConcatenationTime(sceneCount: number, withTransitions: boolean): number {
  // Without transitions (concat demuxer): ~1-2 seconds per scene
  // With transitions (re-encoding): ~5-10 seconds per scene
  const timePerScene = withTransitions ? 7 : 1.5;

  return sceneCount * timePerScene;
}

/**
 * Validate scene videos are compatible for concatenation
 */
export async function validateScenesForConcatenation(scenes: Scene[]): Promise<{
  valid: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  // Check all scenes have videos
  const missingVideos = scenes.filter(s => !s.videoUrl);
  if (missingVideos.length > 0) {
    issues.push(`${missingVideos.length} scene(s) missing compiled videos`);
  }

  // Check scenes are properly ordered
  const orders = scenes.map(s => s.order).sort((a, b) => a - b);
  const expectedOrders = scenes.map((_, i) => i);
  if (JSON.stringify(orders) !== JSON.stringify(expectedOrders)) {
    issues.push('Scene order has gaps or duplicates');
  }

  return {
    valid: issues.length === 0,
    issues
  };
}
