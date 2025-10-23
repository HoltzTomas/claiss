import { google } from "@ai-sdk/google";
import {
  streamText,
  convertToModelMessages,
  experimental_createMCPClient,
  stepCountIs,
  type UIMessage,
} from "ai";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { sceneTools } from "@/lib/scene-code-tools";
import { sceneManager } from "@/lib/scene-manager";

export async function POST(req: Request) {
  const { messages, videoId, mode = 'scene' }: { messages: UIMessage[]; videoId?: string; mode?: 'scene' | 'monolithic' } = await req.json();
  const startTime = Date.now();

  console.log(`[VIDEO-GEN-SCENE] Starting request at ${new Date().toISOString()}`);
  console.log(`[VIDEO-GEN-SCENE] Mode: ${mode}, Video ID: ${videoId || 'new'}`);
  console.log(`[VIDEO-GEN-SCENE] Messages received:`, messages.length);

  // Get current video context if videoId provided
  let currentVideo = videoId ? sceneManager.getVideo(videoId) : null;
  let videoStructure = "";

  if (currentVideo) {
    console.log(`[VIDEO-GEN-SCENE] Found existing video: ${currentVideo.title}`);
    console.log(`[VIDEO-GEN-SCENE] Scenes: ${currentVideo.scenes.length}`);

    videoStructure = JSON.stringify({
      videoId: currentVideo.id,
      title: currentVideo.title,
      scenes: currentVideo.scenes.map(s => ({
        id: s.id,
        name: s.name,
        order: s.order,
        status: s.status,
        duration: s.duration
      }))
    });
  }

  let mcpClient: any = null;

  try {
    console.log("[VIDEO-GEN-SCENE] Step 1: Initializing Context7 MCP client...");

    // Create Context7 MCP client connection
    const transport = new StreamableHTTPClientTransport(
      new URL("https://mcp.context7.com/mcp"),
      {
        requestInit: {
          headers: {
            CONTEXT7_API_KEY: process.env.CONTEXT7 || "",
          },
        },
      },
    );

    mcpClient = await experimental_createMCPClient({ transport });
    console.log("[VIDEO-GEN-SCENE] ✅ MCP client created successfully");

    // Get tools from Context7 MCP server
    console.log("[VIDEO-GEN-SCENE] Step 2: Fetching tools from Context7...");
    const context7Tools = await mcpClient.tools();
    console.log(
      `[VIDEO-GEN-SCENE] ✅ Retrieved ${Object.keys(context7Tools || {}).length} tools from Context7`,
    );

    // Combine Context7 tools with scene-based tools
    const tools = {
      ...context7Tools,
      ...sceneTools,
    };
    console.log(`[VIDEO-GEN-SCENE] ✅ Total tools available: ${Object.keys(tools).length}`);

    console.log("[VIDEO-GEN-SCENE] Step 3: Starting AI text streaming...");

    const convertedMessages = convertToModelMessages(messages);
    console.log("[VIDEO-GEN-SCENE] ✅ Messages converted successfully");

    const result = streamText({
      model: google("gemini-2.5-pro"),
      system: `You are Claiss AI, an educational Python code generator specialized in creating Manim animations using a SCENE-BASED ARCHITECTURE.

CRITICAL: You are now working with INDIVIDUAL SCENES, not monolithic code. This enables:
- Faster edits (only recompile modified scenes)
- Better scalability (handle 10+ minute videos)
- Reduced context (only read relevant scenes)
- Parallel compilation (scenes compile simultaneously)

AVAILABLE SCENE TOOLS:
1. analyzeTargets - ALWAYS USE FIRST to identify which scenes to modify
2. readScenes - Read scene information (overview or detailed code)
3. writeScene - Create or update individual scene code
4. sceneOperation - Delete, reorder, or split scenes

${currentVideo ? `
CURRENT VIDEO CONTEXT:
${videoStructure}

You are editing an EXISTING video with ${currentVideo.scenes.length} scene(s). Use analyzeTargets to determine which scenes need modification.
` : `
NEW VIDEO: You are creating a new video from scratch. You will generate multiple scenes organized logically.
`}

WORKFLOW FOR SCENE-BASED EDITING:

Step 1: ANALYZE THE REQUEST
   - Call analyzeTargets(userRequest, videoStructure)
   - Determine: Which scenes to modify? Create new? Delete? Reorder?

Step 2: READ RELEVANT SCENES (only if modifying)
   - Call readScenes(sceneIds: [identified scenes], includeCode: true)
   - Get ONLY the scenes that need editing (not entire video!)

Step 3: PERFORM SCENE OPERATIONS
   For modifications:
   - Call writeScene(sceneId, sceneName, code, description)
   - This compiles ONLY that scene (10-30s instead of 2-5min)

   For new scenes:
   - Call writeScene(sceneName, code, position, description)
   - Scene is added and compiled independently

   For deletions/reordering:
   - Call sceneOperation(operation, sceneId, ...)

Step 4: EXPLAIN RESULTS
   - Summarize what was done
   - Mention which scenes were affected
   - Note compilation status

SCENE CODE REQUIREMENTS:
- Each scene must be a STANDALONE Manim class
- Include full imports: from manim import *
- Use proper class structure: class SceneName(Scene)
- Scene code should be self-contained
- Use next_section() within scenes for sub-sections if needed

SCENE ORGANIZATION BEST PRACTICES:
- Introduction scene (title, overview) - 10-20s
- Concept explanation scenes - 30-90s each
- Example/demo scenes - 60-120s each
- Conclusion scene (summary) - 10-30s
- Aim for 3-8 scenes for a complete video

EXAMPLES:

Example 1: NEW VIDEO
User: "Create a tutorial on bubble sort"
Assistant:
1. I'll create a tutorial on bubble sort with 4 organized scenes.
2. [Calls writeScene 4 times for: Introduction, Algorithm, Demo, Conclusion]
3. Each scene compiles independently and in parallel!

Example 2: EDITING EXISTING VIDEO
User: "Make the circles in the demo larger"
Assistant:
1. [Calls analyzeTargets] → Identifies "Demo" scene
2. [Calls readScenes for Demo scene only] → Gets Demo code
3. [Calls writeScene with modified Demo code] → Only Demo recompiles (30s)
4. Other scenes use cached videos → Total time: ~32s instead of 5min!

Example 3: ADDING NEW SCENE
User: "Add a complexity analysis scene at the end"
Assistant:
1. [Calls analyzeTargets] → Recommends "create" operation
2. [Calls writeScene with position at end] → New scene compiles
3. Existing scenes unaffected → Total time: ~27s

Example 4: RESTRUCTURING
User: "Move the conclusion before the complexity analysis"
Assistant:
1. [Calls sceneOperation(operation: 'reorder', sceneId, newPosition)]
2. No recompilation needed → Total time: ~2s

IMPORTANT REMINDERS:
- ALWAYS start with analyzeTargets for edit requests
- Only read/modify the scenes that need changes
- Each scene compiles independently (fast!)
- Use Context7 for Manim documentation when needed
- Provide clear explanations in text (no code in responses)
- The tools handle compilation automatically

Your goal: Enable users to create professional 10+ minute educational videos with fast iteration times through intelligent scene management.`,
      messages: convertedMessages,
      tools,
      stopWhen: stepCountIs(10), // Allow more steps for scene operations
      onStepFinish: ({ text, toolCalls, toolResults, finishReason, usage }) => {
        console.log(`[VIDEO-GEN-SCENE] 📋 Step completed:`);
        console.log(`[VIDEO-GEN-SCENE]   - Reason: ${finishReason}`);
        console.log(`[VIDEO-GEN-SCENE]   - Tool calls: ${toolCalls?.length || 0}`);

        if (toolCalls && toolCalls.length > 0) {
          toolCalls.forEach((call, index) => {
            console.log(`[VIDEO-GEN-SCENE]   - Tool ${index + 1}: ${call.toolName}`);
          });
        }
      },
      onFinish: async ({ text, usage, finishReason, steps }) => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`[VIDEO-GEN-SCENE] 🎉 Stream completed successfully!`);
        console.log(`[VIDEO-GEN-SCENE]   - Total duration: ${duration}ms`);
        console.log(`[VIDEO-GEN-SCENE]   - Total steps: ${steps?.length || 0}`);

        if (mcpClient) {
          await mcpClient.close();
          console.log("[VIDEO-GEN-SCENE] ✅ MCP client closed");
        }
      },
      onError: async ({ error }) => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        console.error(`[VIDEO-GEN-SCENE] ❌ Streaming error after ${duration}ms:`, error);

        if (mcpClient) {
          await mcpClient.close();
          console.log("[VIDEO-GEN-SCENE] ✅ MCP client closed after error");
        }
      },
    });

    console.log("[VIDEO-GEN-SCENE] Step 4: Converting to UI message stream...");
    return result.toUIMessageStreamResponse();

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.error(`[VIDEO-GEN-SCENE] ❌ Error after ${duration}ms:`, error);

    // Cleanup MCP client on error
    if (mcpClient) {
      await mcpClient.close();
    }

    throw error;
  }
}
