import { NextRequest, NextResponse } from 'next/server';
import { sceneManager } from '@/lib/scene-manager';
import type { Scene, SceneOperation, Video } from '@/lib/scene-types';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  console.log(`[SCENE-OPS-API] Starting request at ${new Date().toISOString()}`);

  try {
    const body = await request.json();
    const { videoId, operation } = body;

    if (!videoId) {
      return NextResponse.json({
        success: false,
        error: 'videoId is required'
      }, { status: 400 });
    }

    if (!operation) {
      return NextResponse.json({
        success: false,
        error: 'operation is required'
      }, { status: 400 });
    }

    console.log(`[SCENE-OPS-API] Applying ${operation.type} operation to video ${videoId}`);

    const updatedVideo = sceneManager.applyOperation(videoId, operation as SceneOperation);

    if (!updatedVideo) {
      return NextResponse.json({
        success: false,
        error: 'Failed to apply operation - video not found'
      }, { status: 404 });
    }

    console.log(`[SCENE-OPS-API] Operation successful`);

    return NextResponse.json({
      success: true,
      video: updatedVideo,
      message: `Operation ${operation.type} completed successfully`
    });

  } catch (error) {
    console.error(`[SCENE-OPS-API] Error:`, error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const videoId = searchParams.get('videoId');
    const sceneId = searchParams.get('sceneId');
    const action = searchParams.get('action');

    const isGetLatestVideoRequest = action === 'latest';
    const isGetSpecificVideoRequest = videoId && !sceneId;
    const isGetSpecificSceneRequest = videoId && sceneId;

    const isInvalidRequest = !isGetLatestVideoRequest && !isGetSpecificVideoRequest && !isGetSpecificSceneRequest;

    if (isInvalidRequest) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request'
      }, { status: 400 });
    }

    let video: Video | null = null;
    let scene: Scene | null = null;

    if (isGetLatestVideoRequest) {
      video = sceneManager.getLatestVideo();
    }

    if (isGetSpecificVideoRequest) {
      video = sceneManager.getVideo(videoId);
    }

    if (isGetSpecificSceneRequest) {
      scene = sceneManager.getScene(videoId, sceneId);
    }

    if (!video && !scene) {
      return NextResponse.json({
        success: false,
        error: 'Video or scene not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      video,
      scene
    });
  } catch (error) {
    console.error(`[SCENE-OPS-API] Error:`, error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, sceneId } = body;

    if (!videoId || !sceneId) {
      return NextResponse.json({
        success: false,
        error: 'videoId and sceneId are required'
      }, { status: 400 });
    }

    console.log(`[SCENE-OPS-API] Deleting scene ${sceneId} from video ${videoId}`);

    const updatedVideo = sceneManager.applyOperation(videoId, {
      type: 'delete',
      sceneId
    });

    if (!updatedVideo) {
      return NextResponse.json({
        success: false,
        error: 'Failed to delete scene - video not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      video: updatedVideo,
      message: 'Scene deleted successfully'
    });

  } catch (error) {
    console.error(`[SCENE-OPS-API] Error:`, error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
