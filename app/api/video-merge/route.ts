import { NextRequest, NextResponse } from 'next/server';
import { defaultModalHttpClient } from '@/lib/modal-client-http';
import { put } from '@vercel/blob';
import type { Scene } from '@/lib/scene-types';

export const maxDuration = 60;

/**
 * Validate scenes before merging
 */
function validateScenes(scenes: Scene[]): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check all scenes have videos
  const missingVideos = scenes.filter(s => !s.videoUrl || s.status !== 'compiled');
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

/**
 * POST /api/video-merge
 * Merge compiled scene videos into final video using Modal's FFmpeg
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log(`[VIDEO-MERGE-API] Starting request at ${new Date().toISOString()}`);

  try {
    const body = await request.json();
    const { videoId, scenes, options = {} } = body;

    // Scenes array is required
    if (!scenes || !Array.isArray(scenes)) {
      return NextResponse.json({
        success: false,
        error: 'Scenes array is required'
      }, { status: 400 });
    }

    const scenesToMerge: Scene[] = scenes;

    // Validate scenes before merging
    console.log(`[VIDEO-MERGE-API] Validating ${scenesToMerge.length} scenes...`);
    const validation = validateScenes(scenesToMerge);

    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: 'Scene validation failed',
        issues: validation.issues
      }, { status: 400 });
    }

    // Filter and sort scenes
    const validScenes = scenesToMerge
      .filter(s => s.status === 'compiled' && s.videoUrl)
      .sort((a, b) => a.order - b.order);

    if (validScenes.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No compiled scenes to merge'
      }, { status: 400 });
    }

    // Extract video URLs
    const videoUrls = validScenes.map(s => s.videoUrl!);

    console.log(`[VIDEO-MERGE-API] Merging ${videoUrls.length} scenes using Modal...`);

    // Call Modal to merge videos
    const mergeResult = await defaultModalHttpClient.mergeVideos({
      video_urls: videoUrls,
      add_transitions: options.addTransitions || false,
      transition_duration: options.transitionDuration || 0.5
    });

    if (!mergeResult.success) {
      console.error(`[VIDEO-MERGE-API] ❌ Modal merge failed:`, mergeResult.error);
      return NextResponse.json({
        success: false,
        error: mergeResult.error || 'Merge failed',
        duration: `${Date.now() - startTime}ms`
      }, { status: 500 });
    }

    // Upload merged video to Vercel Blob
    console.log(`[VIDEO-MERGE-API] Uploading merged video to Blob...`);
    const mergedVideoId = videoId || `final-${Date.now()}`;

    // Convert Uint8Array to Buffer for Vercel Blob
    const videoBuffer = Buffer.from(mergeResult.video_bytes!);

    const blob = await put(`videos/${mergedVideoId}.mp4`, videoBuffer, {
      access: 'public',
      contentType: 'video/mp4',
      addRandomSuffix: true // Ensures unique filename for each merge
    });

    const duration = Date.now() - startTime;

    console.log(`[VIDEO-MERGE-API] ✅ Merge completed in ${duration}ms`);
    console.log(`[VIDEO-MERGE-API] Final video: ${blob.url}`);

    return NextResponse.json({
      success: true,
      videoUrl: blob.url,
      videoId: mergedVideoId,
      duration: `${duration}ms`,
      mergeTime: mergeResult.duration,
      sceneCount: validScenes.length
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[VIDEO-MERGE-API] ❌ Error after ${duration}ms:`, error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`
    }, { status: 500 });
  }
}

/**
 * GET /api/video-merge
 * Get merge status and options
 */
export async function GET() {
  return NextResponse.json({
    name: 'Video Merge API',
    description: 'Merge compiled scene videos into final video',
    endpoints: {
      POST: {
        description: 'Merge scenes',
        body: {
          videoId: 'optional - video ID for reference',
          scenes: 'required - array of scene objects with videoUrl',
          options: {
            quality: 'low | medium | high',
            addTransitions: 'boolean',
            transitionDuration: 'number (seconds)',
            format: 'mp4 | mov | webm'
          }
        }
      }
    },
    status: 'active',
    note: 'Client must send scenes array - server does not access localStorage'
  });
}
