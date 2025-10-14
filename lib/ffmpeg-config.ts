/**
 * FFmpeg Configuration
 * Provides environment-aware FFmpeg paths for development and production
 */

import ffmpeg from 'fluent-ffmpeg';
import { platform } from 'os';
import { existsSync } from 'fs';

// Check if running in development or production
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Get FFmpeg path based on environment
 */
function getFfmpegPath(): string {
  // 1. Check for environment variable (allows custom paths)
  if (process.env.FFMPEG_PATH) {
    return process.env.FFMPEG_PATH;
  }

  // 2. Try Homebrew path on macOS (development)
  if (isDevelopment && platform() === 'darwin') {
    const homebrewPath = '/opt/homebrew/bin/ffmpeg';
    if (existsSync(homebrewPath)) {
      return homebrewPath;
    }
  }

  // 3. Try system paths (Linux/Unix)
  const systemPaths = [
    '/usr/local/bin/ffmpeg',
    '/usr/bin/ffmpeg',
  ];

  for (const path of systemPaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  // 4. Fall back to @ffmpeg-installer package (production/serverless)
  try {
    const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
    return ffmpegInstaller.path;
  } catch (error) {
    console.error('[FFMPEG-CONFIG] Failed to load @ffmpeg-installer/ffmpeg:', error);
  }

  // 5. Last resort: assume ffmpeg is in PATH
  return 'ffmpeg';
}

/**
 * Get FFprobe path based on environment
 */
function getFfprobePath(): string {
  // 1. Check for environment variable
  if (process.env.FFPROBE_PATH) {
    return process.env.FFPROBE_PATH;
  }

  // 2. Try Homebrew path on macOS (development)
  if (isDevelopment && platform() === 'darwin') {
    const homebrewPath = '/opt/homebrew/bin/ffprobe';
    if (existsSync(homebrewPath)) {
      return homebrewPath;
    }
  }

  // 3. Try system paths (Linux/Unix)
  const systemPaths = [
    '/usr/local/bin/ffprobe',
    '/usr/bin/ffprobe',
  ];

  for (const path of systemPaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  // 4. Fall back to @ffmpeg-installer package (includes ffprobe)
  try {
    const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
    // The package provides ffmpeg path, derive ffprobe path from it
    const ffmpegPath = ffmpegInstaller.path;
    const ffprobePath = ffmpegPath.replace('ffmpeg', 'ffprobe');
    if (existsSync(ffprobePath)) {
      return ffprobePath;
    }
  } catch (error) {
    console.error('[FFMPEG-CONFIG] Failed to load @ffmpeg-installer/ffmpeg:', error);
  }

  // 5. Last resort: assume ffprobe is in PATH
  return 'ffprobe';
}

/**
 * Configure FFmpeg paths
 * Call this once at module initialization
 */
export function configureFfmpeg(): void {
  const ffmpegPath = getFfmpegPath();
  const ffprobePath = getFfprobePath();

  console.log('[FFMPEG-CONFIG] Configuring FFmpeg...');
  console.log('[FFMPEG-CONFIG] Environment:', process.env.NODE_ENV);
  console.log('[FFMPEG-CONFIG] Platform:', platform());
  console.log('[FFMPEG-CONFIG] FFmpeg path:', ffmpegPath);
  console.log('[FFMPEG-CONFIG] FFprobe path:', ffprobePath);

  ffmpeg.setFfmpegPath(ffmpegPath);
  ffmpeg.setFfprobePath(ffprobePath);

  console.log('[FFMPEG-CONFIG] ✅ FFmpeg configured successfully');
}

// Export paths for external use if needed
export const ffmpegPath = getFfmpegPath();
export const ffprobePath = getFfprobePath();
