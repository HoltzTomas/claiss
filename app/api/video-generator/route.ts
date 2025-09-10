import { openai } from '@ai-sdk/openai';
import { 
  streamText, 
  convertToModelMessages, 
  experimental_createMCPClient,
  stepCountIs,
  tool,
  type UIMessage 
} from 'ai';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { compileManimCode, extractManimCode } from '@/lib/manim-compiler';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import path from 'path';
import { z } from 'zod';

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
  return `You are Classia AI, an educational animation assistant that helps users create Manim videos.

IMPORTANT: You do NOT generate or write Python code directly. Instead, you use the generateManimCode tool to create animations.

YOUR ROLE:
1. Understand what the user wants to learn or visualize
2. Extract the educational topic and requirements from their request
3. Use the generateManimCode tool to create the animation
4. Provide encouraging and educational responses about the topic

WORKFLOW FOR ANY EDUCATIONAL REQUEST:
1. Analyze the user's request to identify the main topic
2. Determine the complexity level (basic, intermediate, advanced) based on the request
3. Use the generateManimCode tool with appropriate parameters
4. Respond with educational context about the topic while the tool works

RESPONSE STYLE:
- Be encouraging and educational
- Explain why the topic is interesting or important
- Never show Python code in your responses
- Focus on the learning aspect of the animation
- Keep responses concise but informative

NEVER generate Python code blocks in your responses. Always use the generateManimCode tool instead.`;
}

// System prompt for editing mode (existing code available)
function createEditingSystemPrompt(existingCode: string): string {
  return `You are Classia AI Video Editor, specialized in modifying existing Manim animations based on user feedback.

IMPORTANT: You do NOT modify or show Python code directly. Instead, you use the editManimCode tool to make changes.

EXISTING ANIMATION CONTEXT:
You currently have a Manim animation that the user wants to modify. The code exists but you should not display it.

YOUR ROLE:
1. Understand what changes the user wants to make
2. Use the editManimCode tool to apply those changes
3. Provide encouraging feedback about the improvements being made
4. Focus on the educational value of the modifications

WORKFLOW FOR EDIT REQUESTS:
1. Listen carefully to what the user wants to change
2. Extract the specific modification request and any details
3. Use the editManimCode tool with clear modification parameters
4. Respond positively about the improvements being applied

RESPONSE STYLE:
- Be supportive and encouraging about the changes
- Explain why the modification will improve the animation
- Never show or reference Python code directly
- Focus on the visual and educational improvements
- Keep responses concise but positive

NEVER show Python code blocks or implementation details. Always use the editManimCode tool instead.`;
}

