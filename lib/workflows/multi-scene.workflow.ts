/**
 * Multi-Scene Video Workflow
 *
 * Orchestrates the generation, compilation, and merging of multiple scenes
 * into a complete video. Uses parallel execution where possible and handles
 * partial failures gracefully.
 */

import { getStepMetadata, getWorkflowMetadata } from 'workflow';
import { start, getRun } from 'workflow/api';
import { put } from '@vercel/blob';
import { videoGenerationWorkflow, type VideoGenerationInput, type VideoGenerationOutput } from './video-generation.workflow';
import { createWorkflowError } from './error-classification';
import { generateIdempotencyKey } from './workflow-config';
import { defaultModalHttpClient } from '../modal-client-http';
import { generateSimpleVideoId } from '../simple-video-id';

/**
 * Multi-scene workflow input
 */
export interface MultiSceneInput {
  videoId?: string;
  title: string;
  scenes: Array<{
    name: string;
    prompt: string;
    order: number;
  }>;
  mergeOptions?: {
    addTransitions?: boolean;
    transitionDuration?: number;
  };
}

/**
 * Multi-scene workflow output
 */
export interface MultiSceneOutput {
  success: boolean;
  videoId: string;
  title: string;
  finalVideoUrl?: string;
  scenes: Array<{
    sceneId: string;
    name: string;
    status: 'completed' | 'failed';
    videoUrl?: string;
    error?: string;
  }>;
  error?: string;
  steps: {
    sceneGeneration: 'completed' | 'failed' | 'partial';
    videoMerge: 'completed' | 'failed' | 'skipped';
    finalUpload: 'completed' | 'failed' | 'skipped';
  };
}

/**
 * Scene generation result
 */
interface SceneResult {
  sceneId: string;
  name: string;
  order: number;
  success: boolean;
  videoUrl?: string;
  videoId?: string;
  error?: string;
}

/**
 * Step 1: Generate All Scenes in Parallel
 *
 * This step triggers individual scene generation workflows and waits for completion.
 * Uses Promise.all for parallel execution.
 */
