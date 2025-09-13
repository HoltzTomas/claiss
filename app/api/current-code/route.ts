import { readFileSync, existsSync } from 'fs';
import path from 'path';

// Helper function to read script file
function readScriptFile() {
  const scriptPath = path.join('/tmp', 'current-script.txt');
  
  if (existsSync(scriptPath)) {
    const scriptContent = readFileSync(scriptPath, 'utf8');
    console.log(`[CURRENT-CODE] Script file found: ${scriptContent.length} characters`);
    
    // Try to extract title if formatted with title
    const titleMatch = scriptContent.match(/^# (.+)$/m);
    const title = titleMatch ? titleMatch[1] : null;
    const script = title 
      ? scriptContent.replace(/^# .+\n\n/, '')
      : scriptContent;
    
    return { script, title, hasScript: true };
  } else {
    console.log('[CURRENT-CODE] No script file found');
    return { script: null, title: null, hasScript: false };
  }
}

export async function GET() {
  try {
    const codePath = path.join('/tmp', 'current-code.py');
    
    if (existsSync(codePath)) {
      const code = readFileSync(codePath, 'utf8');
      console.log(`[CURRENT-CODE] Code file found: ${code.length} characters`);
      
      // Also read script file
      const scriptData = readScriptFile();
      
      return Response.json({ 
        success: true, 
        code,
        hasCode: true,
        ...scriptData
      });
    } else {
      console.log('[CURRENT-CODE] No code file found');
      
      // Still check for script even if no code
      const scriptData = readScriptFile();
      
      return Response.json({ 
        success: true, 
        code: null,
        hasCode: false,
        ...scriptData
      });
    }
  } catch (error) {
    console.error('[CURRENT-CODE] Error reading files:', error);
    
    return Response.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      hasCode: false,
      hasScript: false 
    }, { status: 500 });
  }
}