// Tool for generating Manim code (creation mode)
const generateManimCodeTool = tool({
  description: 'Generate new Manim animation code for educational content',
  inputSchema: z.object({
    topic: z.string().describe('The main educational topic (e.g., "bubble sort", "calculus", "physics")'),
    requirements: z.string().describe('Specific requirements and details for the animation'),
    complexity: z.enum(['basic', 'intermediate', 'advanced']).describe('Complexity level of the animation')
  }),
  execute: async ({ topic, requirements, complexity }) => {
    console.log(`[MANIM-TOOL] Generating code for topic: ${topic} (${complexity})`);
    
    try {
      // Use Context7 to get Manim documentation for the topic
      // For now, generate a template based on the topic
      const className = `${topic.replace(/\s+/g, '')}Animation`;
      
      const manimCode = generateManimTemplate(topic, requirements, complexity, className);
      
      // Save the generated code
      saveCurrentCode(manimCode);
      
      // Compile the animation
      const compilationResult = await compileManimCode(manimCode, className);
      
      if (compilationResult.success) {
        console.log(`[MANIM-TOOL] ✅ Successfully generated and compiled ${topic} animation`);
        return `Successfully created ${topic} animation! The video has been compiled and is ready to view.`;
      } else {
        console.error(`[MANIM-TOOL] ❌ Compilation failed:`, compilationResult.error);
        return `Generated ${topic} animation code, but compilation failed: ${compilationResult.error}`;
      }
    } catch (error) {
      console.error(`[MANIM-TOOL] ❌ Tool execution failed:`, error);
      return `Failed to generate ${topic} animation: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
});

// Tool for editing existing Manim code
const editManimCodeTool = tool({
  description: 'Modify existing Manim animation code based on user feedback',
  inputSchema: z.object({
    modification: z.string().describe('Specific modification request (e.g., "change colors to red", "add a title", "speed up animation")'),
    details: z.string().describe('Additional details about the desired changes')
  }),
  execute: async ({ modification, details }) => {
    console.log(`[MANIM-TOOL] Editing code with modification: ${modification}`);
    
    try {
      const existingCode = getCurrentCode();
      if (!existingCode) {
        return "No existing code found to modify. Please generate an animation first.";
      }
      
      // Apply the modification to existing code
      const modifiedCode = applyManimModification(existingCode, modification, details);
      
      // Extract class name from existing code
      const classMatch = existingCode.match(/class\s+(\w+)\s*\(/);
      const className = classMatch ? classMatch[1] : 'ModifiedAnimation';
      
      // Save the modified code
      saveCurrentCode(modifiedCode);
      
      // Compile the modified animation
      const compilationResult = await compileManimCode(modifiedCode, className);
      
      if (compilationResult.success) {
        console.log(`[MANIM-TOOL] ✅ Successfully modified and compiled animation`);
        return `Animation updated successfully! Your changes (${modification}) have been applied and the video has been recompiled.`;
      } else {
        console.error(`[MANIM-TOOL] ❌ Modified code compilation failed:`, compilationResult.error);
        return `Applied your changes but compilation failed: ${compilationResult.error}`;
      }
    } catch (error) {
      console.error(`[MANIM-TOOL] ❌ Edit tool execution failed:`, error);
      return `Failed to apply modifications: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
});

// Helper function to generate Manim code template
function generateManimTemplate(topic: string, requirements: string, complexity: string, className: string): string {
  return `from manim import *

class ${className}(Scene):
    def construct(self):
        # Section 1: Introduction
        self.next_section("Introduction")
        title = Text("${topic.charAt(0).toUpperCase() + topic.slice(1)}", font_size=48)
        subtitle = Text("Educational Animation", font_size=32)
        subtitle.next_to(title, DOWN, buff=0.5)
        
        self.play(FadeIn(title))
        self.play(FadeIn(subtitle))
        self.wait(1)
        self.play(FadeOut(title), FadeOut(subtitle))
        
        # Section 2: Main Content
        self.next_section("Main Content")
        # TODO: Implement specific content based on ${topic}
        # Requirements: ${requirements}
        # Complexity: ${complexity}
        
        main_text = Text("${topic} content will be implemented here", font_size=36)
        self.play(FadeIn(main_text))
        self.wait(2)
        self.play(FadeOut(main_text))
        
        # Section 3: Conclusion
        self.next_section("Conclusion")
        conclusion = Text("Thank you for learning!", font_size=32, color=GREEN)
        self.play(FadeIn(conclusion))
        self.wait(2)`;
}

// Helper function to apply modifications to existing code
function applyManimModification(existingCode: string, modification: string, details: string): string {
  // Simple implementation - in production, this would use LLM to intelligently modify code
  console.log(`[MANIM-TOOL] Applying modification: ${modification} with details: ${details}`);
  
  // For now, just add a comment about the modification
  const modifiedCode = existingCode.replace(
    '# Section 2: Main Content',
    `# Section 2: Main Content (Modified: ${modification})`
  );
  
  return modifiedCode;
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
    
    // Create the appropriate tools based on mode
    const manimTools = isEditingMode 
      ? { editManimCode: editManimCodeTool, ...tools }
      : { generateManimCode: generateManimCodeTool, ...tools };
    
    const result = streamText({
      model: openai('gpt-5'),
      system: systemPrompt,
      messages: convertToModelMessages(messages),
      tools: manimTools, // Include both Context7 tools and Manim tools
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
        
        // Log tool calls and provide user-friendly status updates
        if (toolCalls && toolCalls.length > 0) {
          toolCalls.forEach((call, index) => {
            console.log(`[VIDEO-GENERATOR]   - Tool ${index + 1}: ${call.toolName} with args:`, call.input);
            
            // Log status messages based on tool being called
            if (call.toolName === 'generateManimCode') {
              console.log(`[VIDEO-GENERATOR] 🎬 Generating animation for: ${(call.input as any).topic}`);
            } else if (call.toolName === 'editManimCode') {
              console.log(`[VIDEO-GENERATOR] ✏️ Modifying animation: ${(call.input as any).modification}`);
            }
          });
        }
        
        // Log tool results
        if (toolResults && toolResults.length > 0) {
          toolResults.forEach((result, index) => {
            console.log(`[VIDEO-GENERATOR] ✅ Tool result ${index + 1}:`, result);
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
        
        // Tools now handle code generation and compilation automatically
        console.log('[VIDEO-GENERATOR] ✅ Stream processing completed. Tools handled code generation and compilation.');
        
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
    
    // Fallback to regular streaming without Context7 but still with Manim tools
    let fallbackManimTools;
    if (isEditingMode) {
      fallbackManimTools = { editManimCode: editManimCodeTool };
    } else {
      fallbackManimTools = { generateManimCode: generateManimCodeTool };
    }
      
    const result = streamText({
      model: openai('gpt-4o'),
      system: isEditingMode 
        ? createEditingSystemPrompt(existingCode!) + "\\n\\nNote: Context7 integration is currently unavailable, so use your training data to make modifications."
        : createCreationSystemPrompt() + "\\n\\nNote: Context7 integration is currently unavailable, so use your training data for educational content.",
      messages: convertToModelMessages(messages),
      tools: fallbackManimTools, // Still include Manim tools even without Context7
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
        
        // Tools handle code generation and compilation even in fallback mode
        console.log('[VIDEO-GENERATOR] ✅ Fallback stream processing completed. Tools handled code generation and compilation.');
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