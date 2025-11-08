import { google } from "@ai-sdk/google";
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import { sceneTools } from "@/lib/scene-code-tools";
import { sceneManager } from "@/lib/scene-manager";
import { getVideoGeneratorScenePrompt } from "@/lib/prompts/video-generator-scene";
import { createContext7Client } from "@/lib/mcp/context7-client";

export async function POST(req: Request) {
  const { messages, videoId, mode = 'scene' }: { messages: UIMessage[]; videoId?: string; mode?: 'scene' | 'monolithic' } = await req.json();
  const startTime = Date.now();

  console.log(`[VIDEO-GEN-SCENE] Starting request at ${new Date().toISOString()}`);
  console.log(`[VIDEO-GEN-SCENE] Mode: ${mode}, Video ID: ${videoId || 'new'}`);
  console.log(`[VIDEO-GEN-SCENE] Messages received:`, messages.length);

  const currentVideo = videoId ? sceneManager.getVideo(videoId) : null;
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mcpClient: any = null;

  try {
    console.log("[VIDEO-GEN-SCENE] Step 1: Initializing Context7 MCP client...");

    const { client, tools: context7Tools } = await createContext7Client();
    mcpClient = client;

    console.log("[VIDEO-GEN-SCENE] ✅ MCP client created successfully");
    console.log(
      `[VIDEO-GEN-SCENE] ✅ Retrieved ${Object.keys(context7Tools || {}).length} tools from Context7`,
    );

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
      system: getVideoGeneratorScenePrompt(currentVideo, videoStructure),
      messages: convertedMessages,
      tools,
      stopWhen: stepCountIs(10),
      onStepFinish: ({ toolCalls, finishReason }) => {
        console.log(`[VIDEO-GEN-SCENE] 📋 Step completed:`);
        console.log(`[VIDEO-GEN-SCENE]   - Reason: ${finishReason}`);
        console.log(`[VIDEO-GEN-SCENE]   - Tool calls: ${toolCalls?.length || 0}`);

        if (toolCalls && toolCalls.length > 0) {
          toolCalls.forEach((call, index) => {
            console.log(`[VIDEO-GEN-SCENE]   - Tool ${index + 1}: ${call.toolName}`);
          });
        }
      },
      onFinish: async ({ steps }) => {
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

    if (mcpClient) {
      await mcpClient.close();
    }

    throw error;
  }
}
