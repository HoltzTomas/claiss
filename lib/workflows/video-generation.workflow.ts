/**
 * Video Generation Workflow
 *
 * Main workflow for generating a single scene video with durability and retry logic.
 * Each step is isolated and can be retried independently.
 */

import { getStepMetadata } from 'workflow';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { put } from '@vercel/blob';
import {
  createWorkflowError,
  createValidationError,
  createCompilationError
} from './error-classification';
import { generateIdempotencyKey } from './workflow-config';
import { compileAnimationWithModal } from '../modal-client-http';
import { generateSimpleVideoId } from '../simple-video-id';

/**
 * Workflow input
 */
export interface VideoGenerationInput {
  prompt: string;
  sceneName?: string;
  context?: string;
  sceneId?: string;
  className?: string;
}

/**
 * Workflow output
 */
export interface VideoGenerationOutput {
  success: boolean;
  sceneId: string;
  sceneName: string;
  code?: string;
  videoUrl?: string;
  videoId?: string;
  error?: string;
  steps: {
    codeGeneration: 'completed' | 'failed';
    validation: 'completed' | 'failed' | 'skipped';
    compilation: 'completed' | 'failed' | 'skipped';
    upload: 'completed' | 'failed' | 'skipped';
  };
}

/**
 * Step 1: Generate Scene Code using AI
 */
