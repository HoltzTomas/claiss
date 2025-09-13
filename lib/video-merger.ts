import { elevenlabs } from '@ai-sdk/elevenlabs';
import { experimental_generateSpeech } from 'ai';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { getLatestVideo, readCurrentScript, fileExists } from './file-utils';

export interface VoicedVideoResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  audioPath?: string;
  backupPath?: string;
  latestUpdated?: boolean;
}

/**
 * Generate TTS audio from text using AI SDK
 */
export async function generateTTSAudio(text: string, voice: string = '21m00Tcm4TlvDq8ikWAM'): Promise<Buffer> {
  try {
    console.log('[TTS] ============ generateTTSAudio called =============');
    console.log('[TTS] Text length:', text.length);
    console.log('[TTS] Voice:', voice);
    console.log('[TTS] Environment check - ELEVENLABS_API_KEY exists:', !!process.env.ELEVENLABS_API_KEY);
    
    // Check if ElevenLabs API key is configured
    if (!process.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY.trim() === '') {
      throw new Error('ELEVENLABS_API_KEY environment variable is not set');
    }
    
    console.log('[TTS] Found ElevenLabs API key, proceeding with TTS generation');
    
    let speechResult;
    try {
      speechResult = await experimental_generateSpeech({
        model: elevenlabs.speech('eleven_multilingual_v2'),
        voice: voice, // ElevenLabs voice ID
        text: text,
        outputFormat: 'mp3',
      });
      console.log('[TTS] Speech generation succeeded');
    } catch (speechError) {
      console.error('[TTS] Speech generation error:', speechError);
      throw speechError;
    }

    const { audio } = speechResult;
    console.log('[TTS] Audio response type:', typeof audio);
    console.log('[TTS] Audio constructor:', audio?.constructor?.name);
    
    if (!audio) {
      console.error('[TTS] Audio is null or undefined');
      throw new Error('Audio response is null or undefined');
    }

    console.log('[TTS] Audio object keys:', Object.keys(audio));

    // Access the audio data using type assertion to explore the structure
    const audioAny = audio as any;
    console.log('[TTS] Available audio properties:', Object.keys(audioAny));
    
    // Based on AI SDK docs, the audio response should have an audioData property
    // Let's try the documented approach first
    let audioBuffer: Buffer;
    
    try {
      // Handle the actual response format from AI SDK
      if (audioAny.uint8ArrayData) {
        console.log('[TTS] Found uint8ArrayData property');
        audioBuffer = Buffer.from(audioAny.uint8ArrayData);
      } else if (audioAny.base64Data) {
        console.log('[TTS] Found base64Data property');
        audioBuffer = Buffer.from(audioAny.base64Data, 'base64');
      } else if (audioAny.audioData) {
        console.log('[TTS] Found audioData property');
        const audioData = audioAny.audioData;
        
        if (audioData instanceof Uint8Array) {
          audioBuffer = Buffer.from(audioData);
        } else if (audioData instanceof ArrayBuffer) {
          audioBuffer = Buffer.from(audioData);
        } else {
          throw new Error(`Unexpected audioData type: ${typeof audioData}`);
        }
      } else if (typeof audioAny.arrayBuffer === 'function') {
        console.log('[TTS] Calling arrayBuffer() method');
        const arrayBuffer = await audioAny.arrayBuffer();
        audioBuffer = Buffer.from(arrayBuffer);
      } else if (audioAny instanceof ArrayBuffer) {
        audioBuffer = Buffer.from(audioAny);
      } else if (audioAny instanceof Uint8Array) {
        audioBuffer = Buffer.from(audioAny);
      } else if (Buffer.isBuffer(audioAny)) {
        audioBuffer = audioAny;
      } else {
        // Log the exact structure we found
        console.error('[TTS] Audio object properties:', Object.keys(audioAny));
        console.error('[TTS] MediaType:', audioAny.mediaType);
        console.error('[TTS] Format:', audioAny.format);
        throw new Error(`Unable to extract audio data from response. Available properties: ${Object.keys(audioAny).join(', ')}`);
      }
      
      console.log('[TTS] Successfully extracted audio buffer, size:', audioBuffer.length);
      return audioBuffer;
      
    } catch (conversionError) {
      console.error('[TTS] Audio conversion error:', conversionError);
      const errorMessage = conversionError instanceof Error ? conversionError.message : 'Unknown conversion error';
      throw new Error(`Failed to convert audio data: ${errorMessage}`);
    }
  } catch (error) {
    console.error('[TTS] Error generating audio:', error);
    throw new Error(`TTS generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Merge video with audio using FFmpeg
 */
export async function mergeVideoWithAudio(
  videoPath: string,
  audioBuffer: Buffer,
  outputPath: string
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      // Create temporary audio file
      const tempAudioPath = path.join(process.cwd(), 'temp', `audio-${Date.now()}.mp3`);
      await fs.writeFile(tempAudioPath, new Uint8Array(audioBuffer));

      console.log('[VIDEO-MERGER] Starting video merge process...');
      console.log('[VIDEO-MERGER] Video path:', videoPath);
      console.log('[VIDEO-MERGER] Audio path:', tempAudioPath);
      console.log('[VIDEO-MERGER] Output path:', outputPath);

      ffmpeg()
        .input(videoPath)
        .input(tempAudioPath)
        .outputOptions([
          '-c:v copy',  // Copy video stream without re-encoding
          '-c:a aac',   // Encode audio as AAC
          '-shortest'   // Match shortest stream duration
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('[VIDEO-MERGER] FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          console.log('[VIDEO-MERGER] Progress:', Math.round(progress.percent || 0) + '%');
        })
        .on('end', async () => {
          console.log('[VIDEO-MERGER] ✅ Video merge completed successfully');
          
          // Clean up temporary audio file
          try {
            await fs.unlink(tempAudioPath);
            console.log('[VIDEO-MERGER] Temporary audio file cleaned up');
          } catch (cleanupError) {
            console.warn('[VIDEO-MERGER] Failed to clean up temp audio file:', cleanupError);
          }
          
          resolve();
        })
        .on('error', async (error) => {
          console.error('[VIDEO-MERGER] ❌ FFmpeg error:', error);
          
          // Clean up temporary audio file on error
          try {
            await fs.unlink(tempAudioPath);
          } catch (cleanupError) {
            console.warn('[VIDEO-MERGER] Failed to clean up temp audio file after error:', cleanupError);
          }
          
          reject(new Error(`Video merge failed: ${error.message}`));
        })
        .run();
    } catch (error) {
      console.error('[VIDEO-MERGER] Setup error:', error);
      reject(error);
    }
  });
}

/**
 * Complete pipeline: read script, generate TTS, merge with video
 */
export async function generateVoicedVideo(
  scriptText?: string,
  voice: string = '21m00Tcm4TlvDq8ikWAM'
): Promise<VoicedVideoResult> {
  try {
    console.log('[PIPELINE] ========== generateVoicedVideo called ==========');
    console.log('[PIPELINE] Has scriptText:', !!scriptText);
    console.log('[PIPELINE] Voice:', voice);
    
    // Step 1: Get script text (use provided or read from file)
    const text = scriptText || await readCurrentScript();
    console.log('[PIPELINE] Script length:', text.length, 'characters');
    
    if (!text.trim()) {
      return {
        success: false,
        error: 'Script text is empty'
      };
    }

    // Step 2: Check if video exists
    const videoPath = getLatestVideo();
    const videoExists = await fileExists(videoPath);
    
    if (!videoExists) {
      return {
        success: false,
        error: `Video file not found: ${videoPath}`
      };
    }

    // Step 3: Generate TTS audio
    console.log('[PIPELINE] Generating TTS audio...');
    const audioBuffer = await generateTTSAudio(text, voice);
    console.log('[PIPELINE] ✅ TTS audio generated, size:', audioBuffer.length, 'bytes');

    // Step 4: Create output path
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(
      process.cwd(),
      'public',
      'videos',
      `voiced-video-${timestamp}.mp4`
    );

    // Step 5: Merge video with audio
    console.log('[PIPELINE] Merging video with audio...');
    await mergeVideoWithAudio(videoPath, audioBuffer, outputPath);
    console.log('[PIPELINE] ✅ Voiced video created successfully');

    // Step 6: Replace latest.mp4 with the voiced version
    console.log('[PIPELINE] Replacing latest.mp4 with voiced version...');
    try {
      // Create backup of original latest.mp4
      const backupPath = path.join(
        process.cwd(),
        'public',
        'videos',
        `latest-backup-${timestamp}.mp4`
      );
      await fs.copyFile(videoPath, backupPath);
      console.log('[PIPELINE] ✅ Original video backed up to:', backupPath);

      // Replace latest.mp4 with voiced version
      await fs.copyFile(outputPath, videoPath);
      console.log('[PIPELINE] ✅ latest.mp4 replaced with voiced version');
    } catch (replaceError) {
      console.error('[PIPELINE] ❌ Failed to replace latest.mp4:', replaceError);
      // Continue execution even if replacement fails
    }

    // Save audio file for reference
    const audioPath = path.join(
      process.cwd(),
      'public',
      'audio',
      `tts-audio-${timestamp}.mp3`
    );
    
    try {
      // Create audio directory if it doesn't exist
      await fs.mkdir(path.dirname(audioPath), { recursive: true });
      await fs.writeFile(audioPath, new Uint8Array(audioBuffer));
      console.log('[PIPELINE] Audio file saved:', audioPath);
    } catch (audioSaveError) {
      console.warn('[PIPELINE] Failed to save audio file:', audioSaveError);
    }

    return {
      success: true,
      outputPath,
      audioPath,
      backupPath: path.join(
        process.cwd(),
        'public',
        'videos',
        `latest-backup-${timestamp}.mp4`
      ),
      latestUpdated: true
    };

  } catch (error) {
    console.error('[PIPELINE] ❌ Pipeline error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
