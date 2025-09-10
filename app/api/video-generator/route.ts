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
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import path from 'path';

export const maxDuration = 30;

// Code persistence utilities
function getCodeStoragePath(): string {
  return path.join(process.cwd(), 'temp', 'current-code.py');
}

function saveCurrentCode(code: string): void {
  const codePath = getCodeStoragePath();
  mkdirSync(path.dirname(codePath), { recursive: true });
  writeFileSync(codePath, code);
  console.log(`[VIDEO-GENERATOR] 💾 Code saved to: ${codePath}`);
}

function getCurrentCode(): string | null {
  const codePath = getCodeStoragePath();
  if (existsSync(codePath)) {
    return readFileSync(codePath, 'utf8');
  }
  return null;
}

// System prompt for creation mode (no existing code)
function createCreationSystemPrompt(): string {
  return `You are Classia AI, an educational Python code generator specialized in creating Manim animations for learning.

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

RESPONSE FORMAT:
1. Brief explanation (1-2 sentences)
2. Clean Python code block with proper formatting and content management
3. The code will be automatically compiled into a video animation

ALWAYS use Context7 to get the most up-to-date Manim documentation and examples before generating code.`;
}

// System prompt for editing mode (existing code available)
function createEditingSystemPrompt(existingCode: string): string {
  return `You are Classia AI Video Editor, specialized in modifying existing Manim animations based on user feedback.

CURRENT CODE CONTEXT:
You are working with this existing Manim code:
\`\`\`python
${existingCode}
\`\`\`

YOUR ROLE:
- Modify the existing code based on user requests
- Maintain the overall structure and working functionality
- Apply precise, targeted changes rather than complete rewrites
- Preserve scene sections and content management patterns
- Keep the same class name unless specifically requested to change it

EDITING PRINCIPLES:
1. **Targeted Changes**: Make specific modifications to address user requests
2. **Preserve Structure**: Keep existing scene sections and organization
3. **Code Quality**: Ensure modifications maintain Manim best practices
4. **Content Management**: Preserve FadeIn/FadeOut patterns and section management
5. **Incremental Improvements**: Build on existing functionality

CRITICAL CODE FORMAT REQUIREMENTS:
- ALWAYS wrap modified Python code in \`\`\`python code blocks
- Return the COMPLETE modified code, not just the changes
- Maintain proper Manim class structure and imports
- Preserve class name unless user specifically requests a change
- Keep existing scene sections unless modifying them
- Ensure code remains complete and executable

EDITING RESPONSE FORMAT:
1. Brief explanation of changes made (1-2 sentences)
2. Complete modified Python code block
3. The updated code will be automatically compiled into a video

Extract the specific modification request and apply it to the existing code systematically.`;
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const startTime = Date.now();
  
  console.log(`[VIDEO-GENERATOR] Starting request at ${new Date().toISOString()}`);
  console.log(`[VIDEO-GENERATOR] Messages received:`, messages.length);

  // Auto-detect mode: check for existing code
  const existingCode = getCurrentCode();
  const isEditingMode = existingCode !== null;
  
  console.log(`[VIDEO-GENERATOR] Mode detected: ${isEditingMode ? 'EDITING' : 'CREATING'}`);
  if (isEditingMode) {
    console.log(`[VIDEO-GENERATOR] Existing code found: ${existingCode.length} characters`);
  }

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
    
    // Create unified system prompt based on mode
    const systemPrompt = isEditingMode 
      ? createEditingSystemPrompt(existingCode!)
      : createCreationSystemPrompt();
    
    const result = streamText({
      model: openai('gpt-5'),
      system: systemPrompt,
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
            
            // Save the generated/modified code for future editing
            saveCurrentCode(manimData.code);
            
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
      system: isEditingMode 
        ? createEditingSystemPrompt(existingCode!) + "\\n\\nNote: Context7 integration is currently unavailable, so modify the existing code based on your training data."
        : createCreationSystemPrompt() + "\\n\\nNote: Context7 integration is currently unavailable, so generate educational Manim code based on your training data.",
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
            
            // Save the generated/modified code for future editing (fallback scenario)
            saveCurrentCode(manimData.code);
            
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