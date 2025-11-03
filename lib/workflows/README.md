# Video Generation Workflows

This directory contains the Vercel Workflows implementation for durable, resilient video generation.

## Overview

The video generation pipeline has been refactored to use Vercel Workflows, providing:

- ✅ **Durability** - Workflows survive server restarts and timeouts
- ✅ **Automatic Retries** - Smart retry logic with exponential backoff
- ✅ **Step Isolation** - Each step is cached and only failed steps retry
- ✅ **Error Classification** - Distinguishes between fatal and retryable errors
- ✅ **Progress Tracking** - Real-time status of workflow execution
- ✅ **Idempotency** - External API calls use idempotency keys

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Single Scene Workflow                          │
├─────────────────────────────────────────────────┤
│  1. Generate Code (AI)         → RetryableError │
│  2. Validate Code               → FatalError     │
│  3. Compile Scene               → Smart Retry    │
│  4. Upload Video                → RetryableError │
│  5. Update Status               → RetryableError │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Multi-Scene Workflow                           │
├─────────────────────────────────────────────────┤
│  1. Generate All Scenes (Parallel)              │
│  2. Merge Videos                                 │
│  3. Upload Final Video                           │
└─────────────────────────────────────────────────┘
```

## Files

### Core Workflows

- **`video-generation.workflow.ts`** - Main single-scene workflow
  - Generates code via AI
  - Validates code structure
  - Compiles with Modal
  - Uploads to Blob storage
  - Updates scene status

- **`multi-scene.workflow.ts`** - Multi-scene orchestration
  - Generates multiple scenes in parallel
  - Merges compiled videos
  - Uploads final merged video

### Utilities

- **`workflow-config.ts`** - Configuration
  - Retry limits per step
  - Timeout values
  - Delay calculations
  - Idempotency key generation

- **`error-classification.ts`** - Error handling
  - Classifies errors as retryable or fatal
  - Creates appropriate workflow errors
  - Calculates retry delays

## API Endpoints

### Start Workflow

```typescript
POST /api/workflows/generate-video
```

**Single Scene:**
```json
{
  "mode": "single",
  "prompt": "Create a video about the Pythagorean theorem",
  "sceneName": "Introduction",
  "context": "Educational mathematics video"
}
```

**Multi-Scene:**
```json
{
  "mode": "multi",
  "title": "Complete Math Tutorial",
  "scenes": [
    {
      "name": "Introduction",
      "prompt": "Introduce the topic",
      "order": 0
    },
    {
      "name": "Main Content",
      "prompt": "Explain the concept",
      "order": 1
    }
  ],
  "mergeOptions": {
    "addTransitions": true,
    "transitionDuration": 0.5
  }
}
```

**Response:**
```json
{
  "success": true,
  "runId": "run_abc123xyz",
  "mode": "single",
  "message": "Workflow started successfully"
}
```

### Check Status

```typescript
GET /api/workflows/status?runId=<run-id>
```

**Response:**
```json
{
  "success": true,
  "runId": "run_abc123xyz",
  "status": "running",
  "progress": {
    "currentStep": "compilation",
    "completedSteps": 2,
    "totalSteps": 5,
    "percentage": 40
  }
}
```

**Completed Response:**
```json
{
  "success": true,
  "runId": "run_abc123xyz",
  "status": "completed",
  "result": {
    "success": true,
    "sceneId": "scene-123",
    "sceneName": "Introduction",
    "videoUrl": "https://blob.vercel-storage.com/videos/abc.mp4",
    "videoId": "video_abc123",
    "steps": {
      "codeGeneration": "completed",
      "validation": "completed",
      "compilation": "completed",
      "upload": "completed"
    }
  }
}
```

## Usage Examples

### Frontend Implementation

```typescript
// Start workflow
async function generateVideo(prompt: string) {
  // 1. Start the workflow
  const response = await fetch('/api/workflows/generate-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'single',
      prompt,
      sceneName: 'Generated Scene'
    })
  });

  const { runId } = await response.json();

  // 2. Poll for status
  let status = 'running';
  let result = null;

  while (status === 'running') {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s

    const statusResponse = await fetch(
      `/api/workflows/status?runId=${runId}`
    );
    const statusData = await statusResponse.json();

    status = statusData.status;
    result = statusData.result;

    // Show progress to user
    if (statusData.progress) {
      console.log(`Progress: ${statusData.progress.percentage}%`);
      console.log(`Current step: ${statusData.progress.currentStep}`);
    }
  }

  if (status === 'completed' && result.success) {
    console.log('Video ready:', result.videoUrl);
    return result;
  } else {
    console.error('Workflow failed:', result.error);
    throw new Error(result.error);
  }
}
```

### React Hook Example

```typescript
import { useState, useEffect } from 'react';

function useWorkflow(runId: string | null) {
  const [status, setStatus] = useState<string>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runId) return;

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/workflows/status?runId=${runId}`);
        const data = await response.json();

        setStatus(data.status);
        setProgress(data.progress?.percentage || 0);

        if (data.status === 'completed') {
          setResult(data.result);
        } else if (data.status === 'failed') {
          setError(data.error);
        }
      } catch (err) {
        setError('Failed to check workflow status');
      }
    };

    // Poll every 2 seconds while running
    const interval = setInterval(pollStatus, 2000);
    pollStatus(); // Initial poll

    return () => clearInterval(interval);
  }, [runId]);

  return { status, progress, result, error };
}

// Usage in component
function VideoGenerator() {
  const [runId, setRunId] = useState<string | null>(null);
  const { status, progress, result, error } = useWorkflow(runId);

  const startGeneration = async (prompt: string) => {
    const response = await fetch('/api/workflows/generate-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'single',
        prompt
      })
    });

    const { runId } = await response.json();
    setRunId(runId);
  };

  return (
    <div>
      {status === 'running' && (
        <div>
          <ProgressBar value={progress} />
          <p>Generating video... {progress}%</p>
        </div>
      )}

      {status === 'completed' && result && (
        <video src={result.videoUrl} controls />
      )}

      {error && <p>Error: {error}</p>}
    </div>
  );
}
```

