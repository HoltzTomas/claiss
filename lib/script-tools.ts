import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { tool } from 'ai';
import { z } from 'zod';
import path from 'path';

/**
 * Tool for writing educational scripts to temp file
 * Scripts explain what's happening in the generated Manim animation
 */
export const writeScriptTool = tool({
  description: 'Write educational script that explains the animation being generated. Use this tool to create voice narration content for the video.',
  inputSchema: z.object({
    script: z.string().describe('The complete educational script that explains the animation and its concepts'),
    title: z.string().nullable().describe('Optional title of the educational topic'),
  }),
  execute: async ({ script, title }) => {
    try {
      const tempDir = path.join(process.cwd(), 'temp');
      const scriptPath = path.join(tempDir, 'current-script.txt');
      
      console.log('[SCRIPT-TOOL] Writing script to file...');
      
      // Ensure temp directory exists
      if (!existsSync(tempDir)) {
        mkdirSync(tempDir, { recursive: true });
        console.log('[SCRIPT-TOOL] Created temp directory');
      }
      
      // Format script with title if provided
      const formattedScript = title 
        ? `# ${title}\n\n${script}`
        : script;
      
      // Write script to file (always overwrite)
      writeFileSync(scriptPath, formattedScript, 'utf8');
      console.log(`[SCRIPT-TOOL] ✅ Script written successfully: ${script.length} characters`);
      
      return {
        success: true,
        message: `Educational script written successfully.${title ? ` Topic: ${title}` : ''}`,
        scriptLength: script.length,
        hasTitle: !!title,
        title,
      };
    } catch (error) {
      console.error('[SCRIPT-TOOL] ❌ Error writing script:', error);
      
      return {
        success: false,
        message: `Failed to write script: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

/**
 * Tool for reading existing educational script from temp file
 * Useful for context awareness when modifying existing scripts
 */
export const readScriptTool = tool({
  description: 'Read the current educational script from the temporary file. Use this before making modifications to existing scripts.',
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const scriptPath = path.join(process.cwd(), 'temp', 'current-script.txt');
      
      if (existsSync(scriptPath)) {
        const existingScript = readFileSync(scriptPath, 'utf8');
        console.log(`[SCRIPT-TOOL] 📖 Read existing script: ${existingScript.length} characters`);
        
        // Try to extract title if formatted with title
        const titleMatch = existingScript.match(/^# (.+)$/m);
        const title = titleMatch ? titleMatch[1] : null;
        const scriptContent = title 
          ? existingScript.replace(/^# .+\n\n/, '')
          : existingScript;
        
        return {
          success: true,
          hasScript: true,
          script: scriptContent,
          title,
          scriptLength: scriptContent.length,
        };
      } else {
        console.log('[SCRIPT-TOOL] 📖 No existing script file found');
        
        return {
          success: true,
          hasScript: false,
          message: 'No existing script file found. This will be a new script creation.',
        };
      }
    } catch (error) {
      console.error('[SCRIPT-TOOL] ❌ Error reading script:', error);
      
      return {
        success: false,
        hasScript: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});
