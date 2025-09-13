import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { tool } from 'ai';
import { z } from 'zod';
import path from 'path';
import { compileManimCode } from './manim-compiler';

/**
 * Tool for writing Python code to temp file
 * Always overwrites existing code (similar to video approach)
 */
export const writeCodeTool = tool({
  description: 'Write or update Python code to the temporary code file. Use this tool whenever you generate or modify Python code for the user.',
  inputSchema: z.object({
    code: z.string().describe('The complete Python code to write to the file'),
    description: z.string().nullable().describe('Optional description of what the code does'),
  }),
  execute: async ({ code, description }) => {
    try {
      const tempDir = '/tmp';
      const codePath = path.join(tempDir, 'current-code.py');
      
      console.log('[CODE-TOOL] Writing code to file...');
      
      // Ensure temp directory exists
      if (!existsSync(tempDir)) {
        mkdirSync(tempDir, { recursive: true });
        console.log('[CODE-TOOL] Created temp directory');
      }
      
      // Write code to file (always overwrite)
      writeFileSync(codePath, code, 'utf8');
      console.log(`[CODE-TOOL] ✅ Code written successfully: ${code.length} characters`);
      
      // Try to compile Manim code if it's valid (direct validation)
      if (code.includes('from manim import') || code.includes('manim')) {
        // Extract class name directly from the raw code
        const classMatch = code.match(/class\s+(\w+)\s*\(/);
        const className = classMatch ? classMatch[1] : 'Scene';
        
        console.log(`[CODE-TOOL] 🎬 Found Manim code with class: ${className}`);
        console.log('[CODE-TOOL] Starting compilation...');
        
        try {
          const compilationResult = await compileManimCode(code, className);
          
          if (compilationResult.success) {
            console.log(`[CODE-TOOL] 🎉 Animation compiled successfully!`);
            console.log(`[CODE-TOOL]   - Video URL: ${compilationResult.videoUrl}`);
            
            return {
              success: true,
              message: `Code written and video compiled successfully.${description ? ` Description: ${description}` : ''}`,
              codeLength: code.length,
              videoGenerated: true,
              videoUrl: compilationResult.videoUrl,
            };
          } else {
            console.error(`[CODE-TOOL] ❌ Animation compilation failed:`, compilationResult.error);
            
            return {
              success: true,
              message: `Code written successfully but video compilation failed: ${compilationResult.error}.${description ? ` Description: ${description}` : ''}`,
              codeLength: code.length,
              videoGenerated: false,
              error: compilationResult.error,
            };
          }
        } catch (error) {
          console.error(`[CODE-TOOL] ❌ Unexpected compilation error:`, error);
          
          return {
            success: true,
            message: `Code written successfully but unexpected compilation error occurred.${description ? ` Description: ${description}` : ''}`,
            codeLength: code.length,
            videoGenerated: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      } else {
        console.log('[CODE-TOOL] ℹ️  Not Manim code, skipping compilation');
        
        return {
          success: true,
          message: `Code written successfully (non-Manim code).${description ? ` Description: ${description}` : ''}`,
          codeLength: code.length,
          videoGenerated: false,
        };
      }
    } catch (error) {
      console.error('[CODE-TOOL] ❌ Error writing code:', error);
      
      return {
        success: false,
        message: `Failed to write code: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

/**
 * Tool for reading existing Python code from temp file
 * Useful for context awareness when modifying existing code
 */
export const readCodeTool = tool({
  description: 'Read the current Python code from the temporary file. Use this before making modifications to existing code.',
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const codePath = path.join('/tmp', 'current-code.py');
      
      if (existsSync(codePath)) {
        const existingCode = readFileSync(codePath, 'utf8');
        console.log(`[CODE-TOOL] 📖 Read existing code: ${existingCode.length} characters`);
        
        return {
          success: true,
          hasCode: true,
          code: existingCode,
          codeLength: existingCode.length,
        };
      } else {
        console.log('[CODE-TOOL] 📖 No existing code file found');
        
        return {
          success: true,
          hasCode: false,
          message: 'No existing code file found. This will be a new code creation.',
        };
      }
    } catch (error) {
      console.error('[CODE-TOOL] ❌ Error reading code:', error);
      
      return {
        success: false,
        hasCode: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});