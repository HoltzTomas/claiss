export interface ModalCompilationResult {
  success: boolean;
  video_bytes?: Uint8Array;
  error?: string;
  logs?: string;
  duration?: number;
}

export interface ModalCompilationRequest {
  python_code: string;
  class_name?: string;
  quality?: 'low_quality' | 'medium_quality' | 'high_quality';
}

export interface ModalMergeResult {
  success: boolean;
  video_bytes?: Uint8Array;
  error?: string;
  duration?: number;
  scene_count?: number;
}

export interface ModalMergeRequest {
  video_urls: string[];
  add_transitions?: boolean;
  transition_duration?: number;
}

export class ModalHttpClient {
  private modalCompileEndpointUrl: string;
  private modalMergeEndpointUrl: string;

  constructor() {
    this.modalCompileEndpointUrl = "https://holtztomas--classia-manim-compiler-compile-manim-web-endpoint.modal.run";
    this.modalMergeEndpointUrl = "https://holtztomas--classia-manim-compiler-merge-videos-web-endpoint.modal.run";
  }

  async compileAnimation(request: ModalCompilationRequest): Promise<ModalCompilationResult> {
    try {
      console.log('[MODAL-CLIENT] Starting remote HTTP compilation...');
      console.log(`[MODAL-CLIENT] Class: ${request.class_name || 'Scene'}`);
      console.log(`[MODAL-CLIENT] Quality: ${request.quality || 'low_quality'}`);

      const requestPayload = {
        python_code: request.python_code,
        class_name: request.class_name || 'Scene',
        quality: request.quality || 'low_quality'
      };

      console.log('[MODAL-CLIENT] Calling Modal HTTP endpoint...');

      const response = await fetch(this.modalCompileEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}, text: ${await response.text()}`);
      }

      const result = await response.json();

      if (result.success) {
        if (result.video_bytes_base64) {
          const videoBuffer = Buffer.from(result.video_bytes_base64, 'base64');
          result.video_bytes = new Uint8Array(videoBuffer);
          delete result.video_bytes_base64;
        }

        console.log(`[MODAL-CLIENT] ✅ Compilation successful! Duration: ${result.duration?.toFixed(2)}s`);
        console.log(`[MODAL-CLIENT] Video size: ${result.video_bytes?.length || 0} bytes`);

        return {
          success: true,
          video_bytes: result.video_bytes,
          logs: result.logs,
          duration: result.duration
        };
      } else {
        console.error('[MODAL-CLIENT] ❌ Compilation failed:', result.error);

        return {
          success: false,
          error: result.error || 'Unknown Modal compilation error',
          logs: result.logs,
          duration: result.duration
        };
      }
    } catch (error) {
      console.error('[MODAL-CLIENT] ❌ Modal HTTP client error:', error);

      return {
        success: false,
        error: `Modal HTTP client error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      console.log('[MODAL-CLIENT] Performing health check...');

      const testPayload = {
        python_code: 'from manim import *\nclass Test(Scene):\n    def construct(self):\n        pass',
        class_name: 'Test',
        quality: 'low_quality'
      };

      const response = await fetch(this.modalCompileEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload)
      });

      if (response.ok) {
        console.log('[MODAL-CLIENT] ✅ Health check passed');
        return { healthy: true };
      } else {
        const errorText = await response.text();
        console.log('[MODAL-CLIENT] ❌ Health check failed:', response.status, errorText);
        return {
          healthy: false,
          error: `HTTP ${response.status}: ${errorText}`
        };
      }

    } catch (error) {
      console.log('[MODAL-CLIENT] ❌ Health check error:', error);
      return {
        healthy: false,
        error: `Health check failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async mergeVideos(request: ModalMergeRequest): Promise<ModalMergeResult> {
    try {
      console.log(`[MODAL-CLIENT] Starting remote video merge of ${request.video_urls.length} scenes...`);
      console.log(`[MODAL-CLIENT] Transitions: ${request.add_transitions ? 'enabled' : 'disabled'}`);

      const requestPayload = {
        video_urls: request.video_urls,
        add_transitions: request.add_transitions || false,
        transition_duration: request.transition_duration || 0.5
      };

      console.log('[MODAL-CLIENT] Calling Modal merge endpoint...');

      const response = await fetch(this.modalMergeEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}, text: ${await response.text()}`);
      }

      const result = await response.json();

      if (result.success) {
        if (result.video_bytes_base64) {
          const videoBuffer = Buffer.from(result.video_bytes_base64, 'base64');
          result.video_bytes = new Uint8Array(videoBuffer);
          delete result.video_bytes_base64;
        }

        console.log(`[MODAL-CLIENT] ✅ Merge successful! Duration: ${result.duration?.toFixed(2)}s`);
        console.log(`[MODAL-CLIENT] Merged video size: ${result.video_bytes?.length || 0} bytes`);

        return {
          success: true,
          video_bytes: result.video_bytes,
          duration: result.duration,
          scene_count: result.scene_count
        };
      } else {
        console.error('[MODAL-CLIENT] ❌ Merge failed:', result.error);

        return {
          success: false,
          error: result.error || 'Unknown Modal merge error',
          duration: result.duration
        };
      }
    } catch (error) {
      console.error('[MODAL-CLIENT] ❌ Modal merge HTTP client error:', error);

      return {
        success: false,
        error: `Modal merge HTTP client error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}

export const defaultModalHttpClient = new ModalHttpClient();

export async function compileAnimationWithModal(
  pythonCode: string,
  className: string = 'Scene',
  quality: 'low_quality' | 'medium_quality' | 'high_quality' = 'low_quality'
): Promise<ModalCompilationResult> {
  return await defaultModalHttpClient.compileAnimation({
    python_code: pythonCode,
    class_name: className,
    quality
  });
}
