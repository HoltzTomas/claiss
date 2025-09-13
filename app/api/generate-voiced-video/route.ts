import { NextRequest, NextResponse } from 'next/server';
import { generateVoicedVideo } from '@/lib/video-merger';

export const maxDuration = 60; // Allow up to 60 seconds for video processing

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log(`[GENERATE-VOICED-VIDEO] Starting request at ${new Date().toISOString()}`);

  try {
    // Parse request body to get optional parameters
    let body: { scriptText?: string; voice?: string } = {};
    
    try {
      const contentType = request.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        body = await request.json();
      }
    } catch (parseError) {
      console.log('[GENERATE-VOICED-VIDEO] No JSON body provided, using defaults');
    }

    const { scriptText, voice = '21m00Tcm4TlvDq8ikWAM' } = body;
    
    console.log('[GENERATE-VOICED-VIDEO] Parameters:');
    console.log('  - Voice:', voice);
    console.log('  - Using custom script:', !!scriptText);
    console.log('  - Script length:', scriptText?.length || 'N/A (will read from file)');

    // Run the complete pipeline
    console.log('[GENERATE-VOICED-VIDEO] Starting pipeline...');
    console.log('[GENERATE-VOICED-VIDEO] About to call generateVoicedVideo with:', { scriptText: !!scriptText, voice });
    
    const result = await generateVoicedVideo(scriptText, voice);
    console.log('[GENERATE-VOICED-VIDEO] Pipeline result:', result);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (result.success) {
      console.log(`[GENERATE-VOICED-VIDEO] ✅ Success after ${duration}ms`);
      console.log('  - Output path:', result.outputPath);
      console.log('  - Audio path:', result.audioPath);
      
      return NextResponse.json({
        success: true,
        message: 'Voiced video generated successfully',
        outputPath: result.outputPath,
        audioPath: result.audioPath,
        duration: `${duration}ms`
      });
    } else {
      console.error(`[GENERATE-VOICED-VIDEO] ❌ Failed after ${duration}ms:`, result.error);
      
      return NextResponse.json({
        success: false,
        error: result.error,
        duration: `${duration}ms`
      }, { status: 500 });
    }

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.error(`[GENERATE-VOICED-VIDEO] ❌ Unexpected error after ${duration}ms:`, error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      duration: `${duration}ms`
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Generate Voiced Video API',
    description: 'POST to this endpoint to generate a video with TTS narration',
    parameters: {
      scriptText: 'Optional - custom script text (if not provided, reads from /tmp/current-script.txt)',
      voice: 'Optional - ElevenLabs voice ID to use (default: Rachel - 21m00Tcm4TlvDq8ikWAM)'
    },
    availableVoices: [
      '21m00Tcm4TlvDq8ikWAM', // Rachel (default)
      'AZnzlk1XvdvUeBnXmlld', // Domi
      'EXAVITQu4vr4xnSDxMaL', // Bella
      'ErXwobaYiN019PkySvjV', // Antoni
      'MF3mGyEYCl7XYWbV9V6O', // Elli
      'TxGEqnHWrfWFTfGW9XjX', // Josh
      'VR6AewLTigWG4xSOukaG', // Arnold
      'pNInz6obpgDQGcFmaJgB', // Adam
      'yoZ06aMxZJJ28mfd3POQ', // Sam
      'Custom voice ID from your ElevenLabs account'
    ]
  });
}