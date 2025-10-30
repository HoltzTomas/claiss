import { NextRequest, NextResponse } from 'next/server';
import { compileScene, compileScenes } from '@/lib/scene-compiler';
import type { Scene } from '@/lib/scene-types';

export const maxDuration = 60;


export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log(`[SCENE-COMPILE-API] Starting request at ${new Date().toISOString()}`);

  try {
    const body = await request.json();
    const { scene, scenes, mode = 'single' } = body;

    if (mode === 'single') {
      if (!scene) {
        return NextResponse.json({
          success: false,
          error: 'Scene object is required for single mode'
        }, { status: 400 });
      }

      console.log(`[SCENE-COMPILE-API] Compiling single scene: ${scene.name}`);
      const result = await compileScene(scene as Scene);

      const duration = Date.now() - startTime;
      console.log(`[SCENE-COMPILE-API] Completed in ${duration}ms`);

      return NextResponse.json({
        success: result.success,
        result,
        duration: `${duration}ms`
      });

    } else if (mode === 'multiple') {
      if (!scenes || !Array.isArray(scenes)) {
        return NextResponse.json({
          success: false,
          error: 'Scenes array is required for multiple mode'
        }, { status: 400 });
      }

      console.log(`[SCENE-COMPILE-API] Compiling ${scenes.length} scenes in parallel`);
      const results = await compileScenes(scenes as Scene[]);

      const duration = Date.now() - startTime;
      const successful = results.filter(r => r.success).length;

      console.log(`[SCENE-COMPILE-API] Completed in ${duration}ms - ${successful}/${scenes.length} successful`);

      return NextResponse.json({
        success: true,
        results,
        summary: {
          total: scenes.length,
          successful,
          failed: scenes.length - successful
        },
        duration: `${duration}ms`
      });

    } else {
      return NextResponse.json({
        success: false,
        error: `Invalid mode: ${mode}. Use 'single' or 'multiple'`
      }, { status: 400 });
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[SCENE-COMPILE-API] Error after ${duration}ms:`, error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: 'Scene Compilation API',
    description: 'Compile individual Manim scenes',
    endpoints: {
      POST: {
        description: 'Compile scene(s)',
        modes: {
          single: {
            description: 'Compile a single scene',
            body: {
              mode: 'single',
              scene: {
                id: 'scene-id',
                name: 'Scene Name',
                code: 'Python code',
                order: 0,
                status: 'pending'
              }
            }
          },
          multiple: {
            description: 'Compile multiple scenes in parallel',
            body: {
              mode: 'multiple',
              scenes: ['array of scene objects']
            }
          }
        }
      }
    },
    status: 'active'
  });
}
