import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync } from 'fs';
import { compileAnimationWithModal } from '@/lib/modal-client';

export interface ManimCompileRequest {
  pythonCode: string;
  className?: string;
  quality?: 'low_quality' | 'medium_quality' | 'high_quality';
}

export interface ManimCompileResponse {
  success: boolean;
  videoUrl?: string;
  error?: string;
  logs?: string;
  duration?: number;
  compilationType: 'modal' | 'local';
}

export async function POST(request: NextRequest) {
  try {
    console.log('[MANIM-COMPILE-API] Received compilation request');

    const body: ManimCompileRequest = await request.json();
    const { pythonCode, className = 'Scene', quality = 'low_quality' } = body;

    if (!pythonCode) {
      return NextResponse.json(
        {
          success: false,
          error: 'Python code is required',
          compilationType: 'modal'
        } as ManimCompileResponse,
        { status: 400 }
      );
    }

    console.log(`[MANIM-COMPILE-API] Compiling class: ${className}`);
    console.log(`[MANIM-COMPILE-API] Quality: ${quality}`);

    // Use Modal for compilation
    const result = await compileAnimationWithModal(pythonCode, className, quality);

    const compilationFailed = !result.success || !result.video_bytes;

    if (compilationFailed) {
      console.error('[MANIM-COMPILE-API] ❌ Modal compilation failed:', result.error);

      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Modal compilation failed',
          logs: result.logs,
          duration: result.duration,
          compilationType: 'modal'
        } as ManimCompileResponse,
        { status: 500 }
      );
    }

    const videoPath = '/tmp/latest.mp4';

    try {
      // Convert Uint8Array to Buffer and write to file
      const buffer = Buffer.from(result.video_bytes!);
      writeFileSync(videoPath, buffer);

      console.log(`[MANIM-COMPILE-API] ✅ Video saved to ${videoPath}`);
      console.log(`[MANIM-COMPILE-API] Video size: ${buffer.length} bytes`);
      console.log(`[MANIM-COMPILE-API] Compilation duration: ${result.duration?.toFixed(2)}s`);

      return NextResponse.json({
        success: true,
        videoUrl: '/api/videos', // Existing video serving endpoint
        logs: result.logs,
        duration: result.duration,
        compilationType: 'modal'
      } as ManimCompileResponse);

    } catch (saveError) {
      console.error('[MANIM-COMPILE-API] ❌ Failed to save video file:', saveError);

      return NextResponse.json(
        {
          success: false,
          error: `Failed to save compiled video: ${saveError instanceof Error ? saveError.message : String(saveError)}`,
          logs: result.logs,
          duration: result.duration,
          compilationType: 'modal'
        } as ManimCompileResponse,
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[MANIM-COMPILE-API] ❌ API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: `API error: ${error instanceof Error ? error.message : String(error)}`,
        compilationType: 'modal'
      } as ManimCompileResponse,
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Health check endpoint
  try {
    const { defaultModalClient } = await import('@/lib/modal-client');
    const health = await defaultModalClient.healthCheck();

    return NextResponse.json({
      status: health.healthy ? 'healthy' : 'unhealthy',
      modal_available: health.healthy,
      error: health.error,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        modal_available: false,
        error: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
