import { tool } from "ai";
import { z } from "zod";
import { compileManimCode } from "./manim-compiler";

export const writeCodeTool = tool({
  description:
    "Write or update Python code. The code will be returned to the frontend for localStorage storage with video ID association.",
  inputSchema: z.object({
    code: z.string().describe("The complete Python code to write"),
    description: z
      .string()
      .nullable()
      .describe("Optional description of what the code does"),
  }),
  execute: async ({ code, description }) => {
    try {
      console.log(
        `[CODE-TOOL] Processing code for frontend storage: ${code.length} characters`,
      );

      // Try to compile Manim code if it's valid (direct validation)
      if (code.includes("from manim import") || code.includes("manim")) {
        // Extract class name directly from the raw code
        const classMatch = code.match(/class\s+(\w+)\s*\(/);
        const className = classMatch ? classMatch[1] : "Scene";

        console.log(`[CODE-TOOL] 🎬 Found Manim code with class: ${className}`);
        console.log("[CODE-TOOL] Starting compilation...");

        try {
          const compilationResult = await compileManimCode(code, className);

          if (compilationResult.success) {
            console.log(`[CODE-TOOL] 🎉 Animation compiled successfully!`);
            console.log(
              `[CODE-TOOL]   - Video ID: ${compilationResult.videoId}`,
            );
            console.log(
              `[CODE-TOOL]   - Video URL: ${compilationResult.videoUrl}`,
            );

            return {
              success: true,
              message: `Code processed and video compiled successfully.${description ? ` Description: ${description}` : ""}`,
              code: code, // Return code to frontend for localStorage storage
              codeLength: code.length,
              videoGenerated: true,
              videoId: compilationResult.videoId,
              videoUrl: compilationResult.videoUrl,
            };
          } else {
            console.error(
              `[CODE-TOOL] ❌ Animation compilation failed:`,
              compilationResult.error,
            );

            return {
              success: true,
              message: `Code processed successfully but video compilation failed: ${compilationResult.error}.${description ? ` Description: ${description}` : ""}`,
              code: code, // Return code to frontend for localStorage storage
              codeLength: code.length,
              videoGenerated: false,
              error: compilationResult.error,
            };
          }
        } catch (error) {
          console.error(`[CODE-TOOL] ❌ Unexpected compilation error:`, error);

          return {
            success: true,
            message: `Code processed successfully but unexpected compilation error occurred.${description ? ` Description: ${description}` : ""}`,
            code: code, // Return code to frontend for localStorage storage
            codeLength: code.length,
            videoGenerated: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      } else {
        console.log("[CODE-TOOL] ℹ️  Not Manim code, skipping compilation");

        return {
          success: true,
          message: `Code processed successfully (non-Manim code).${description ? ` Description: ${description}` : ""}`,
          code: code, // Return code to frontend for localStorage storage
          codeLength: code.length,
          videoGenerated: false,
        };
      }
    } catch (error) {
      console.error("[CODE-TOOL] ❌ Error writing code:", error);

      return {
        success: false,
        message: `Failed to process code: ${error instanceof Error ? error.message : "Unknown error"}`,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

export const readCodeTool = tool({
  description:
    "Read the current Python code that was provided by the frontend. Use this before making modifications to existing code.",
  inputSchema: z.object({
    code: z
      .string()
      .optional()
      .describe("The current code provided by the frontend from localStorage"),
  }),
  execute: async ({ code }) => {
    try {
      if (code && code.trim()) {
        console.log(
          `[CODE-TOOL] 📖 Received existing code from frontend: ${code.length} characters`,
        );

        return {
          success: true,
          hasCode: true,
          code: code,
          codeLength: code.length,
        };
      } else {
        console.log("[CODE-TOOL] 📖 No existing code provided by frontend");

        return {
          success: true,
          hasCode: false,
          message:
            "No existing code provided by frontend. This will be a new code creation.",
        };
      }
    } catch (error) {
      console.error(
        "[CODE-TOOL] ❌ Error processing code from frontend:",
        error,
      );

      return {
        success: false,
        hasCode: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
