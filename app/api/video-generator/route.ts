import { anthropic } from '@ai-sdk/anthropic';
import { 
  streamText, 
  convertToModelMessages, 
  experimental_createMCPClient,
  stepCountIs,
  type UIMessage 
} from 'ai';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { writeCodeTool, readCodeTool } from '@/lib/code-tools';
import { writeScriptTool, readScriptTool } from '@/lib/script-tools';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const startTime = Date.now();
  
  console.log(`[VIDEO-GENERATOR] Starting request at ${new Date().toISOString()}`);
  console.log(`[VIDEO-GENERATOR] Messages received:`, messages.length);

  let mcpClient: any = null;

  try {
    console.log('[VIDEO-GENERATOR] Step 1: Initializing Context7 MCP client...');
    
    // Create Context7 MCP client connection using HTTP transport
    const transport = new StreamableHTTPClientTransport(
      new URL('https://mcp.context7.com/mcp'),
      { 
        requestInit: {
          headers: { 
            'CONTEXT7_API_KEY': process.env.CONTEXT7 || '' 
          }
        }
      }
    );
    
    mcpClient = await experimental_createMCPClient({ transport });
    console.log('[VIDEO-GENERATOR] ✅ MCP client created successfully');

    // Get tools from Context7 MCP server
    console.log('[VIDEO-GENERATOR] Step 2: Fetching tools from Context7...');
    const context7Tools = await mcpClient.tools();
    console.log(`[VIDEO-GENERATOR] ✅ Retrieved ${Object.keys(context7Tools || {}).length} tools from Context7`);
    
    // Combine Context7 tools with our code and script management tools
    const tools = {
      ...context7Tools,
      writeCode: writeCodeTool,
      readCode: readCodeTool,
      writeScript: writeScriptTool,
      readScript: readScriptTool,
    };
    console.log(`[VIDEO-GENERATOR] ✅ Total tools available: ${Object.keys(tools).length}`);

    console.log('[VIDEO-GENERATOR] Step 3: Starting AI text streaming...');
    const result = streamText({
      model: anthropic('claude-3-5-sonnet-20241022'),
      // toolCallStreaming is enabled by default in AI SDK v5
      system: `You are Claiss AI, an educational Python code generator specialized in creating Manim animations for learning.

IMPORTANT: You have access to code and script management tools. NEVER include Python code in your text responses. Always use the writeCode tool for code and writeScript tool for educational narration.

WORKFLOW FOR ANY EDUCATIONAL REQUEST:
1. If this is a modification request, FIRST use readCode and readScript tools to get existing context
2. Extract the main topic from the user's question (e.g., "bubble sort", "physics simulation", "calculus", "data structures")
3. ALWAYS use Context7 tools to search the /manimcommunity/manim library with the pattern: "{extracted_topic} examples animations"
4. Generate clean, working Python code using Manim for educational animations
5. Use writeCode tool to save the code (this will automatically compile the video)
6. Generate an educational script that explains what's happening in the animation
7. Use writeScript tool to save the educational narration
8. Provide brief explanation in text response WITHOUT including any code or script content

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

EDUCATIONAL SCRIPT REQUIREMENTS:
- Write in clear, teacherly language that explains the concepts being animated
- Structure as: Introduction → Main concepts → Key steps → Conclusion
- Explain WHY things happen, not just WHAT happens
- Use timing cues like "First, we see...", "Next...", "Notice how..."
- Make it suitable for voice narration (conversational, not bullet points)
- Length: 1-3 paragraphs depending on complexity

SCRIPT EXAMPLE FORMAT:
"Welcome to this demonstration of bubble sort! We'll watch as this sorting algorithm compares adjacent elements and swaps them when needed. First, we see our unsorted array with numbers in random order. The algorithm starts by comparing the first two elements - notice how it swaps them because 5 is greater than 3. This process continues, with each pass moving the largest unsorted element to its correct position, like bubbles rising to the surface. By the end, we'll have a perfectly sorted array, demonstrating why this elegant algorithm got its bubbly name!"

RESPONSE FORMAT:
1. Use readCode and readScript tools if this is a modification (not for brand new requests)
2. Use Context7 tools to get relevant documentation/examples
3. Use writeCode tool with complete Python code following the scene template
4. Use writeScript tool with educational narration explaining the animation
5. Provide brief explanation (1-2 sentences) in text - NO CODE OR SCRIPT CONTENT IN TEXT
6. The writeCode tool will automatically handle video compilation

EXAMPLES OF TOPIC EXTRACTION:
- "Explain how bubble sort works" → Search: "bubble sort examples animations"
- "Show me linear regression" → Search: "linear regression examples animations"  
- "Change the circle to red" → First readCode, then modify existing code
- "Add a title to the animation" → First readCode, then enhance existing code

ALWAYS use Context7 to get the most up-to-date Manim documentation and examples before generating code.
ALWAYS follow the scene organization template for proper content management.
NEVER include Python code in your text responses - only use the writeCode tool for code.`,
      messages: convertToModelMessages(messages),
      tools, // Context7 tools + writeCode + readCode
      stopWhen: stepCountIs(5), // Enable multi-step tool usage
      onStepFinish: ({ text, toolCalls, toolResults, finishReason, usage }) => {
        console.log(`[VIDEO-GENERATOR] 📋 Step completed:`);
        console.log(`[VIDEO-GENERATOR]   - Reason: ${finishReason}`);
        console.log(`[VIDEO-GENERATOR]   - Text length: ${text?.length || 0} chars`);
        console.log(`[VIDEO-GENERATOR]   - Tool calls: ${toolCalls?.length || 0}`);
        console.log(`[VIDEO-GENERATOR]   - Tool results: ${toolResults?.length || 0}`);
        if (usage) {
          console.log(`[VIDEO-GENERATOR]   - Token usage: ${usage.totalTokens} total`);
        }
        
        // Log tool calls for debugging
        if (toolCalls && toolCalls.length > 0) {
          toolCalls.forEach((call, index) => {
            console.log(`[VIDEO-GENERATOR]   - Tool ${index + 1}: ${call.toolName} with args:`, call.input);
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
        console.log(`[VIDEO-GENERATOR]   - Final text length: ${text?.length || 0} chars`);
        if (usage) {
          console.log(`[VIDEO-GENERATOR]   - Total token usage: ${usage.totalTokens}`);
        }
        
        console.log('[VIDEO-GENERATOR] ℹ️  Code generation handled by writeCode tool');
        
        // Cleanup MCP client when streaming finishes
        if (mcpClient) {
          await mcpClient.close();
          console.log('[VIDEO-GENERATOR] ✅ MCP client closed');
        }
      },
      onError: async ({ error }) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.error(`[VIDEO-GENERATOR] ❌ Streaming error after ${duration}ms:`, error);
        if (error instanceof Error) {
          console.error(`[VIDEO-GENERATOR] Error details:`, {
            message: error.message,
            stack: error.stack,
            name: error.name
          });
        }
        
        // Cleanup MCP client on error
        if (mcpClient) {
          await mcpClient.close();
          console.log('[VIDEO-GENERATOR] ✅ MCP client closed after error');
        }
      },
    });

    console.log('[VIDEO-GENERATOR] Step 4: Converting to UI message stream...');
    return result.toUIMessageStreamResponse();
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.error(`[VIDEO-GENERATOR] ❌ Context7 MCP Client error after ${duration}ms:`, error);
    if (error instanceof Error) {
      console.error(`[VIDEO-GENERATOR] Error details:`, {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    
    console.log('[VIDEO-GENERATOR] 🔄 Falling back to regular streaming without MCP tools...');
    
    // Fallback to regular streaming without MCP tools but with code and script tools
    const fallbackTools = {
      writeCode: writeCodeTool,
      readCode: readCodeTool,
      writeScript: writeScriptTool,
      readScript: readScriptTool,
    };
    
    const result = streamText({
      model: anthropic('claude-3-haiku-20240307'),
      // toolCallStreaming is enabled by default in AI SDK v5
      system: `You are Claiss AI, an educational Python code generator specialized in creating Manim animations for learning.

Note: Context7 integration is currently unavailable, so generate educational Manim code based on your training data.

IMPORTANT: You have access to code and script management tools. NEVER include Python code in your text responses. Always use the writeCode tool for code and writeScript tool for educational narration.

WORKFLOW FOR ANY EDUCATIONAL REQUEST:
1. If this is a modification request, FIRST use readCode and readScript tools to get existing context
2. Extract the educational topic from the user's question
3. Generate clean, working Python code using Manim for educational animations
4. Use writeCode tool to save the code (this will automatically compile the video)
5. Generate an educational script that explains what's happening in the animation
6. Use writeScript tool to save the educational narration
7. Provide brief explanation in text response WITHOUT including any code or script content

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
1. Use readCode and readScript tools if this is a modification (not for brand new requests)
2. Use writeCode tool with complete Python code following the scene template
3. Use writeScript tool with educational narration explaining the animation
4. Provide brief explanation (1-2 sentences) in text - NO CODE OR SCRIPT CONTENT IN TEXT
5. The writeCode tool will automatically handle video compilation

ALWAYS follow the scene organization template for proper content management.
NEVER include Python code in your text responses - only use the writeCode tool for code.`,
      messages: convertToModelMessages(messages),
      tools: fallbackTools,
      stopWhen: stepCountIs(5),
      onStepFinish: ({ text, finishReason, usage }) => {
        console.log(`[VIDEO-GENERATOR] 📋 Fallback Step completed:`);
        console.log(`[VIDEO-GENERATOR]   - Reason: ${finishReason}`);
        console.log(`[VIDEO-GENERATOR]   - Text length: ${text?.length || 0} chars`);
        if (usage) {
          console.log(`[VIDEO-GENERATOR]   - Token usage: ${usage.totalTokens} total`);
        }
      },
      onFinish: async ({ text, usage, finishReason, steps }) => {
        const fallbackEndTime = Date.now();
        const fallbackDuration = fallbackEndTime - startTime;
        
        console.log(`[VIDEO-GENERATOR] 🎉 Fallback stream completed successfully!`);
        console.log(`[VIDEO-GENERATOR]   - Total duration: ${fallbackDuration}ms`);
        console.log(`[VIDEO-GENERATOR]   - Final reason: ${finishReason}`);
        console.log(`[VIDEO-GENERATOR]   - Total steps: ${steps?.length || 0}`);
        console.log(`[VIDEO-GENERATOR]   - Final text length: ${text?.length || 0} chars`);
        if (usage) {
          console.log(`[VIDEO-GENERATOR]   - Total token usage: ${usage.totalTokens}`);
        }
        
        console.log('[VIDEO-GENERATOR] ℹ️  Code generation handled by writeCode tool (fallback)');
      },
      onError: async ({ error }) => {
        const fallbackEndTime = Date.now();
        const fallbackDuration = fallbackEndTime - startTime;
        
        console.error(`[VIDEO-GENERATOR] ❌ Fallback streaming error after ${fallbackDuration}ms:`, error);
        if (error instanceof Error) {
          console.error(`[VIDEO-GENERATOR] Fallback error details:`, {
            message: error.message,
            stack: error.stack,
            name: error.name
          });
        }
      },
    });

    return result.toUIMessageStreamResponse();
  }
}