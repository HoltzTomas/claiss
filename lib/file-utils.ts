import path from 'path';
import fs from 'fs/promises';

/**
 * Get the path to the latest video file
 */
export function getLatestVideo(): string {
  return path.join(process.cwd(), 'public', 'videos', 'latest.mp4');
}

/**
 * Read the current script content from /tmp/current-script.txt
 */
export async function readCurrentScript(): Promise<string> {
  try {
    const scriptPath = path.join('/tmp', 'current-script.txt');
    const content = await fs.readFile(scriptPath, 'utf8');
    return content.trim();
  } catch (error) {
    throw new Error(`Failed to read current script: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}