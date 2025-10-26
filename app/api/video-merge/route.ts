import { NextRequest, NextResponse } from 'next/server';
import { defaultModalHttpClient } from '@/lib/modal-client-http';
import { put } from '@vercel/blob';
import type { Scene } from '@/lib/scene-types';

export const maxDuration = 60;

function validateScenes(scenes: Scene[]): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  const missingVideos = scenes.filter(s => !s.videoUrl || s.status !== 'compiled');
  if (missingVideos.length > 0) {
    issues.push(`${missingVideos.length} scene(s) missing compiled videos`);
  }

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

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log(`[VIDEO-MERGE-API] Starting request at ${new Date().toISOString()}`);

  try {
    const body = await request.json();
    const { videoId, scenes, options = {} } = body;

    if (!scenes || !Array.isArray(scenes)) {
      return NextResponse.json({
        success: false,
        error: 'Scenes array is required'
      }, { status: 400 });
    }

    const scenesToMerge: Scene[] = scenes;

    console.log(`[VIDEO-MERGE-API] Validating ${scenesToMerge.length} scenes...`);
    const validation = validateScenes(scenesToMerge);

    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: 'Scene validation failed',
        issues: validation.issues
      }, { status: 400 });
    }

    const validScenes = scenesToMerge
      .filter(s => s.status === 'compiled' && s.videoUrl)
      .sort((a, b) => a.order - b.order);

    if (validScenes.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No compiled scenes to merge'
      }, { status: 400 });
    }

    const videoUrls = validScenes.map(s => s.videoUrl!);

    console.log(`[VIDEO-MERGE-API] Merging ${videoUrls.length} scenes using Modal...`);

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

    console.log(`[VIDEO-MERGE-API] Uploading merged video to Blob...`);
    const mergedVideoId = videoId || `final-${Date.now()}`;

    const videoBuffer = Buffer.from(mergeResult.video_bytes!);

    const blob = await put(`videos/${mergedVideoId}.mp4`, videoBuffer, {
      access: 'public',
      contentType: 'video/mp4',
      addRandomSuffix: true 
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
