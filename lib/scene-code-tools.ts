import { tool } from "ai";
import { z } from "zod";
import { compileManimCode } from "./manim-compiler";
import type { Scene, SceneOperation } from "./scene-types";

export const writeSceneCodeTool = tool({
  description:
    "Write or update code for a specific scene in the video. Use this for scene-based editing instead of rewriting the entire video code.",
  inputSchema: z.object({
    sceneId: z
      .string()
      .optional()
      .describe("ID of the scene to update (omit to create new scene)"),
    sceneName: z.string().describe("Name/title of the scene"),
    code: z
      .string()
      .describe("The complete Python code for this scene (standalone class)"),
    position: z
      .number()
      .optional()
      .describe("Position in video (0-based index, only for new scenes)"),
    description: z
      .string()
      .optional()
      .describe("Optional description of what this scene does"),
  }),
  execute: async ({ sceneId, sceneName, code, position, description }) => {
    try {
      console.log(
        `[SCENE-CODE-TOOL] ${sceneId ? "Updating" : "Creating"} scene: ${sceneName}`
      );

      if (!code.includes("from manim import") && !code.includes("manim")) {
        return {
          success: false,
          message: "Invalid Manim code: missing manim imports",
          error: "Code must include 'from manim import *'",
        };
      }

      const classMatch = code.match(/class\s+(\w+)\s*\(/);
      const className = classMatch ? classMatch[1] : "Scene";

      console.log(`[SCENE-CODE-TOOL] Scene class: ${className}`);

      try {
        const compilationResult = await compileManimCode(code, className);

        if (compilationResult.success) {
          console.log(`[SCENE-CODE-TOOL] ✅ Scene compiled successfully!`);

          return {
            success: true,
            message: `Scene "${sceneName}" ${sceneId ? "updated" : "created"} and compiled successfully.${description ? ` ${description}` : ""}`,
            sceneId: sceneId || `scene-${Date.now()}`,
            sceneName,
            code,
            position: position ?? 0,
            videoGenerated: true,
            videoId: compilationResult.videoId,
            videoUrl: compilationResult.videoUrl,
            isNewScene: !sceneId,
          };
        } else {
          console.error(
            `[SCENE-CODE-TOOL] ❌ Scene compilation failed:`,
            compilationResult.error
          );

          return {
            success: true,
            message: `Scene code processed but compilation failed: ${compilationResult.error}`,
            sceneId: sceneId || `scene-${Date.now()}`,
            sceneName,
            code,
            position: position ?? 0,
            videoGenerated: false,
            error: compilationResult.error,
            isNewScene: !sceneId,
          };
        }
      } catch (error) {
        console.error(`[SCENE-CODE-TOOL] ❌ Compilation error:`, error);

        return {
          success: true,
          message: `Scene code processed but unexpected compilation error occurred.`,
          sceneId: sceneId || `scene-${Date.now()}`,
          sceneName,
          code,
          position: position ?? 0,
          videoGenerated: false,
          error: error instanceof Error ? error.message : "Unknown error",
          isNewScene: !sceneId,
        };
      }
    } catch (error) {
      console.error("[SCENE-CODE-TOOL] ❌ Error processing scene:", error);

      return {
        success: false,
        message: `Failed to process scene: ${error instanceof Error ? error.message : "Unknown error"}`,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

export const readScenesTool = tool({
  description:
    "Read information about existing scenes in the video. Use this to understand the video structure before making edits.",
  inputSchema: z.object({
    videoId: z
      .string()
      .optional()
      .describe("Video ID (omit to get latest video)"),
    sceneIds: z
      .array(z.string())
      .optional()
      .describe("Specific scene IDs to read (omit to get all scenes)"),
    includeCode: z
      .boolean()
      .optional()
      .default(false)
      .describe("Whether to include full scene code (set to false for overview)"),
  }),
  execute: async ({ videoId, sceneIds, includeCode }) => {
    try {
      console.log(
        `[SCENE-CODE-TOOL] 📖 Reading scenes from video ${videoId || "latest"}`
      );

      const mockScenes = [
        {
          id: "scene-1",
          name: "Introduction",
          order: 0,
          status: "compiled",
          duration: 5,
          hasCode: true,
        },
        {
          id: "scene-2",
          name: "Main Content",
          order: 1,
          status: "compiled",
          duration: 10,
          hasCode: true,
        },
      ];

      // Filter scenes if specific IDs requested
      const filteredScenes = sceneIds
        ? mockScenes.filter((s) => sceneIds.includes(s.id))
        : mockScenes;

      return {
        success: true,
        videoId: videoId || "latest",
        scenes: filteredScenes,
        totalScenes: filteredScenes.length,
        message: `Found ${filteredScenes.length} scene(s)`,
      };
    } catch (error) {
      console.error("[SCENE-CODE-TOOL] ❌ Error reading scenes:", error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        scenes: [],
      };
    }
  },
});

export const sceneOperationTool = tool({
  description:
    "Perform operations on scenes: delete, reorder, or split. Use this for structural changes to the video.",
  inputSchema: z.object({
    operation: z
      .enum(["delete", "reorder", "split"])
      .describe("The operation to perform"),
    sceneId: z.string().describe("ID of the scene to operate on"),
    newPosition: z
      .number()
      .optional()
      .describe("New position for reorder operation (0-based index)"),
    splitPoint: z
      .string()
      .optional()
      .describe("Point to split scene at (code snippet or line description)"),
  }),
  execute: async ({ operation, sceneId, newPosition, splitPoint }) => {
    try {
      console.log(
        `[SCENE-CODE-TOOL] Performing ${operation} on scene ${sceneId}`
      );

      switch (operation) {
        case "delete":
          return {
            success: true,
            message: `Scene ${sceneId} marked for deletion`,
            operation: "delete",
            sceneId,
          };

        case "reorder":
          if (newPosition === undefined) {
            return {
              success: false,
              error: "newPosition is required for reorder operation",
            };
          }
          return {
            success: true,
            message: `Scene ${sceneId} will be moved to position ${newPosition}`,
            operation: "reorder",
            sceneId,
            newPosition,
          };

        case "split":
          if (!splitPoint) {
            return {
              success: false,
              error: "splitPoint is required for split operation",
            };
          }
          return {
            success: true,
            message: `Scene ${sceneId} will be split at: ${splitPoint}`,
            operation: "split",
            sceneId,
            splitPoint,
          };

        default:
          return {
            success: false,
            error: `Unknown operation: ${operation}`,
          };
      }
    } catch (error) {
      console.error("[SCENE-CODE-TOOL] ❌ Error in scene operation:", error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

export const analyzeSceneTargetsTool = tool({
  description:
    "Analyze a user's edit request and determine which scenes need to be modified. Use this FIRST before making any scene edits.",
  inputSchema: z.object({
    userRequest: z
      .string()
      .describe("The user's edit request in natural language"),
    videoStructure: z
      .string()
      .describe("JSON string describing the current video scene structure"),
  }),
  execute: async ({ userRequest, videoStructure }) => {
    try {
      console.log(`[SCENE-CODE-TOOL] 🎯 Analyzing targets for: ${userRequest}`);

      // Parse video structure
      let scenes: any[] = [];
      try {
        const structure = JSON.parse(videoStructure);
        scenes = structure.scenes || [];
      } catch (e) {
        console.error("[SCENE-CODE-TOOL] Failed to parse video structure");
      }

      const keywords = userRequest.toLowerCase();
      const targetScenes: string[] = [];

      for (const scene of scenes) {
        const sceneName = scene.name.toLowerCase();

        // Check if request mentions this scene
        if (keywords.includes(sceneName)) {
          targetScenes.push(scene.id);
        }

        // Check for operations that affect specific content
        if (
          keywords.includes("intro") &&
          sceneName.includes("intro")
        ) {
          targetScenes.push(scene.id);
        }
        if (
          keywords.includes("conclusion") &&
          sceneName.includes("conclu")
        ) {
          targetScenes.push(scene.id);
        }
      }

      // If no specific scenes identified, analyze request type
      let recommendation = "modify";
      if (keywords.includes("add") || keywords.includes("new")) {
        recommendation = "create";
      } else if (keywords.includes("remove") || keywords.includes("delete")) {
        recommendation = "delete";
      }

      return {
        success: true,
        targetScenes:
          targetScenes.length > 0 ? targetScenes : ["all"], // 'all' means affects entire video
        recommendation,
        reasoning:
          targetScenes.length > 0
            ? `Identified ${targetScenes.length} scene(s) that match the request`
            : "Request may affect multiple scenes or require new scene",
        shouldCreateNew: recommendation === "create",
        shouldModifyExisting: recommendation === "modify",
      };
    } catch (error) {
      console.error("[SCENE-CODE-TOOL] ❌ Error analyzing targets:", error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        targetScenes: [],
      };
    }
  },
});

export const sceneTools = {
  writeScene: writeSceneCodeTool,
  readScenes: readScenesTool,
  sceneOperation: sceneOperationTool,
  analyzeTargets: analyzeSceneTargetsTool,
};
