import { openai } from '@ai-sdk/openai';
import { 
  streamText, 
  convertToModelMessages, 
  experimental_createMCPClient,
  stepCountIs,
  type UIMessage 
} from 'ai';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

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
      model: openai('gpt-4o'),
      system: `You are Classia AI, an educational Python code generator specialized in creating Manim animations for learning.

WORKFLOW FOR ANY EDUCATIONAL REQUEST:
1. Extract the main topic from the user's question (e.g., "bubble sort", "physics simulation", "calculus", "data structures")
2. ALWAYS use Context7 tools to search the /manimcommunity/manim library with the pattern: "{extracted_topic} examples animations"
3. Return clean, working Python code using Manim for educational animations
4. Keep explanations minimal - focus on providing complete, runnable code

RESPONSE FORMAT:
- Return primarily Python code blocks
- Use proper Manim class structure: class TopicAnimation(Scene)
- Include necessary imports: from manim import *
- Ensure code is complete and executable
- Add brief comments only for complex parts

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

RESPONSE FORMAT:
- Return clean, working Python code using Manim for educational animations
- Use proper Manim class structure: class TopicAnimation(Scene)
- Include necessary imports: from manim import *
- Ensure code is complete and executable
- Keep explanations minimal - focus on providing runnable code

Extract the educational topic from the user's question and create appropriate Manim animation code.`,
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