## Error Handling

### Error Types

1. **FatalError** - Don't retry (code errors, validation failures)
   - Missing imports
   - Syntax errors
   - Invalid prompts
   - 4xx HTTP errors

2. **RetryableError** - Automatic retry (transient issues)
   - Network failures
   - 5xx HTTP errors
   - Timeouts
   - Rate limiting
   - Provider errors

### Retry Strategies

Each step type has custom retry configuration:

```typescript
{
  aiGeneration: {
    maxRetries: 3,
    retryDelays: {
      providerError: '30s',
      timeout: '60s',
      rateLimit: '10s'
    }
  },
  compilation: {
    maxRetries: 5,
    retryDelays: {
      modalServerError: '30s',
      modalTimeout: '60s'
    }
  },
  videoUpload: {
    maxRetries: 5,
    retryDelays: {
      networkError: '10s',
      blobServiceError: '20s'
    }
  }
}
```

### Exponential Backoff

Retry delays increase exponentially:
- Attempt 1: 30s
- Attempt 2: 60s
- Attempt 3: 120s
- Attempt 4: 240s
- Attempt 5: 300s (max)

## Monitoring & Debugging

### Logging

All workflow steps include detailed logging:

```
[WORKFLOW] Starting video generation workflow
[WORKFLOW] Scene ID: scene-123
[WORKFLOW] === Step 1: Code Generation ===
[WORKFLOW-STEP-1] Generating scene code with AI...
[WORKFLOW-STEP-1] Step ID: step-abc
[WORKFLOW-STEP-1] Attempt: 1
[WORKFLOW-STEP-1] ✅ Code generated successfully
...
[WORKFLOW] ✅ Workflow completed successfully
```

### Error Logs

```
[WORKFLOW-ERROR] Scene compilation: Modal API error
{
  errorType: 'server_error',
  isRetryable: true,
  attemptNumber: 2,
  message: 'HTTP 503: Service Unavailable'
}
[WORKFLOW-ERROR] Retry scheduled after 60s
```

### Checking Workflow State

```typescript
import { getRun } from 'workflow/api';

const run = getRun(runId);
const status = await run.status; // 'running' | 'completed' | 'failed'
const result = await run.result; // Only if completed
```

## Testing

### Manual Testing

1. Start a workflow:
```bash
curl -X POST http://localhost:3000/api/workflows/generate-video \
  -H "Content-Type: application/json" \
  -d '{"mode":"single","prompt":"Test video","sceneName":"Test"}'
```

2. Check status:
```bash
curl http://localhost:3000/api/workflows/status?runId=<run-id>
```

### Simulating Failures

To test retry logic, you can simulate failures by modifying the Modal client or using environment variables to inject errors.

## Migration Guide

### Before (Direct Compilation)

```typescript
// Old approach - blocking, no retries
const result = await compileManimCode(code, className);
if (!result.success) {
  // User must manually retry
  throw new Error(result.error);
}
```

### After (Workflow)

```typescript
// New approach - non-blocking, automatic retries
const run = await start(videoGenerationWorkflow, [{
  prompt: userPrompt,
  sceneName: 'My Scene'
}]);

// Return immediately with run ID
return { runId: run.id };

// Later, check status
const run = getRun(runId);
const status = await run.status;
if (status === 'completed') {
  const result = await run.result;
  // Video is ready!
}
```

## Configuration

### Environment Variables

```bash
# Modal compilation (default: true)
USE_MODAL_COMPILATION=true

# Fallback to local if Modal fails (default: true)
MODAL_FALLBACK_TO_LOCAL=true

# Context7 API key for AI generation
CONTEXT7=your_api_key_here

# Blob storage (Vercel)
BLOB_READ_WRITE_TOKEN=your_token_here
```

### Workflow Settings

Edit `lib/workflows/workflow-config.ts` to adjust:
- Retry limits
- Timeout values
- Retry delays
- Execution policies

## Benefits Over Previous System

| Feature | Before | After |
|---------|--------|-------|
| **Durability** | Lost on restart | Survives restarts |
| **Retries** | Manual | Automatic with backoff |
| **Timeouts** | 2-5 minutes max | Unlimited |
| **Progress** | No visibility | Real-time status |
| **Error Handling** | Generic try/catch | Smart classification |
| **Idempotency** | None | Built-in |
| **State** | Lost on failure | Persisted |

## Troubleshooting

### Workflow Stuck in "Running"

1. Check logs for the last completed step
2. Verify external services (Modal, Blob) are accessible
3. Check if step is waiting for retry delay

### "Workflow run not found"

- Run ID may be incorrect
- Workflow may have been cleaned up (check retention policy)
- Verify you're querying the correct environment

### Compilation Failures

1. Check if error is FatalError (code issue) or RetryableError
2. Review the generated code in workflow result
3. Check Modal API status
4. Verify Manim code syntax

## Future Enhancements

- [ ] Webhook notifications on completion
- [ ] Workflow cancellation endpoint
- [ ] Workflow history/replay
- [ ] Batch workflow operations
- [ ] Custom retry strategies per workflow
- [ ] Workflow metrics and analytics

## Resources

- [Vercel Workflows Documentation](https://vercel.com/docs/workflow)
- [Workflow SDK Reference](https://vercel.com/docs/workflow/sdk)
- [Error Handling Best Practices](https://vercel.com/docs/workflow/errors)
