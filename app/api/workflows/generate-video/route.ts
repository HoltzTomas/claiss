/**
 * Workflow Trigger Endpoint
 *
 * API endpoint to start video generation workflows.
 * Returns a workflow run ID that can be used to check status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { start } from 'workflow/api';
import {
  videoGenerationWorkflow,
  type VideoGenerationInput
} from '@/lib/workflows/video-generation.workflow';
import {
  multiSceneWorkflow,
  type MultiSceneInput
} from '@/lib/workflows/multi-scene.workflow';

export const maxDuration = 300; // 5 minutes for endpoint (workflow can run longer)

/**
 * Request body for single scene
 */
interface SingleSceneRequest {
  mode: 'single';
  prompt: string;
  sceneName?: string;
  context?: string;
  sceneId?: string;
  className?: string;
}

/**
 * Request body for multi-scene
 */
interface MultiSceneRequest {
  mode: 'multi';
  title: string;
  videoId?: string;
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

type WorkflowRequest = SingleSceneRequest | MultiSceneRequest;

/**
 * Response format
 */
interface WorkflowStartResponse {
  success: boolean;
  runId?: string;
  mode: 'single' | 'multi';
  error?: string;
  message?: string;
}

/**
 * POST /api/workflows/generate-video
 *
 * Start a video generation workflow
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('[WORKFLOW-API] Received workflow trigger request');

    const body: WorkflowRequest = await request.json();

    // Validate request
    if (!body.mode) {
      return NextResponse.json<WorkflowStartResponse>(
        {
          success: false,
          mode: 'single',
          error: 'Mode is required (single or multi)'
        },
        { status: 400 }
      );
    }

    // Handle single scene workflow
    if (body.mode === 'single') {
      console.log('[WORKFLOW-API] Starting single scene workflow');
      console.log(`[WORKFLOW-API] Prompt: ${body.prompt.substring(0, 50)}...`);

      if (!body.prompt) {
        return NextResponse.json<WorkflowStartResponse>(
          {
            success: false,
            mode: 'single',
            error: 'Prompt is required for single scene mode'
          },
          { status: 400 }
        );
      }

      // Prepare workflow input
      const workflowInput: VideoGenerationInput = {
        prompt: body.prompt,
        sceneName: body.sceneName,
        context: body.context,
        sceneId: body.sceneId,
        className: body.className
      };

      try {
        // Start the workflow
        const run = await start(videoGenerationWorkflow, [workflowInput]);

        const duration = Date.now() - startTime;

        console.log('[WORKFLOW-API] ✅ Single scene workflow started');
        console.log(`[WORKFLOW-API] Run ID: ${run.id}`);
        console.log(`[WORKFLOW-API] Duration: ${duration}ms`);

        return NextResponse.json<WorkflowStartResponse>({
          success: true,
          runId: run.id,
          mode: 'single',
          message: 'Single scene workflow started successfully'
        });

      } catch (error: any) {
        console.error('[WORKFLOW-API] ❌ Failed to start single scene workflow:', error);

        return NextResponse.json<WorkflowStartResponse>(
          {
            success: false,
            mode: 'single',
            error: `Failed to start workflow: ${error.message || 'Unknown error'}`
          },
          { status: 500 }
        );
      }
    }

    // Handle multi-scene workflow
    if (body.mode === 'multi') {
      console.log('[WORKFLOW-API] Starting multi-scene workflow');
      console.log(`[WORKFLOW-API] Title: ${body.title}`);
      console.log(`[WORKFLOW-API] Scenes: ${body.scenes?.length || 0}`);

      if (!body.title) {
        return NextResponse.json<WorkflowStartResponse>(
          {
            success: false,
            mode: 'multi',
            error: 'Title is required for multi-scene mode'
          },
          { status: 400 }
        );
      }

      if (!body.scenes || body.scenes.length === 0) {
        return NextResponse.json<WorkflowStartResponse>(
          {
            success: false,
            mode: 'multi',
            error: 'At least one scene is required for multi-scene mode'
          },
          { status: 400 }
        );
      }

      // Validate scenes
      for (const scene of body.scenes) {
        if (!scene.name || !scene.prompt) {
          return NextResponse.json<WorkflowStartResponse>(
            {
              success: false,
              mode: 'multi',
              error: 'Each scene must have a name and prompt'
            },
            { status: 400 }
          );
        }
      }

      // Prepare workflow input
      const workflowInput: MultiSceneInput = {
        title: body.title,
        videoId: body.videoId,
        scenes: body.scenes,
        mergeOptions: body.mergeOptions
      };

      try {
        // Start the workflow
        const run = await start(multiSceneWorkflow, [workflowInput]);

        const duration = Date.now() - startTime;

        console.log('[WORKFLOW-API] ✅ Multi-scene workflow started');
        console.log(`[WORKFLOW-API] Run ID: ${run.id}`);
        console.log(`[WORKFLOW-API] Duration: ${duration}ms`);

        return NextResponse.json<WorkflowStartResponse>({
          success: true,
          runId: run.id,
          mode: 'multi',
          message: `Multi-scene workflow started for ${body.scenes.length} scenes`
        });

      } catch (error: any) {
        console.error('[WORKFLOW-API] ❌ Failed to start multi-scene workflow:', error);

        return NextResponse.json<WorkflowStartResponse>(
          {
            success: false,
            mode: 'multi',
            error: `Failed to start workflow: ${error.message || 'Unknown error'}`
          },
          { status: 500 }
        );
      }
    }

    // Unknown mode
    return NextResponse.json<WorkflowStartResponse>(
      {
        success: false,
        mode: body.mode as any,
        error: `Unknown mode: ${body.mode}. Use 'single' or 'multi'`
      },
      { status: 400 }
    );

  } catch (error: any) {
    const duration = Date.now() - startTime;

    console.error(`[WORKFLOW-API] ❌ API error after ${duration}ms:`, error);

    return NextResponse.json<WorkflowStartResponse>(
      {
        success: false,
        mode: 'single',
        error: `API error: ${error.message || 'Unknown error'}`
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/workflows/generate-video
 *
 * Get endpoint information
 */
export async function GET() {
  return NextResponse.json({
    name: 'Workflow Trigger API',
    description: 'Start video generation workflows',
    version: '1.0.0',
    endpoints: {
      POST: {
        description: 'Start a workflow',
        modes: {
          single: {
            description: 'Generate a single scene video',
            body: {
              mode: 'single',
              prompt: 'string (required)',
              sceneName: 'string (optional)',
              context: 'string (optional)',
              sceneId: 'string (optional)',
              className: 'string (optional)'
            },
            response: {
              success: 'boolean',
              runId: 'string',
              mode: 'single',
              message: 'string'
            }
          },
          multi: {
            description: 'Generate multi-scene video',
            body: {
              mode: 'multi',
              title: 'string (required)',
              videoId: 'string (optional)',
              scenes: [
                {
                  name: 'string (required)',
                  prompt: 'string (required)',
                  order: 'number (required)'
                }
              ],
              mergeOptions: {
                addTransitions: 'boolean (optional)',
                transitionDuration: 'number (optional)'
              }
            },
            response: {
              success: 'boolean',
              runId: 'string',
              mode: 'multi',
              message: 'string'
            }
          }
        }
      }
    },
    usage: {
      example: `
// Start single scene workflow
const response = await fetch('/api/workflows/generate-video', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mode: 'single',
    prompt: 'Create a video about the Pythagorean theorem',
    sceneName: 'Introduction to Pythagorean Theorem'
  })
});
const { runId } = await response.json();

// Check workflow status
const statusResponse = await fetch(\`/api/workflows/status?runId=\${runId}\`);
const status = await statusResponse.json();
      `.trim()
    },
    status: 'active'
  });
}
