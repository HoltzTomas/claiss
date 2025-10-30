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

    this.modalEndpoint = `https://modal-labs--${appName.replace("_", "-")}-${functionName.replace("_", "-")}.modal.run`;
  }

  async compileAnimation(
    request: ModalCompilationRequest,
  ): Promise<ModalCompilationResult> {
    try {
      console.log("[MODAL-CLIENT] Starting remote compilation...");
      console.log(`[MODAL-CLIENT] Class: ${request.class_name || "Scene"}`);
      console.log(
        `[MODAL-CLIENT] Quality: ${request.quality || "low_quality"}`,
      );

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

  private async callModalFunction(
    request: ModalCompilationRequest,
  ): Promise<ModalCompilationResult> {
    const { execSync } = await import("child_process");
    const fs = await import("fs");
    const path = await import("path");
    const os = await import("os");

    const tempDir = os.tmpdir();
    const tempCodeFile = path.join(tempDir, `modal_request_${Date.now()}.py`);
    const tempResultFile = path.join(
      tempDir,
      `modal_result_${Date.now()}.json`,
    );

    try {
      fs.writeFileSync(tempCodeFile, request.python_code);

      const modalScript = `
import modal
import json
import base64
import sys

try:
    f = modal.Function.from_name("${this.appName}", "${this.functionName}")

    with open("${tempCodeFile}", "r") as file:
        python_code = file.read()

    result = f.remote(
        python_code=python_code,
        class_name="${request.class_name || "Scene"}",
        quality="${request.quality || "low_quality"}"
    )

    if result.get("success") and result.get("video_bytes"):
        result["video_bytes"] = base64.b64encode(result["video_bytes"]).decode('utf-8')

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

      console.log("[MODAL-CLIENT] Calling Modal function...");

      const command = `python3 "${tempScriptFile}"`;
      execSync(command, {
        stdio: "pipe",
        timeout: 5 * 60 * 1000, 
        encoding: "utf8",
      });

      const resultData = fs.readFileSync(tempResultFile, "utf8");
      const result = JSON.parse(resultData);

      if (result.success && result.video_bytes) {
        const videoBuffer = Buffer.from(result.video_bytes, "base64");
        result.video_bytes = new Uint8Array(videoBuffer);
      }

      return result;
    } finally {
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

  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      const { execSync } = await import("child_process");

      const healthScript = `
import modal
import json

try:
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
        timeout: 30000,
      });

      const result = JSON.parse(output.trim());

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

export const defaultModalClient = new ModalClient();

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
