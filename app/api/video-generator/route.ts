import { openai } from '@ai-sdk/openai';
import { 
  streamText, 
  convertToModelMessages, 
  experimental_createMCPClient,
  stepCountIs,
  type UIMessage 
} from 'ai';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { compileManimCode, extractManimCode } from '@/lib/manim-compiler';

export const maxDuration = 30;

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
    const tools = await mcpClient.tools();
    console.log(`[VIDEO-GENERATOR] ✅ Retrieved ${Object.keys(tools || {}).length} tools from Context7`);

    console.log('[VIDEO-GENERATOR] Step 3: Starting AI text streaming...');
    const result = streamText({
      model: openai('gpt-5'),
      system: `You are Classia AI, an educational Python code generator specialized in creating Manim animations for learning.

WORKFLOW FOR ANY EDUCATIONAL REQUEST:
1. Extract the main topic from the user's question (e.g., "bubble sort", "physics simulation", "calculus", "data structures")
2. ALWAYS use Context7 tools to search the /manimcommunity/manim library with the pattern: "{extracted_topic} examples animations"
3. Return clean, working Python code using Manim for educational animations with proper content management
4. Keep explanations minimal - focus on providing complete, runnable code

CRITICAL CODE FORMAT REQUIREMENTS:
- ALWAYS wrap Python code in \`\`\`python code blocks
- Use proper Manim class structure: class [Topic]Animation(Scene)
- Include necessary imports: from manim import *
- Ensure code is complete and executable
- Use modern Manim syntax (avoid deprecated methods like .set_fill())
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

SCENE ORGANIZATION TEMPLATE:
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

RESPONSE FORMAT:
1. Brief explanation (1-2 sentences)
2. Clean Python code block with proper formatting and content management
3. The code will be automatically compiled into a video animation

EXAMPLES OF TOPIC EXTRACTION:
- "Explain how bubble sort works" → Search: "bubble sort examples animations"
- "Show me linear regression" → Search: "linear regression examples animations"  
- "How does a pendulum move?" → Search: "pendulum physics examples animations"
- "What is calculus?" → Search: "calculus examples animations"

ALWAYS use Context7 to get the most up-to-date Manim documentation and examples before generating code.`,
      messages: convertToModelMessages(messages),
      tools, // Context7 tools: get-library-docs, resolve-library-id
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
        
        // Try to compile Manim code if present
        if (text) {
          console.log('[VIDEO-GENERATOR] Step 5: Checking for Manim code...');
          const manimData = extractManimCode(text);
          
          if (manimData) {
            console.log(`[VIDEO-GENERATOR] 🎬 Found Manim code with class: ${manimData.className}`);
            console.log('[VIDEO-GENERATOR] Step 6: Compiling Manim animation...');
            
            try {
              const compilationResult = await compileManimCode(manimData.code, manimData.className);
              
              if (compilationResult.success) {
                console.log(`[VIDEO-GENERATOR] 🎉 Animation compiled successfully!`);
                console.log(`[VIDEO-GENERATOR]   - Video URL: ${compilationResult.videoUrl}`);
              } else {
                console.error(`[VIDEO-GENERATOR] ❌ Animation compilation failed:`, compilationResult.error);
              }
            } catch (error) {
              console.error(`[VIDEO-GENERATOR] ❌ Unexpected compilation error:`, error);
            }
          } else {
            console.log('[VIDEO-GENERATOR] ℹ️  No Manim code detected in response');
          }
        }
        
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
    
    // Fallback to regular streaming without MCP tools
    const result = streamText({
      model: openai('gpt-4o'),
      system: `You are Classia AI, an educational Python code generator specialized in creating Manim animations for learning.

Note: Context7 integration is currently unavailable, so generate educational Manim code based on your training data.

CRITICAL CODE FORMAT REQUIREMENTS:
- ALWAYS wrap Python code in \`\`\`python code blocks
- Use proper Manim class structure: class [Topic]Animation(Scene)
- Include necessary imports: from manim import *
- Ensure code is complete and executable
- Use modern Manim syntax (avoid deprecated methods like .set_fill())
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

RESPONSE FORMAT:
1. Brief explanation (1-2 sentences)
2. Clean Python code block with proper formatting and content management
3. The code will be automatically compiled into a video animation

Extract the educational topic from the user's question and create appropriate Manim animation code with proper content management.`,
      messages: convertToModelMessages(messages),
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
        
        // Try to compile Manim code if present (fallback scenario)
        if (text) {
          console.log('[VIDEO-GENERATOR] Step 5: Checking for Manim code (fallback)...');
          const manimData = extractManimCode(text);
          
          if (manimData) {
            console.log(`[VIDEO-GENERATOR] 🎬 Found Manim code with class: ${manimData.className}`);
            console.log('[VIDEO-GENERATOR] Step 6: Compiling Manim animation (fallback)...');
            
            try {
              const compilationResult = await compileManimCode(manimData.code, manimData.className);
              
              if (compilationResult.success) {
                console.log(`[VIDEO-GENERATOR] 🎉 Animation compiled successfully!`);
                console.log(`[VIDEO-GENERATOR]   - Video URL: ${compilationResult.videoUrl}`);
              } else {
                console.error(`[VIDEO-GENERATOR] ❌ Animation compilation failed:`, compilationResult.error);
              }
            } catch (error) {
              console.error(`[VIDEO-GENERATOR] ❌ Unexpected compilation error:`, error);
            }
          } else {
            console.log('[VIDEO-GENERATOR] ℹ️  No Manim code detected in fallback response');
          }
        }
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