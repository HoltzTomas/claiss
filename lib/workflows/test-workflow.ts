/**
 * Test Script for Video Generation Workflows
 *
 * Run this to test the workflow implementation locally.
 * Usage: node --loader ts-node/esm test-workflow.ts
 */

import { videoGenerationWorkflow } from './video-generation.workflow';
import { multiSceneWorkflow } from './multi-scene.workflow';

/**
 * Test 1: Single Scene Workflow
 */
async function testSingleScene() {
  console.log('\n=== Test 1: Single Scene Workflow ===\n');

  try {
    const result = await videoGenerationWorkflow({
      prompt: 'Create a simple animation showing a circle transforming into a square',
      sceneName: 'Test Scene - Circle to Square',
      context: 'This is a test of the workflow system'
    });

    console.log('\n--- Result ---');
    console.log('Success:', result.success);
    console.log('Scene ID:', result.sceneId);
    console.log('Scene Name:', result.sceneName);
    console.log('Video URL:', result.videoUrl);
    console.log('Video ID:', result.videoId);
    console.log('Steps:', JSON.stringify(result.steps, null, 2));

    if (result.error) {
      console.error('Error:', result.error);
    }

    return result;

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

/**
 * Test 2: Multi-Scene Workflow
 */
async function testMultiScene() {
  console.log('\n=== Test 2: Multi-Scene Workflow ===\n');

  try {
    const result = await multiSceneWorkflow({
      title: 'Test Video - Basic Shapes',
      scenes: [
        {
          name: 'Introduction',
          prompt: 'Create an introduction scene with the text "Basic Shapes Tutorial"',
          order: 0
        },
        {
          name: 'Circle',
          prompt: 'Show a circle being drawn',
          order: 1
        },
        {
          name: 'Square',
          prompt: 'Show a square being drawn',
          order: 2
        }
      ],
      mergeOptions: {
        addTransitions: true,
        transitionDuration: 0.5
      }
    });

    console.log('\n--- Result ---');
    console.log('Success:', result.success);
    console.log('Video ID:', result.videoId);
    console.log('Title:', result.title);
    console.log('Final Video URL:', result.finalVideoUrl);
    console.log('Scenes:', result.scenes.length);
    console.log('Steps:', JSON.stringify(result.steps, null, 2));

    result.scenes.forEach((scene, index) => {
      console.log(`\nScene ${index + 1}:`, scene.name);
      console.log('  Status:', scene.status);
      console.log('  Video URL:', scene.videoUrl);
      if (scene.error) {
        console.log('  Error:', scene.error);
      }
    });

    if (result.error) {
      console.error('\nWorkflow Error:', result.error);
    }

    return result;

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

/**
 * Test 3: Error Handling
 */
async function testErrorHandling() {
  console.log('\n=== Test 3: Error Handling ===\n');

  try {
    // Test with invalid code (should trigger validation failure)
    const result = await videoGenerationWorkflow({
      prompt: 'Just return invalid Python code', // Intentionally vague to test error handling
      sceneName: 'Test Scene - Error Handling'
    });

    console.log('\n--- Result ---');
    console.log('Success:', result.success);
    console.log('Error:', result.error);
    console.log('Steps:', JSON.stringify(result.steps, null, 2));

    // We expect this to fail gracefully
    if (!result.success && result.error) {
      console.log('\n✅ Error handling works correctly');
    } else {
      console.warn('\n⚠️ Expected workflow to fail but it succeeded');
    }

    return result;

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║  Video Generation Workflow Test Suite         ║');
  console.log('╚════════════════════════════════════════════════╝');

  const testMode = process.env.TEST_MODE || 'single';

  try {
    switch (testMode) {
      case 'single':
        await testSingleScene();
        break;

      case 'multi':
        await testMultiScene();
        break;

      case 'errors':
        await testErrorHandling();
        break;

      case 'all':
        await testSingleScene();
        console.log('\n' + '─'.repeat(50) + '\n');
        await testMultiScene();
        console.log('\n' + '─'.repeat(50) + '\n');
        await testErrorHandling();
        break;

      default:
        console.error(`Unknown test mode: ${testMode}`);
        console.log('Available modes: single, multi, errors, all');
        process.exit(1);
    }

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║  ✅ All tests completed                        ║');
    console.log('╚════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║  ❌ Tests failed                               ║');
    console.log('╚════════════════════════════════════════════════╝\n');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

// Export for use in other test files
export {
  testSingleScene,
  testMultiScene,
  testErrorHandling,
  runTests
};
