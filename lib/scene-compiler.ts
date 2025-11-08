import { compileManimCode } from './manim-compiler';
import type { Scene, SceneCompilationResult } from './scene-types';

export async function compileScene(scene: Scene): Promise<SceneCompilationResult> {
  console.log(`[SCENE-COMPILER] Compiling scene: ${scene.name} (${scene.id})`);

  try {
    const classMatch = scene.code.match(/class\s+(\w+)\s*\(/);
    const className = classMatch ? classMatch[1] : 'Scene';

    const result = await compileManimCode(scene.code, className);

    if (result.success) {
      console.log(`[SCENE-COMPILER] ✅ Scene "${scene.name}" compiled successfully`);
      console.log(`[SCENE-COMPILER]   - Video ID: ${result.videoId}`);
      console.log(`[SCENE-COMPILER]   - Video URL: ${result.videoUrl}`);

      return {
        success: true,
        sceneId: scene.id,
        videoUrl: result.videoUrl,
        videoId: result.videoId,
        duration: result.duration,
        logs: result.logs
      };
    } else {
      console.error(`[SCENE-COMPILER] ❌ Scene "${scene.name}" compilation failed:`, result.error);

      return {
        success: false,
        sceneId: scene.id,
        error: result.error,
        logs: result.logs
      };
    }
  } catch (error) {
    console.error(`[SCENE-COMPILER] ❌ Unexpected error compiling scene "${scene.name}":`, error);

    return {
      success: false,
      sceneId: scene.id,
      error: error instanceof Error ? error.message : 'Unknown compilation error'
    };
  }
}

export async function compileScenes(scenes: Scene[]): Promise<SceneCompilationResult[]> {
  console.log(`[SCENE-COMPILER] Compiling ${scenes.length} scene(s) in parallel...`);

  const startTime = Date.now();

  const results = await Promise.all(
    scenes.map(scene => compileScene(scene))
  );

  const duration = Date.now() - startTime;
  const successful = results.filter(r => r.success).length;

  console.log(`[SCENE-COMPILER] Compilation complete in ${duration}ms`);
  console.log(`[SCENE-COMPILER]   - Successful: ${successful}/${scenes.length}`);

  return results;
}

export async function compileModifiedScenes(scenes: Scene[]): Promise<SceneCompilationResult[]> {
  const modifiedScenes = scenes.filter(s => s.status === 'pending');

  console.log(`[SCENE-COMPILER] Found ${modifiedScenes.length} modified scene(s) to compile`);

  if (modifiedScenes.length === 0) {
    return [];
  }

  return compileScenes(modifiedScenes);
}

export async function getOrCompileScene(scene: Scene): Promise<SceneCompilationResult> {
  if (scene.status === 'compiled' && scene.videoUrl) {
    console.log(`[SCENE-COMPILER] Using cached video for scene "${scene.name}"`);

    return {
      success: true,
      sceneId: scene.id,
      videoUrl: scene.videoUrl,
      videoId: scene.videoId
    };
  }

  console.log(`[SCENE-COMPILER] No cache found, compiling scene "${scene.name}"`);
  return compileScene(scene);
}

export async function compileScenesWithDependencies(scenes: Scene[]): Promise<SceneCompilationResult[]> {
  console.log(`[SCENE-COMPILER] Compiling scenes with dependency resolution...`);

  const sceneMap = new Map<string, Scene>();
  scenes.forEach(s => sceneMap.set(s.id, s));

  const sorted: Scene[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(sceneId: string) {
    if (visited.has(sceneId)) return;
    if (visiting.has(sceneId)) {
      console.warn(`[SCENE-COMPILER] Circular dependency detected for scene ${sceneId}`);
      return;
    }

    visiting.add(sceneId);
    const scene = sceneMap.get(sceneId);

    if (scene && scene.dependencies) {
      for (const depId of scene.dependencies) {
        visit(depId);
      }
    }

    visiting.delete(sceneId);
    visited.add(sceneId);

    if (scene) {
      sorted.push(scene);
    }
  }

  // Visit all scenes
  scenes.forEach(scene => visit(scene.id));

  console.log(`[SCENE-COMPILER] Compilation order:`, sorted.map(s => s.name));

  const results: SceneCompilationResult[] = [];

  for (const scene of sorted) {
    const result = await compileScene(scene);
    results.push(result);

    // Stop if compilation fails for a scene that others depend on
    if (!result.success && scenes.some(s => s.dependencies?.includes(scene.id))) {
      console.error(`[SCENE-COMPILER] Critical scene "${scene.name}" failed, stopping compilation`);
      break;
    }
  }

  return results;
}

export function estimateCompilationTime(scenes: Scene[]): number {
  const avgTimePerScene = 20;

  return scenes.length * avgTimePerScene;
}

export function needsRecompilation(scene: Scene): boolean {
  return scene.status === 'pending' ||
         scene.status === 'failed' ||
         !scene.videoUrl;
}

export function getCompilationProgress(scenes: Scene[]): {
  total: number;
  compiled: number;
  pending: number;
  failed: number;
  percentage: number;
} {
  const total = scenes.length;
  const compiled = scenes.filter(s => s.status === 'compiled').length;
  const pending = scenes.filter(s => s.status === 'pending').length;
  const failed = scenes.filter(s => s.status === 'failed').length;
  const percentage = total > 0 ? (compiled / total) * 100 : 0;

  return { total, compiled, pending, failed, percentage };
}
