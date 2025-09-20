import { anthropic } from "@ai-sdk/anthropic";
import {
  streamText,
  convertToModelMessages,
  experimental_createMCPClient,
  stepCountIs,
  type UIMessage,
  tool,
} from "ai";
import { z } from "zod";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { writeCodeTool, readCodeTool } from "@/lib/code-tools";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const startTime = Date.now();

  console.log(
    `[VIDEO-GENERATOR] Starting request at ${new Date().toISOString()}`,
  );
  console.log(`[VIDEO-GENERATOR] Messages received:`, messages.length);
  console.log(
    `[VIDEO-GENERATOR] Messages structure:`,
    JSON.stringify(messages, null, 2),
  );

  // Extract code context from the latest user message if available
  let codeContext: string | undefined;
  const latestMessage = messages[messages.length - 1];
  if (latestMessage?.role === "user" && (latestMessage as any).codeContext) {
    codeContext = (latestMessage as any).codeContext;
    console.log(
      `[VIDEO-GENERATOR] Code context found: ${codeContext?.length || 0} characters`,
    );
  }

  let mcpClient: any = null;

  try {
    console.log(
      "[VIDEO-GENERATOR] Step 1: Initializing Context7 MCP client...",
    );

    // Create Context7 MCP client connection using HTTP transport
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
    console.log("[VIDEO-GENERATOR] ✅ MCP client created successfully");

    // Get tools from Context7 MCP server
    console.log("[VIDEO-GENERATOR] Step 2: Fetching tools from Context7...");
    const context7Tools = await mcpClient.tools();
    console.log(
      `[VIDEO-GENERATOR] ✅ Retrieved ${Object.keys(context7Tools || {}).length} tools from Context7`,
    );

    // Create a context-aware readCode tool if code context is provided
    const contextAwareReadCodeTool = codeContext
      ? tool({
          description:
            "Read the current Python code provided by the frontend. Use this before making modifications to existing code.",
          inputSchema: z.object({}),
          execute: async (input, options) => {
            return (
              readCodeTool.execute?.({ code: codeContext || "" }, options) || {
                success: false,
                hasCode: false,
                error: "readCodeTool not available",
              }
            );
          },
        })
      : readCodeTool;

    // Combine Context7 tools with our code management tools
    const tools = {
      ...context7Tools,
      writeCode: writeCodeTool,
      readCode: contextAwareReadCodeTool,
    };
    console.log(
      `[VIDEO-GENERATOR] ✅ Total tools available: ${Object.keys(tools).length}`,
    );

    console.log("[VIDEO-GENERATOR] Step 3: Starting AI text streaming...");

    // Convert UIMessage[] to ModelMessage[] with error handling
    let convertedMessages;
    try {
      convertedMessages = convertToModelMessages(messages);
      console.log("[VIDEO-GENERATOR] ✅ Messages converted successfully");
    } catch (conversionError) {
      console.error(
        "[VIDEO-GENERATOR] ❌ Message conversion failed:",
        conversionError,
      );
      throw new Error(
        `Failed to convert messages: ${conversionError instanceof Error ? conversionError.message : "Unknown error"}`,
      );
    }

    const result = streamText({
      model: anthropic("claude-3-5-sonnet-20241022"),
      // toolCallStreaming is enabled by default in AI SDK v5
      system: `You are Claiss AI, an educational Python code generator specialized in creating Manim animations for learning.

IMPORTANT: You have access to code management tools. NEVER include Python code in your text responses. Always use the writeCode tool for code.

WORKFLOW FOR ANY EDUCATIONAL REQUEST:
1. If this is a modification request, FIRST use readCode tool with any provided code context from frontend
2. Extract the main topic from the user's question (e.g., "bubble sort", "physics simulation", "calculus", "data structures")
3. ALWAYS use Context7 tools to search the /manimcommunity/manim library with the pattern: "{extracted_topic} examples animations"
4. Generate clean, working Python code using Manim for educational animations
5. Use writeCode tool to save the code (this will automatically compile the video)
6. Provide brief explanation in text response WITHOUT including any code content

IMPORTANT: When frontend provides code context (for modification requests), always call readCode tool first with that context before making any changes.

CRITICAL CODE FORMAT REQUIREMENTS:
- Use proper Manim class structure: class [Topic]Animation(Scene)
- Include necessary imports: from manim import *
- Ensure code is complete and executable
- Use modern Manim syntax and avoid deprecated animations:
  * Use Create() instead of GrowArrow() for arrow animations
  * Use Create() for all drawing animations
  * Avoid deprecated methods like .set_fill() with positional arguments
- Add brief comments only for complex parts
- Make class names descriptive (e.g., BubbleSortAnimation, LinearRegressionAnimation)

CONTENT MANAGEMENT REQUIREMENTS (CRITICAL TO PREVENT OVERLAPPING):
- Use self.next_section("Section Name") to divide content into logical parts
- Always use FadeOut() to remove objects before introducing new major content
- Use self.clear() when transitioning between completely different concepts
- Structure animations: Introduce → Explain → Remove → Next Topic
- Example structure:
  * Section 1: Introduction (show title, fade out)
  * Section 2: Main concept (show, animate, fade out key elements)
  * Section 3: Examples (clear previous, show examples)
  * Section 4: Conclusion (summarize, fade out)

SCENE ORGANIZATION TEMPLATE (FOLLOW THIS STRUCTURE):
\`\`\`python
class ExampleAnimation(Scene):
    def construct(self):
        # Section 1: Introduction
        self.next_section("Introduction")
        title = Text("Topic Title")
        self.play(FadeIn(title))
        self.wait(1)
        self.play(FadeOut(title))  # Remove before next section

        # Section 2: Main Content
        self.next_section("Main Content")
        main_obj = Circle()  # Clean slate, no overlap
        self.play(Create(main_obj))
        # ... animations ...
        self.play(FadeOut(main_obj))  # Clean up

        # Section 3: Additional Content
        self.next_section("Conclusion")
        conclusion = Text("Summary")
        self.play(FadeIn(conclusion))
        self.wait(2)
\`\`\`

CONTEXT AWARENESS FOR MODIFICATIONS:
- When user asks to "change the color", "add something", or "modify" existing content, ALWAYS use readCode first
- Understand the existing code structure before making changes
- Preserve good parts of existing code while making requested modifications
- Maintain the same class name and overall structure unless specifically asked to change
- Keep the section-based organization from the template

RESPONSE FORMAT:
1. Use readCode tool if this is a modification (not for brand new requests)
2. Use Context7 tools to get relevant documentation/examples
3. Use writeCode tool with complete Python code following the scene template
4. Provide brief explanation (1-2 sentences) in text - NO CODE CONTENT IN TEXT
5. The writeCode tool will automatically handle video compilation

EXAMPLES OF TOPIC EXTRACTION:
- "Explain how bubble sort works" → Search: "bubble sort examples animations"
- "Show me linear regression" → Search: "linear regression examples animations"
- "Change the circle to red" → First readCode, then modify existing code
- "Add a title to the animation" → First readCode, then enhance existing code

ALWAYS use Context7 to get the most up-to-date Manim documentation and examples before generating code.
ALWAYS follow the scene organization template for proper content management.
NEVER include Python code in your text responses - only use the writeCode tool for code.`,
      messages: convertedMessages,
      tools, // Context7 tools + writeCode + readCode
      stopWhen: stepCountIs(5), // Enable multi-step tool usage
      onStepFinish: ({ text, toolCalls, toolResults, finishReason, usage }) => {
        console.log(`[VIDEO-GENERATOR] 📋 Step completed:`);
        console.log(`[VIDEO-GENERATOR]   - Reason: ${finishReason}`);
        console.log(
          `[VIDEO-GENERATOR]   - Text length: ${text?.length || 0} chars`,
        );
        console.log(
          `[VIDEO-GENERATOR]   - Tool calls: ${toolCalls?.length || 0}`,
        );
        console.log(
          `[VIDEO-GENERATOR]   - Tool results: ${toolResults?.length || 0}`,
        );
        if (usage) {
          console.log(
            `[VIDEO-GENERATOR]   - Token usage: ${usage.totalTokens} total`,
          );
        }

        // Log tool calls for debugging
        if (toolCalls && toolCalls.length > 0) {
          toolCalls.forEach((call, index) => {
            console.log(
              `[VIDEO-GENERATOR]   - Tool ${index + 1}: ${call.toolName} with args:`,
              call.input,
            );
          });
        }
      },
      onFinish: async ({ text, usage, finishReason, steps }) => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`[VIDEO-GENERATOR] 🎉 Stream completed successfully!`);
        console.log(`[VIDEO-GENERATOR]   - Total duration: ${duration}ms`);
        console.log(`[VIDEO-GENERATOR]   - Final reason: ${finishReason}`);
        console.log(`[VIDEO-GENERATOR]   - Total steps: ${steps?.length || 0}`);
        console.log(
          `[VIDEO-GENERATOR]   - Final text length: ${text?.length || 0} chars`,
        );
        if (usage) {
          console.log(
            `[VIDEO-GENERATOR]   - Total token usage: ${usage.totalTokens}`,
          );
        }

        console.log(
          "[VIDEO-GENERATOR] ℹ️  Code generation handled by writeCode tool",
        );

        // Cleanup MCP client when streaming finishes
        if (mcpClient) {
          await mcpClient.close();
          console.log("[VIDEO-GENERATOR] ✅ MCP client closed");
        }
      },
      onError: async ({ error }) => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        console.error(
          `[VIDEO-GENERATOR] ❌ Streaming error after ${duration}ms:`,
          error,
        );
        if (error instanceof Error) {
          console.error(`[VIDEO-GENERATOR] Error details:`, {
            message: error.message,
            stack: error.stack,
            name: error.name,
          });
        }

        // Cleanup MCP client on error
        if (mcpClient) {
          await mcpClient.close();
          console.log("[VIDEO-GENERATOR] ✅ MCP client closed after error");
        }
      },
    });

    console.log("[VIDEO-GENERATOR] Step 4: Converting to UI message stream...");
    return result.toUIMessageStreamResponse();
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.error(
      `[VIDEO-GENERATOR] ❌ Context7 MCP Client error after ${duration}ms:`,
      error,
    );
    if (error instanceof Error) {
      console.error(`[VIDEO-GENERATOR] Error details:`, {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    }

    console.log(
      "[VIDEO-GENERATOR] 🔄 Falling back to regular streaming without MCP tools...",
    );

    // Convert UIMessage[] to ModelMessage[] for fallback with error handling
    let fallbackConvertedMessages;
    try {
      fallbackConvertedMessages = convertToModelMessages(messages);
      console.log(
        "[VIDEO-GENERATOR] ✅ Fallback messages converted successfully",
      );
    } catch (conversionError) {
      console.error(
        "[VIDEO-GENERATOR] ❌ Fallback message conversion failed:",
        conversionError,
      );
      throw new Error(
        `Fallback failed to convert messages: ${conversionError instanceof Error ? conversionError.message : "Unknown error"}`,
      );
    }

    // Create a context-aware readCode tool for fallback if code context is provided
    const fallbackContextAwareReadCodeTool = codeContext
      ? tool({
          description:
            "Read the current Python code provided by the frontend. Use this before making modifications to existing code.",
          inputSchema: z.object({}),
          execute: async (input, options) => {
            return (
              readCodeTool.execute?.({ code: codeContext || "" }, options) || {
                success: false,
                hasCode: false,
                error: "readCodeTool not available",
              }
            );
          },
        })
      : readCodeTool;

    // Fallback to regular streaming without MCP tools but with code tools
    const fallbackTools = {
      writeCode: writeCodeTool,
      readCode: fallbackContextAwareReadCodeTool,
    };

    const result = streamText({
      model: anthropic("claude-3-haiku-20240307"),
      // toolCallStreaming is enabled by default in AI SDK v5
      system: `You are Claiss AI, an educational Python code generator specialized in creating Manim animations for learning.

Note: Context7 integration is currently unavailable, so generate educational Manim code based on your training data.

IMPORTANT: You have access to code management tools. NEVER include Python code in your text responses. Always use the writeCode tool for code.

WORKFLOW FOR ANY EDUCATIONAL REQUEST:
1. If this is a modification request, FIRST use readCode tool with any provided code context from frontend
2. Extract the educational topic from the user's question
3. Generate clean, working Python code using Manim for educational animations
4. Use writeCode tool to save the code (this will automatically compile the video)
5. Provide brief explanation in text response WITHOUT including any code content

IMPORTANT: When frontend provides code context (for modification requests), always call readCode tool first with that context before making any changes.

CRITICAL CODE FORMAT REQUIREMENTS:
- Use proper Manim class structure: class [Topic]Animation(Scene)
- Include necessary imports: from manim import *
- Ensure code is complete and executable
- Use modern Manim syntax and avoid deprecated animations:
  * Use Create() instead of GrowArrow() for arrow animations
  * Use Create() for all drawing animations
  * Avoid deprecated methods like .set_fill() with positional arguments
- Add brief comments only for complex parts
- Make class names descriptive (e.g., BubbleSortAnimation, LinearRegressionAnimation)

CONTENT MANAGEMENT REQUIREMENTS (CRITICAL TO PREVENT OVERLAPPING):
- Use self.next_section("Section Name") to divide content into logical parts
- Always use FadeOut() to remove objects before introducing new major content
- Use self.clear() when transitioning between completely different concepts
- Structure animations: Introduce → Explain → Remove → Next Topic

SCENE ORGANIZATION TEMPLATE (FOLLOW THIS STRUCTURE):
\`\`\`python
class ExampleAnimation(Scene):
    def construct(self):
        # Section 1: Introduction
        self.next_section("Introduction")
        title = Text("Topic Title")
        self.play(FadeIn(title))
        self.wait(1)
        self.play(FadeOut(title))  # Remove before next section

        # Section 2: Main Content
        self.next_section("Main Content")
        main_obj = Circle()  # Clean slate, no overlap
        self.play(Create(main_obj))
        # ... animations ...
        self.play(FadeOut(main_obj))  # Clean up

        # Section 3: Additional Content
        self.next_section("Conclusion")
        conclusion = Text("Summary")
        self.play(FadeIn(conclusion))
        self.wait(2)
\`\`\`

CONTEXT AWARENESS FOR MODIFICATIONS:
- When user asks to "change the color", "add something", or "modify" existing content, ALWAYS use readCode first
- Understand the existing code structure before making changes
- Preserve good parts of existing code while making requested modifications
- Keep the section-based organization from the template

EDUCATIONAL SCRIPT REQUIREMENTS:
- Write in clear, teacherly language that explains the concepts being animated
- Structure as: Introduction → Main concepts → Key steps → Conclusion
- Explain WHY things happen, not just WHAT happens
- Use timing cues like "First, we see...", "Next...", "Notice how..."
- Make it suitable for voice narration (conversational, not bullet points)
- Length: 1-3 paragraphs depending on complexity

RESPONSE FORMAT:
1. Use readCode tool if this is a modification (not for brand new requests)
2. Use writeCode tool with complete Python code following the scene template
3. Provide brief explanation (1-2 sentences) in text - NO CODE CONTENT IN TEXT
4. The writeCode tool will automatically handle video compilation

ALWAYS follow the scene organization template for proper content management.
NEVER include Python code in your text responses - only use the writeCode tool for code.`,
      messages: fallbackConvertedMessages,
      tools: fallbackTools,
      stopWhen: stepCountIs(5),
      onStepFinish: ({ text, finishReason, usage }) => {
        console.log(`[VIDEO-GENERATOR] 📋 Fallback Step completed:`);
        console.log(`[VIDEO-GENERATOR]   - Reason: ${finishReason}`);
        console.log(
          `[VIDEO-GENERATOR]   - Text length: ${text?.length || 0} chars`,
        );
        if (usage) {
          console.log(
            `[VIDEO-GENERATOR]   - Token usage: ${usage.totalTokens} total`,
          );
        }
      },
      onFinish: async ({ text, usage, finishReason, steps }) => {
        const fallbackEndTime = Date.now();
        const fallbackDuration = fallbackEndTime - startTime;

        console.log(
          `[VIDEO-GENERATOR] 🎉 Fallback stream completed successfully!`,
        );
        console.log(
          `[VIDEO-GENERATOR]   - Total duration: ${fallbackDuration}ms`,
        );
        console.log(`[VIDEO-GENERATOR]   - Final reason: ${finishReason}`);
        console.log(`[VIDEO-GENERATOR]   - Total steps: ${steps?.length || 0}`);
        console.log(
          `[VIDEO-GENERATOR]   - Final text length: ${text?.length || 0} chars`,
        );
        if (usage) {
          console.log(
            `[VIDEO-GENERATOR]   - Total token usage: ${usage.totalTokens}`,
          );
        }

        console.log(
          "[VIDEO-GENERATOR] ℹ️  Code generation handled by writeCode tool (fallback)",
        );
      },
      onError: async ({ error }) => {
        const fallbackEndTime = Date.now();
        const fallbackDuration = fallbackEndTime - startTime;

        console.error(
          `[VIDEO-GENERATOR] ❌ Fallback streaming error after ${fallbackDuration}ms:`,
          error,
        );
        if (error instanceof Error) {
          console.error(`[VIDEO-GENERATOR] Fallback error details:`, {
            message: error.message,
            stack: error.stack,
            name: error.name,
          });
        }
      },
    });

    return result.toUIMessageStreamResponse();
  }
}