async function generateAllScenesStep(
  scenes: MultiSceneInput['scenes']
): Promise<SceneResult[]> {
  'use step';

  const metadata = getStepMetadata();

  console.log('[MULTI-WORKFLOW-STEP-1] Generating all scenes in parallel...');
  console.log(`[MULTI-WORKFLOW-STEP-1] Total scenes: ${scenes.length}`);
  console.log(`[MULTI-WORKFLOW-STEP-1] Step ID: ${metadata.stepId}`);

  try {
    // Generate all scenes in parallel using the single-scene workflow
    const scenePromises = scenes.map(async (scene) => {
      const sceneId = `scene-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      console.log(`[MULTI-WORKFLOW-STEP-1] Starting scene: ${scene.name}`);

      try {
        // Call the single-scene workflow directly
        // Note: In production, you might want to use start() and poll for status
        const result = await videoGenerationWorkflow({
          prompt: scene.prompt,
          sceneName: scene.name,
          sceneId
        });

        if (result.success) {
          console.log(`[MULTI-WORKFLOW-STEP-1] ✅ Scene "${scene.name}" completed`);

          return {
            sceneId: result.sceneId,
            name: scene.name,
            order: scene.order,
            success: true,
            videoUrl: result.videoUrl,
            videoId: result.videoId
          };
        } else {
          console.error(`[MULTI-WORKFLOW-STEP-1] ❌ Scene "${scene.name}" failed: ${result.error}`);

          return {
            sceneId: result.sceneId,
            name: scene.name,
            order: scene.order,
            success: false,
            error: result.error
          };
        }
      } catch (error: any) {
        console.error(`[MULTI-WORKFLOW-STEP-1] ❌ Scene "${scene.name}" threw error:`, error);

        return {
          sceneId,
          name: scene.name,
          order: scene.order,
          success: false,
          error: error.message || 'Scene generation failed'
        };
      }
    });

    // Wait for all scenes to complete
    const results = await Promise.all(scenePromises);

    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    console.log(`[MULTI-WORKFLOW-STEP-1] Batch complete: ${successful} succeeded, ${failed} failed`);

    // Sort results by order
    results.sort((a, b) => a.order - b.order);

    return results;

  } catch (error: any) {
    console.error('[MULTI-WORKFLOW-STEP-1] ❌ Batch generation error:', error);

    throw createWorkflowError(error, {
      operation: 'Batch scene generation',
      attemptNumber: metadata.attempt,
      stepType: 'aiGeneration',
      errorMessage: error?.message
    });
  }
}

/**
 * Step 2: Merge Scene Videos
 *
 * Takes all successfully compiled scene videos and merges them into one final video.
 */
async function mergeVideosStep(
  scenes: SceneResult[],
  mergeOptions?: MultiSceneInput['mergeOptions']
): Promise<{ videoBytes: Uint8Array; sceneCount: number }> {
  'use step';

  const metadata = getStepMetadata();

  const successfulScenes = scenes
    .filter(s => s.success && s.videoUrl)
    .sort((a, b) => a.order - b.order);

  console.log('[MULTI-WORKFLOW-STEP-2] Merging scene videos...');
  console.log(`[MULTI-WORKFLOW-STEP-2] Scenes to merge: ${successfulScenes.length}`);
  console.log(`[MULTI-WORKFLOW-STEP-2] Step ID: ${metadata.stepId}`);

  if (successfulScenes.length === 0) {
    throw new Error('No successful scenes to merge');
  }

  if (successfulScenes.length === 1) {
    // Only one scene - no need to merge, just download it
    console.log('[MULTI-WORKFLOW-STEP-2] Only one scene - skipping merge');

    const response = await fetch(successfulScenes[0].videoUrl!);
    if (!response.ok) {
      throw new Error(`Failed to fetch single scene video: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const videoBytes = new Uint8Array(arrayBuffer);

    console.log('[MULTI-WORKFLOW-STEP-2] ✅ Single scene video retrieved');

    return {
      videoBytes,
      sceneCount: 1
    };
  }

  // Multiple scenes - merge them
  try {
    const videoUrls = successfulScenes.map(s => s.videoUrl!);

    const mergeResult = await defaultModalHttpClient.mergeVideos({
      video_urls: videoUrls,
      add_transitions: mergeOptions?.addTransitions || false,
      transition_duration: mergeOptions?.transitionDuration || 0.5
    });

    if (!mergeResult.success || !mergeResult.video_bytes) {
      throw new Error(mergeResult.error || 'Merge failed without error message');
    }

    console.log('[MULTI-WORKFLOW-STEP-2] ✅ Videos merged successfully');
    console.log(`[MULTI-WORKFLOW-STEP-2] Merged video size: ${mergeResult.video_bytes.length} bytes`);

    return {
      videoBytes: mergeResult.video_bytes,
      sceneCount: successfulScenes.length
    };

  } catch (error: any) {
    console.error('[MULTI-WORKFLOW-STEP-2] ❌ Merge error:', error);

    throw createWorkflowError(error, {
      operation: 'Video merge',
      attemptNumber: metadata.attempt,
      stepType: 'videoMerge',
      errorMessage: error?.message
    });
  }
}

/**
 * Step 3: Upload Final Merged Video
 */
async function uploadFinalVideoStep(
  videoBytes: Uint8Array,
  videoId: string
): Promise<{ videoUrl: string }> {
  'use step';

  const metadata = getStepMetadata();

  console.log('[MULTI-WORKFLOW-STEP-3] Uploading final merged video...');
  console.log(`[MULTI-WORKFLOW-STEP-3] Video ID: ${videoId}`);
  console.log(`[MULTI-WORKFLOW-STEP-3] Size: ${videoBytes.length} bytes`);
  console.log(`[MULTI-WORKFLOW-STEP-3] Step ID: ${metadata.stepId}`);

  try {
    const buffer = Buffer.from(videoBytes);

    // Use step ID for idempotency
    const idempotencyKey = generateIdempotencyKey(
      metadata.stepId,
      'final-video-upload',
      videoId
    );

    console.log(`[MULTI-WORKFLOW-STEP-3] Idempotency key: ${idempotencyKey}`);

    const blob = await put(`videos/final-${videoId}.mp4`, buffer, {
      access: 'public',
      contentType: 'video/mp4',
      addRandomSuffix: false
    });

    console.log('[MULTI-WORKFLOW-STEP-3] ✅ Final video uploaded successfully');
    console.log(`[MULTI-WORKFLOW-STEP-3] URL: ${blob.url}`);

    return { videoUrl: blob.url };

  } catch (error: any) {
    console.error('[MULTI-WORKFLOW-STEP-3] ❌ Upload error:', error);

    throw createWorkflowError(error, {
      operation: 'Final video upload',
      attemptNumber: metadata.attempt,
      stepType: 'videoUpload',
      errorMessage: error?.message
    });
  }
}

/**
 * Main Multi-Scene Workflow
 */
export async function multiSceneWorkflow(
  input: MultiSceneInput
): Promise<MultiSceneOutput> {
  'use workflow';

  const videoId = input.videoId || `video-${Date.now()}`;

  console.log('[MULTI-WORKFLOW] Starting multi-scene workflow');
  console.log(`[MULTI-WORKFLOW] Video ID: ${videoId}`);
  console.log(`[MULTI-WORKFLOW] Title: ${input.title}`);
  console.log(`[MULTI-WORKFLOW] Scenes: ${input.scenes.length}`);

  const output: MultiSceneOutput = {
    success: false,
    videoId,
    title: input.title,
    scenes: [],
    steps: {
      sceneGeneration: 'failed',
      videoMerge: 'skipped',
      finalUpload: 'skipped'
    }
  };

  try {
    // Step 1: Generate all scenes
    console.log('[MULTI-WORKFLOW] === Step 1: Scene Generation ===');
    const sceneResults = await generateAllScenesStep(input.scenes);

    // Convert results to output format
    output.scenes = sceneResults.map(r => ({
      sceneId: r.sceneId,
      name: r.name,
      status: r.success ? 'completed' : 'failed',
      videoUrl: r.videoUrl,
      error: r.error
    }));

    // Check if we have any successful scenes
    const successfulCount = sceneResults.filter(r => r.success).length;
    const totalCount = sceneResults.length;

    if (successfulCount === 0) {
      output.steps.sceneGeneration = 'failed';
      output.error = 'All scenes failed to generate';
      console.error('[MULTI-WORKFLOW] ❌ All scenes failed');
      return output;
    }

    if (successfulCount < totalCount) {
      output.steps.sceneGeneration = 'partial';
      console.warn(`[MULTI-WORKFLOW] ⚠️ Partial success: ${successfulCount}/${totalCount} scenes completed`);
    } else {
      output.steps.sceneGeneration = 'completed';
      console.log(`[MULTI-WORKFLOW] ✅ All ${totalCount} scenes completed`);
    }

    // Step 2: Merge videos
    console.log('[MULTI-WORKFLOW] === Step 2: Video Merge ===');
    const { videoBytes, sceneCount } = await mergeVideosStep(
      sceneResults,
      input.mergeOptions
    );
    output.steps.videoMerge = 'completed';

    // Step 3: Upload final video
    console.log('[MULTI-WORKFLOW] === Step 3: Final Upload ===');
    const { videoUrl } = await uploadFinalVideoStep(videoBytes, videoId);
    output.steps.finalUpload = 'completed';
    output.finalVideoUrl = videoUrl;

    output.success = true;

    console.log('[MULTI-WORKFLOW] ✅ Multi-scene workflow completed successfully');
    console.log(`[MULTI-WORKFLOW] Final video URL: ${videoUrl}`);
    console.log(`[MULTI-WORKFLOW] Scenes merged: ${sceneCount}`);

    return output;

  } catch (error: any) {
    console.error('[MULTI-WORKFLOW] ❌ Workflow failed:', error);

    output.error = error.message || 'Unknown workflow error';

    // Determine which step failed
    if (output.steps.sceneGeneration === 'failed') {
      // Already set
    } else if (output.steps.videoMerge !== 'completed') {
      output.steps.videoMerge = 'failed';
    } else if (output.steps.finalUpload !== 'completed') {
      output.steps.finalUpload = 'failed';
    }

    return output;
  }
}
