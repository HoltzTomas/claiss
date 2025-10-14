import { NextRequest, NextResponse } from 'next/server';
import { concatenateScenes, validateScenesForConcatenation } from '@/lib/scene-concatenator';
import type { ConcatenationOptions } from '@/lib/scene-concatenator';

export const maxDuration = 60;

/**
 * POST /api/video-merge
 * Merge compiled scene videos into final video
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

    const scenesToMerge = scenes;

    // Validate scenes before concatenation
    console.log(`[VIDEO-MERGE-API] Validating ${scenesToMerge.length} scenes...`);
    const validation = await validateScenesForConcatenation(scenesToMerge);

    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: 'Scene validation failed',
        issues: validation.issues
      }, { status: 400 });
    }

    // Merge scenes
    console.log(`[VIDEO-MERGE-API] Merging ${scenesToMerge.length} scenes...`);
    const mergeOptions: ConcatenationOptions = {
      quality: options.quality || 'low',
      addTransitions: options.addTransitions || false,
      transitionDuration: options.transitionDuration || 0.5,
      format: options.format || 'mp4'
    };

    const result = await concatenateScenes(scenesToMerge, mergeOptions);

    const duration = Date.now() - startTime;

    if (result.success) {
      console.log(`[VIDEO-MERGE-API] ✅ Merge completed in ${duration}ms`);
      console.log(`[VIDEO-MERGE-API] Final video: ${result.videoUrl}`);

      return NextResponse.json({
        success: true,
        videoUrl: result.videoUrl,
        videoId: result.videoId || videoId,
        duration: `${duration}ms`,
        mergeTime: result.duration,
        sceneCount: scenesToMerge.length
      });
    } else {
      console.error(`[VIDEO-MERGE-API] ❌ Merge failed after ${duration}ms:`, result.error);

      return NextResponse.json({
        success: false,
        error: result.error,
        duration: `${duration}ms`
      }, { status: 500 });
    }

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
