/**
 * Workflow Status Endpoint
 *
 * API endpoint to check the status of running or completed workflows.
 * Polls workflow execution state and returns current progress.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRun } from 'workflow/api';

export const maxDuration = 60; // 1 minute

/**
 * Workflow status response
 */
interface WorkflowStatusResponse {
  success: boolean;
  runId: string;
  status: 'running' | 'completed' | 'failed' | 'unknown';
  result?: any;
  error?: string;
  progress?: {
    currentStep?: string;
    completedSteps?: number;
    totalSteps?: number;
    percentage?: number;
  };
}

/**
 * GET /api/workflows/status?runId=<id>
 *
 * Check the status of a workflow
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const runId = url.searchParams.get('runId');

    if (!runId) {
      return NextResponse.json<WorkflowStatusResponse>(
        {
          success: false,
          runId: '',
          status: 'unknown',
          error: 'runId query parameter is required'
        },
        { status: 400 }
      );
    }

    console.log('[WORKFLOW-STATUS] Checking status for run:', runId);

    try {
      // Get the workflow run
      const run = getRun(runId);

      // Get the current status
      const status = await run.status;

      console.log(`[WORKFLOW-STATUS] Run ${runId} status: ${status}`);

      // Try to get the result if completed
      let result: any = null;
      let error: string | undefined = undefined;

      if (status === 'completed') {
        try {
          result = await run.result;
          console.log('[WORKFLOW-STATUS] ✅ Workflow completed successfully');
        } catch (resultError: any) {
          console.error('[WORKFLOW-STATUS] Error getting result:', resultError);
          error = 'Failed to retrieve workflow result';
        }
      } else if (status === 'failed') {
        try {
          // Try to get error information from result
          const failedResult = await run.result;
          error = failedResult?.error || 'Workflow failed';
          console.error('[WORKFLOW-STATUS] ❌ Workflow failed:', error);
        } catch (resultError: any) {
          error = 'Workflow failed - error details unavailable';
          console.error('[WORKFLOW-STATUS] ❌ Workflow failed, cannot get error:', resultError);
        }
      }

      // Calculate progress (basic estimation)
      let progress: WorkflowStatusResponse['progress'] | undefined;

      if (result && result.steps) {
        // For workflows that return step information
        const steps = result.steps;
        const stepKeys = Object.keys(steps);
        const totalSteps = stepKeys.length;
        const completedSteps = stepKeys.filter(
          key => steps[key] === 'completed'
        ).length;

        progress = {
          completedSteps,
          totalSteps,
          percentage: Math.floor((completedSteps / totalSteps) * 100)
        };

        // Find current step
        const currentStepKey = stepKeys.find(
          key => steps[key] !== 'completed' && steps[key] !== 'skipped'
        );
        if (currentStepKey) {
          progress.currentStep = currentStepKey;
        }
      } else if (status === 'running') {
        // Running but no step info - provide generic progress
        progress = {
          currentStep: 'processing',
          percentage: 50 // Indeterminate
        };
      }

      return NextResponse.json<WorkflowStatusResponse>({
        success: true,
        runId,
        status: status as any,
        result,
        error,
        progress
      });

    } catch (runError: any) {
      console.error('[WORKFLOW-STATUS] ❌ Error getting workflow run:', runError);

      return NextResponse.json<WorkflowStatusResponse>(
        {
          success: false,
          runId,
          status: 'unknown',
          error: `Workflow run not found or error accessing run: ${runError.message || 'Unknown error'}`
        },
        { status: 404 }
      );
    }

  } catch (error: any) {
    console.error('[WORKFLOW-STATUS] ❌ API error:', error);

    return NextResponse.json<WorkflowStatusResponse>(
      {
        success: false,
        runId: '',
        status: 'unknown',
        error: `API error: ${error.message || 'Unknown error'}`
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workflows/status
 *
 * Bulk status check for multiple workflows
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const runIds: string[] = body.runIds || [];

    if (!Array.isArray(runIds) || runIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'runIds array is required'
        },
        { status: 400 }
      );
    }

    console.log(`[WORKFLOW-STATUS] Bulk status check for ${runIds.length} runs`);

    // Check all runs in parallel
    const statusPromises = runIds.map(async (runId) => {
      try {
        const run = getRun(runId);
        const status = await run.status;

        let result: any = null;
        let error: string | undefined = undefined;

        if (status === 'completed') {
          try {
            result = await run.result;
          } catch (e) {
            error = 'Failed to retrieve result';
          }
        } else if (status === 'failed') {
          try {
            const failedResult = await run.result;
            error = failedResult?.error || 'Workflow failed';
          } catch (e) {
            error = 'Workflow failed';
          }
        }

        return {
          success: true,
          runId,
          status,
          result,
          error
        };

      } catch (error: any) {
        return {
          success: false,
          runId,
          status: 'unknown',
          error: error.message || 'Unknown error'
        };
      }
    });

    const statuses = await Promise.all(statusPromises);

    console.log('[WORKFLOW-STATUS] ✅ Bulk status check complete');

    return NextResponse.json({
      success: true,
      statuses
    });

  } catch (error: any) {
    console.error('[WORKFLOW-STATUS] ❌ Bulk status API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: `API error: ${error.message || 'Unknown error'}`
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/workflows/status (no runId)
 *
 * Get endpoint information
 */
export async function HEAD() {
  return NextResponse.json({
    name: 'Workflow Status API',
    description: 'Check the status of running or completed workflows',
    version: '1.0.0',
    endpoints: {
      GET: {
        description: 'Check single workflow status',
        parameters: {
          runId: 'string (required) - Workflow run ID'
        },
        response: {
          success: 'boolean',
          runId: 'string',
          status: '"running" | "completed" | "failed" | "unknown"',
          result: 'any (if completed)',
          error: 'string (if failed)',
          progress: {
            currentStep: 'string (optional)',
            completedSteps: 'number (optional)',
            totalSteps: 'number (optional)',
            percentage: 'number (optional)'
          }
        }
      },
      POST: {
        description: 'Bulk status check for multiple workflows',
        body: {
          runIds: 'string[] (required)'
        },
        response: {
          success: 'boolean',
          statuses: 'array of status objects'
        }
      }
    },
    usage: {
      single: `
const response = await fetch('/api/workflows/status?runId=<run-id>');
const status = await response.json();

if (status.status === 'completed') {
  console.log('Result:', status.result);
} else if (status.status === 'running') {
  console.log('Progress:', status.progress);
} else if (status.status === 'failed') {
  console.error('Error:', status.error);
}
      `.trim(),
      bulk: `
const response = await fetch('/api/workflows/status', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    runIds: ['run-id-1', 'run-id-2', 'run-id-3']
  })
});
const { statuses } = await response.json();
      `.trim()
    },
    status: 'active'
  });
}
