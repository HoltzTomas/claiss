import { readFileSync, existsSync } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const codePath = path.join(process.cwd(), 'temp', 'current-code.py');
    
    if (existsSync(codePath)) {
      const code = readFileSync(codePath, 'utf8');
      console.log(`[CURRENT-CODE] Code file found: ${code.length} characters`);
      
      return Response.json({ 
        success: true, 
        code,
        hasCode: true 
      });
    } else {
      console.log('[CURRENT-CODE] No code file found');
      
      return Response.json({ 
        success: true, 
        code: null,
        hasCode: false 
      });
    }
  } catch (error) {
    console.error('[CURRENT-CODE] Error reading code file:', error);
    
    return Response.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      hasCode: false 
    }, { status: 500 });
  }
}
