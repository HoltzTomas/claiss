/**
 * Modal client for calling remote Manim compilation functions.
 *
 * This module handles communication with Modal's serverless functions
 * for compiling Manim animations in containerized environments.
 */

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
  quality?: "low_quality" | "medium_quality" | "high_quality";
}

/**
 * Modal client for calling remote Manim compilation.
 */
export class ModalClient {
  private appName: string;
  private functionName: string;
  private modalEndpoint: string;

  constructor(
    appName: string = "classia-manim-compiler",
    functionName: string = "compile_manim_animation",
  ) {
    this.appName = appName;
    this.functionName = functionName;

    // Modal function URL format: https://modal-labs--{app-name}-{function-name}.modal.run
    // For webhook endpoints, but we'll use the Modal Python client instead
    this.modalEndpoint = `https://modal-labs--${appName.replace("_", "-")}-${functionName.replace("_", "-")}.modal.run`;
  }

  /**
   * Compile Manim animation using Modal serverless function.
   */
  async compileAnimation(
    request: ModalCompilationRequest,
  ): Promise<ModalCompilationResult> {
    try {
      console.log("[MODAL-CLIENT] Starting remote compilation...");
      console.log(`[MODAL-CLIENT] Class: ${request.class_name || "Scene"}`);
      console.log(
        `[MODAL-CLIENT] Quality: ${request.quality || "low_quality"}`,
      );

      // For now, we'll use a local subprocess to call Modal CLI
      // In production, you might want to use Modal's REST API or SDK
      const modalCall = await this.callModalFunction(request);

      if (modalCall.success && modalCall.video_bytes) {
        console.log(
          `[MODAL-CLIENT] ✅ Compilation successful! Duration: ${modalCall.duration?.toFixed(2)}s`,
        );
        console.log(
          `[MODAL-CLIENT] Video size: ${modalCall.video_bytes.length} bytes`,
        );

        return {
          success: true,
          video_bytes: modalCall.video_bytes,
          logs: modalCall.logs,
          duration: modalCall.duration,
        };
      } else {
        console.error("[MODAL-CLIENT] ❌ Compilation failed:", modalCall.error);

        return {
          success: false,
          error: modalCall.error || "Unknown Modal compilation error",
          logs: modalCall.logs,
          duration: modalCall.duration,
        };
      }
    } catch (error) {
      console.error("[MODAL-CLIENT] ❌ Modal client error:", error);

      return {
        success: false,
        error: `Modal client error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Call Modal function via Python subprocess.
   *
   * In a production environment, you might want to:
   * 1. Use Modal's REST API directly
   * 2. Use a Node.js Modal SDK (if available)
   * 3. Create a dedicated microservice for Modal communication
   */
  private async callModalFunction(
    request: ModalCompilationRequest,
  ): Promise<ModalCompilationResult> {
    const { execSync } = await import("child_process");
    const fs = await import("fs");
    const path = await import("path");
    const os = await import("os");

    // Create temporary file for the Python code
    const tempDir = os.tmpdir();
    const tempCodeFile = path.join(tempDir, `modal_request_${Date.now()}.py`);
    const tempResultFile = path.join(
      tempDir,
      `modal_result_${Date.now()}.json`,
    );

    try {
      // Write Python code to temporary file
      fs.writeFileSync(tempCodeFile, request.python_code);

      // Create a Python script to call Modal
      const modalScript = `
import modal
import json
import base64
import sys

try:
    # Get the Modal function
    f = modal.Function.from_name("${this.appName}", "${this.functionName}")

    # Read the Python code
    with open("${tempCodeFile}", "r") as file:
        python_code = file.read()

    # Call the Modal function
    result = f.remote(
        python_code=python_code,
        class_name="${request.class_name || "Scene"}",
        quality="${request.quality || "low_quality"}"
    )

    # Encode video bytes as base64 for JSON serialization
    if result.get("success") and result.get("video_bytes"):
        result["video_bytes"] = base64.b64encode(result["video_bytes"]).decode('utf-8')

    # Write result to file
    with open("${tempResultFile}", "w") as file:
        json.dump(result, file)

    print("Modal function call completed successfully")

except Exception as e:
    error_result = {
        "success": False,
        "error": f"Modal function call failed: {str(e)}"
    }

    with open("${tempResultFile}", "w") as file:
        json.dump(error_result, file)

    print(f"Modal function call failed: {e}")
    sys.exit(1)
`;

      const tempScriptFile = path.join(
        tempDir,
        `modal_script_${Date.now()}.py`,
      );
      fs.writeFileSync(tempScriptFile, modalScript);

      // Execute the Modal script
      console.log("[MODAL-CLIENT] Calling Modal function...");

      const command = `python3 "${tempScriptFile}"`;
      execSync(command, {
        stdio: "pipe",
        timeout: 5 * 60 * 1000, // 5 minute timeout
        encoding: "utf8",
      });

      // Read the result
      const resultData = fs.readFileSync(tempResultFile, "utf8");
      const result = JSON.parse(resultData);

      // Decode video bytes from base64
      if (result.success && result.video_bytes) {
        const videoBuffer = Buffer.from(result.video_bytes, "base64");
        result.video_bytes = new Uint8Array(videoBuffer);
      }

      return result;
    } finally {
      // Clean up temporary files
      try {
        fs.unlinkSync(tempCodeFile);
        fs.unlinkSync(tempResultFile);
        if (
          fs.existsSync(path.join(tempDir, `modal_script_${Date.now()}.py`))
        ) {
          fs.unlinkSync(path.join(tempDir, `modal_script_${Date.now()}.py`));
        }
      } catch (cleanupError) {
        console.warn(
          "[MODAL-CLIENT] Warning: Failed to clean up temporary files:",
          cleanupError,
        );
      }
    }
  }

  /**
   * Check if Modal is available and the app is deployed.
   */
  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      const { execSync } = await import("child_process");

      // Simple Modal health check
      const healthScript = `
import modal
import json

try:
    # Try to get the health check function
    f = modal.Function.from_name("${this.appName}", "health_check")
    result = f.remote()

    print(json.dumps({"healthy": True, "modal_status": result}))

except Exception as e:
    print(json.dumps({"healthy": False, "error": str(e)}))
`;

      const tempDir = (await import("os")).tmpdir();
      const tempFile = (await import("path")).join(
        tempDir,
        `modal_health_${Date.now()}.py`,
      );

      (await import("fs")).writeFileSync(tempFile, healthScript);

      const output = execSync(`python3 "${tempFile}"`, {
        encoding: "utf8",
        timeout: 30000, // 30 second timeout
      });

      const result = JSON.parse(output.trim());

      // Clean up
      (await import("fs")).unlinkSync(tempFile);

      return result;
    } catch (error) {
      return {
        healthy: false,
        error: `Modal health check failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}

/**
 * Default Modal client instance.
 */
export const defaultModalClient = new ModalClient();

/**
 * Utility function to compile Manim animation using the default client.
 */
export async function compileAnimationWithModal(
  pythonCode: string,
  className: string = "Scene",
  quality: "low_quality" | "medium_quality" | "high_quality" = "low_quality",
): Promise<ModalCompilationResult> {
  return await defaultModalClient.compileAnimation({
    python_code: pythonCode,
    class_name: className,
    quality,
  });
}
