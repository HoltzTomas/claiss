import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, copyFileSync, readdirSync, unlinkSync } from 'fs';
import path from 'path';

export interface ManimCompilationResult {
  success: boolean;
  videoPath?: string;
  videoUrl?: string;
  error?: string;
  logs?: string;
}

export async function compileManimCode(
  pythonCode: string, 
  className: string = 'Scene'
): Promise<ManimCompilationResult> {
  const timestamp = Date.now();
  const tempDir = `/tmp/manim-${timestamp}`;
  const fileName = `animation_${timestamp}.py`;
  const filePath = path.join(tempDir, fileName);
  const outputDir = path.join(process.cwd(), 'public', 'videos');
  
  try {
    console.log(`[MANIM-COMPILER] Starting compilation for ${className}`);
    
    // Create temporary directory
    mkdirSync(tempDir, { recursive: true });
    
    // Ensure output directory exists
    mkdirSync(outputDir, { recursive: true });
    
    // Delete all existing videos in output directory
    console.log('[MANIM-COMPILER] 🗑️  Cleaning old videos...');
    try {
      const existingFiles = readdirSync(outputDir);
      const videoFiles = existingFiles.filter(file => file.endsWith('.mp4'));
      videoFiles.forEach(file => {
        const filePath = path.join(outputDir, file);
        unlinkSync(filePath);
        console.log(`[MANIM-COMPILER]   - Deleted: ${file}`);
      });
      console.log(`[MANIM-COMPILER] ✅ Removed ${videoFiles.length} old videos`);
    } catch (error) {
      console.log('[MANIM-COMPILER] ℹ️  No old videos to clean');
    }
    
    // Write Python code to file
    writeFileSync(filePath, pythonCode);
    console.log(`[MANIM-COMPILER] ✅ Python file written: ${filePath}`);
    
    // Activate UV environment and run Manim with LaTeX support
    const uvEnvPath = path.join(process.cwd(), 'manim-test');
    const command = `export LIBGS=/opt/homebrew/lib/libgs.dylib && eval "$(/usr/libexec/path_helper -s)" && source ${uvEnvPath}/bin/activate && manim ${filePath} ${className} -ql --disable_caching`;
    
    console.log(`[MANIM-COMPILER] 🚀 Executing: ${command}`);
    
    // Execute Manim compilation
    const output = execSync(command, {
      cwd: tempDir,
      encoding: 'utf8',
      timeout: 60000, // 60 second timeout
    });
    
    console.log(`[MANIM-COMPILER] ✅ Compilation completed`);
    
    // Find the generated video file in the standard Manim output structure
    const manimOutputPath = path.join(tempDir, 'media', 'videos', fileName.replace('.py', ''), '480p15', `${className}.mp4`);
    const finalVideoPath = path.join(outputDir, 'latest.mp4'); // Always use 'latest.mp4' as filename
    
    console.log(`[MANIM-COMPILER] 🔍 Looking for video at: ${manimOutputPath}`);
    
    if (existsSync(manimOutputPath)) {
      // Copy the video to public directory with unique name
      copyFileSync(manimOutputPath, finalVideoPath);
      
      const videoUrl = `/videos/${path.basename(finalVideoPath)}`;
      console.log(`[MANIM-COMPILER] 🎬 Video generated: ${videoUrl}`);
      
      return {
        success: true,
        videoPath: finalVideoPath,
        videoUrl,
        logs: output,
      };
    } else {
      // Try to find any video file in the output directory
      try {
        const videoDir = path.dirname(manimOutputPath);
        const files = readdirSync(videoDir);
        const mp4Files = files.filter(f => f.endsWith('.mp4'));
        console.log(`[MANIM-COMPILER] 📁 Files in ${videoDir}:`, files);
        console.log(`[MANIM-COMPILER] 🎬 MP4 files found:`, mp4Files);
      } catch (e) {
        console.log(`[MANIM-COMPILER] ❌ Could not read directory: ${path.dirname(manimOutputPath)}`);
      }
      
      throw new Error(`Video file was not generated at expected path: ${manimOutputPath}`);
    }
    
  } catch (error) {
    console.error(`[MANIM-COMPILER] ❌ Compilation failed:`, error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      logs: error instanceof Error ? error.stack : undefined,
    };
  }
}

export function extractManimCode(text: string): { code: string; className: string } | null {
  // Look for Python code blocks
  const codeBlockRegex = /```(?:python)?\s*([\s\S]*?)\s*```/gi;
  const match = codeBlockRegex.exec(text);
  
  if (!match) return null;
  
  const code = match[1];
  
  // Extract class name (look for class definition)
  const classMatch = code.match(/class\s+(\w+)\s*\(/);
  const className = classMatch ? classMatch[1] : 'Scene';
  
  // Validate it's Manim code
  if (code.includes('from manim import') || code.includes('manim')) {
    return { code, className };
  }
  
  return null;
}