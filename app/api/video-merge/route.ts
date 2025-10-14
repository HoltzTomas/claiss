import { NextRequest, NextResponse } from 'next/server';
import { concatenateScenes, validateScenesForConcatenation } from '@/lib/scene-concatenator';
import { sceneManager } from '@/lib/scene-manager';
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

    // Get scenes from videoId or use provided scenes
    let scenesToMerge = scenes;

    if (videoId && !scenes) {
      const video = sceneManager.getVideo(videoId);
      if (!video) {
        return NextResponse.json({
          success: false,
          error: 'Video not found'
        }, { status: 404 });
      }
      scenesToMerge = video.scenes;
    }

    if (!scenesToMerge || !Array.isArray(scenesToMerge)) {
      return NextResponse.json({
        success: false,
        error: 'Scenes array or videoId is required'
      }, { status: 400 });
    }

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

      // Update video with final URL if videoId provided
      if (videoId) {
        const video = sceneManager.getVideo(videoId);
        if (video) {
          video.finalVideoUrl = result.videoUrl;
          video.status = 'ready';
          video.totalDuration = result.duration;
          sceneManager.saveVideo(video);
        }
      }

      return NextResponse.json({
        success: true,
        videoUrl: result.videoUrl,
        videoId: result.videoId,
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
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const videoId = searchParams.get('videoId');

  if (videoId) {
    const video = sceneManager.getVideo(videoId);

    if (!video) {
      return NextResponse.json({
        success: false,
        error: 'Video not found'
      }, { status: 404 });
    }

    const validation = await validateScenesForConcatenation(video.scenes);
    const compiledScenes = video.scenes.filter(s => s.status === 'compiled');

    return NextResponse.json({
      success: true,
      video: {
        id: video.id,
        title: video.title,
        status: video.status,
        finalVideoUrl: video.finalVideoUrl
      },
      scenes: {
        total: video.scenes.length,
        compiled: compiledScenes.length,
        pending: video.scenes.filter(s => s.status === 'pending').length,
        failed: video.scenes.filter(s => s.status === 'failed').length
      },
      validation,
      readyToMerge: validation.valid && compiledScenes.length === video.scenes.length
    });
  }

  return NextResponse.json({
    name: 'Video Merge API',
    description: 'Merge compiled scene videos into final video',
    endpoints: {
      POST: {
        description: 'Merge scenes',
        body: {
          videoId: 'optional - get scenes from video',
          scenes: 'optional - array of scene objects',
          options: {
            quality: 'low | medium | high',
            addTransitions: 'boolean',
            transitionDuration: 'number (seconds)',
            format: 'mp4 | mov | webm'
          }
        }
      },
      GET: {
        description: 'Check merge readiness',
        query: {
          videoId: 'video ID to check'
        }
      }
    },
    status: 'active'
  });
}