async function generateSceneCodeStep(
  prompt: string,
  context?: string
): Promise<{ code: string; className: string }> {
  'use step';

  const metadata = getStepMetadata();

  console.log('[WORKFLOW-STEP-1] Generating scene code with AI...');
  console.log(`[WORKFLOW-STEP-1] Step ID: ${metadata.stepId}`);
  console.log(`[WORKFLOW-STEP-1] Attempt: ${metadata.attempt}`);

  try {
    // Note: generateText fetch calls are automatically hoisted to steps
    const result = await generateText({
      model: google('gemini-2.5-pro'),
      prompt: `Generate a Manim Python scene for: ${prompt}

${context ? `\nContext: ${context}` : ''}

Requirements:
- Must include "from manim import *"
- Must define a class that inherits from Scene
- Must have a construct(self) method
- Code should be standalone and executable
- Use clear variable names and comments

Return ONLY the Python code, no explanations.`,
      maxTokens: 2000,
    });

    const code = result.text;

    // Extract class name
    const classMatch = code.match(/class\s+(\w+)\s*\(/);
    const className = classMatch ? classMatch[1] : 'Scene';

    console.log(`[WORKFLOW-STEP-1] ✅ Code generated successfully`);
    console.log(`[WORKFLOW-STEP-1] Class name: ${className}`);

    return { code, className };

  } catch (error: any) {
    console.error('[WORKFLOW-STEP-1] ❌ Error generating code:', error);

    throw createWorkflowError(error, {
      operation: 'AI code generation',
      attemptNumber: metadata.attempt,
      stepType: 'aiGeneration',
      errorMessage: error?.message
    });
  }
}

/**
 * Step 2: Validate Generated Code
 */
async function validateCodeStep(
  code: string,
  className: string
): Promise<{ valid: true }> {
  'use step';

  console.log('[WORKFLOW-STEP-2] Validating generated code...');

  // Check for required imports
  if (!code.includes('from manim import') && !code.includes('import manim')) {
    throw createValidationError(
      'Code validation',
      'Missing manim imports - code must include "from manim import *"'
    );
  }

  // Check for class definition
  if (!code.includes(`class ${className}`)) {
    throw createValidationError(
      'Code validation',
      `Class "${className}" not found in generated code`
    );
  }

  // Check for construct method
  if (!code.includes('def construct')) {
    throw createValidationError(
      'Code validation',
      'Missing construct() method in Scene class'
    );
  }

  // Basic syntax check (very simple)
  const lines = code.split('\n');
  const hasContent = lines.some(line => line.trim().length > 0);

  if (!hasContent) {
    throw createValidationError(
      'Code validation',
      'Generated code is empty'
    );
  }

  console.log('[WORKFLOW-STEP-2] ✅ Code validation passed');

  return { valid: true };
}

/**
 * Step 3: Compile Scene Code
 */
async function compileSceneStep(
  code: string,
  className: string
): Promise<{ videoBytes: Uint8Array; logs?: string; duration?: number }> {
  'use step';

  const metadata = getStepMetadata();

  console.log('[WORKFLOW-STEP-3] Compiling scene...');
  console.log(`[WORKFLOW-STEP-3] Class: ${className}`);
  console.log(`[WORKFLOW-STEP-3] Step ID: ${metadata.stepId}`);
  console.log(`[WORKFLOW-STEP-3] Attempt: ${metadata.attempt}`);

  try {
    const result = await compileAnimationWithModal(
      code,
      className,
      'low_quality'
    );

    if (result.success && result.video_bytes) {
      console.log('[WORKFLOW-STEP-3] ✅ Compilation successful');
      console.log(`[WORKFLOW-STEP-3] Video size: ${result.video_bytes.length} bytes`);
      console.log(`[WORKFLOW-STEP-3] Duration: ${result.duration?.toFixed(2)}s`);

      return {
        videoBytes: result.video_bytes,
        logs: result.logs,
        duration: result.duration
      };
    }

    // Compilation failed - check if retryable or fatal
    const errorMessage = result.error || 'Unknown compilation error';

    // Syntax errors, missing imports, etc. are fatal
    if (
      errorMessage.includes('SyntaxError') ||
      errorMessage.includes('ImportError') ||
      errorMessage.includes('NameError') ||
      errorMessage.includes('cannot import')
    ) {
      throw createCompilationError('Scene compilation', errorMessage);
    }

    // Other errors might be transient (Modal issues, timeouts)
    throw createWorkflowError(
      new Error(errorMessage),
      {
        operation: 'Scene compilation',
        attemptNumber: metadata.attempt,
        stepType: 'compilation',
        errorMessage
      }
    );

  } catch (error: any) {
    // If already a workflow error, re-throw
    if (error.constructor.name === 'FatalError' || error.constructor.name === 'RetryableError') {
      throw error;
    }

    console.error('[WORKFLOW-STEP-3] ❌ Compilation error:', error);

    throw createWorkflowError(error, {
      operation: 'Scene compilation',
      attemptNumber: metadata.attempt,
      stepType: 'compilation',
      errorMessage: error?.message
    });
  }
}

/**
 * Step 4: Upload Video to Blob Storage
 */
async function uploadVideoStep(
  videoBytes: Uint8Array,
  videoId: string
): Promise<{ videoUrl: string }> {
  'use step';

  const metadata = getStepMetadata();

  console.log('[WORKFLOW-STEP-4] Uploading video to Blob storage...');
  console.log(`[WORKFLOW-STEP-4] Video ID: ${videoId}`);
  console.log(`[WORKFLOW-STEP-4] Step ID: ${metadata.stepId}`);
  console.log(`[WORKFLOW-STEP-4] Attempt: ${metadata.attempt}`);

  try {
    const buffer = Buffer.from(videoBytes);

    // Use step ID for idempotency - prevents duplicate uploads on retry
    const idempotencyKey = generateIdempotencyKey(
      metadata.stepId,
      'blob-upload',
      videoId
    );

    console.log(`[WORKFLOW-STEP-4] Idempotency key: ${idempotencyKey}`);

    const blob = await put(`videos/${videoId}.mp4`, buffer, {
      access: 'public',
      contentType: 'video/mp4',
      addRandomSuffix: false // Use consistent naming
    });

    console.log('[WORKFLOW-STEP-4] ✅ Video uploaded successfully');
    console.log(`[WORKFLOW-STEP-4] URL: ${blob.url}`);

    return { videoUrl: blob.url };

  } catch (error: any) {
    console.error('[WORKFLOW-STEP-4] ❌ Upload error:', error);

    throw createWorkflowError(error, {
      operation: 'Video upload',
      attemptNumber: metadata.attempt,
      stepType: 'videoUpload',
      errorMessage: error?.message
    });
  }
}

/**
 * Step 5: Update Scene Status (if sceneId provided)
 */
async function updateSceneStatusStep(
  sceneId: string,
  videoUrl: string,
  videoId: string
): Promise<{ updated: true }> {
  'use step';

  console.log('[WORKFLOW-STEP-5] Updating scene status...');
  console.log(`[WORKFLOW-STEP-5] Scene ID: ${sceneId}`);

  // In a real implementation, this would update a database or state management
  // For now, we'll just log it as the scene manager uses localStorage on client

  console.log('[WORKFLOW-STEP-5] ✅ Status update recorded');

  return { updated: true };
}

/**
 * Main Video Generation Workflow
 */
export async function videoGenerationWorkflow(
  input: VideoGenerationInput
): Promise<VideoGenerationOutput> {
  'use workflow';

  const sceneId = input.sceneId || `scene-${Date.now()}`;
  const sceneName = input.sceneName || 'Generated Scene';
  const videoId = generateSimpleVideoId();

  console.log('[WORKFLOW] Starting video generation workflow');
  console.log(`[WORKFLOW] Scene ID: ${sceneId}`);
  console.log(`[WORKFLOW] Scene Name: ${sceneName}`);
  console.log(`[WORKFLOW] Video ID: ${videoId}`);

  const output: VideoGenerationOutput = {
    success: false,
    sceneId,
    sceneName,
    steps: {
      codeGeneration: 'failed',
      validation: 'skipped',
      compilation: 'skipped',
      upload: 'skipped'
    }
  };

  try {
    // Step 1: Generate code
    console.log('[WORKFLOW] === Step 1: Code Generation ===');
    const { code, className } = await generateSceneCodeStep(
      input.prompt,
      input.context
    );
    output.steps.codeGeneration = 'completed';
    output.code = code;

    // Step 2: Validate code
    console.log('[WORKFLOW] === Step 2: Code Validation ===');
    await validateCodeStep(code, input.className || className);
    output.steps.validation = 'completed';

    // Step 3: Compile scene
    console.log('[WORKFLOW] === Step 3: Scene Compilation ===');
    const { videoBytes, logs, duration } = await compileSceneStep(
      code,
      input.className || className
    );
    output.steps.compilation = 'completed';

    // Step 4: Upload video
    console.log('[WORKFLOW] === Step 4: Video Upload ===');
    const { videoUrl } = await uploadVideoStep(videoBytes, videoId);
    output.steps.upload = 'completed';
    output.videoUrl = videoUrl;
    output.videoId = videoId;

    // Step 5: Update status (if scene ID provided)
    if (input.sceneId) {
      console.log('[WORKFLOW] === Step 5: Status Update ===');
      await updateSceneStatusStep(sceneId, videoUrl, videoId);
    }

    output.success = true;

    console.log('[WORKFLOW] ✅ Workflow completed successfully');
    console.log(`[WORKFLOW] Video URL: ${videoUrl}`);

    return output;

  } catch (error: any) {
    console.error('[WORKFLOW] ❌ Workflow failed:', error);

    output.error = error.message || 'Unknown workflow error';

    // Determine which step failed based on current status
    if (output.steps.codeGeneration !== 'completed') {
      output.steps.codeGeneration = 'failed';
    } else if (output.steps.validation !== 'completed') {
      output.steps.validation = 'failed';
    } else if (output.steps.compilation !== 'completed') {
      output.steps.compilation = 'failed';
    } else if (output.steps.upload !== 'completed') {
      output.steps.upload = 'failed';
    }

    return output;
  }
}
