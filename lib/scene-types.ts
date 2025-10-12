/**
 * Core data types for scene-based video architecture
 */

/**
 * Represents a single scene in a Manim animation
 */
export interface Scene {
  /** Unique identifier for the scene */
  id: string;

  /** Human-readable name of the scene */
  name: string;

  /** The Python code for this scene (standalone class) */
  code: string;

  /** Position in the video sequence (0-based) */
  order: number;

  /** Estimated duration in seconds (optional) */
  duration?: number;

  /** Compilation status */
  status: 'pending' | 'compiling' | 'compiled' | 'failed';

  /** URL to the compiled scene video (if compiled) */
  videoUrl?: string;

  /** Video ID from Vercel Blob (if compiled) */
  videoId?: string;

  /** Error message if compilation failed */
  error?: string;

  /** Scene dependencies (IDs of scenes this depends on) */
  dependencies?: string[];

  /** Shared variables/objects this scene uses */
  sharedObjects?: string[];

  /** Timestamp when scene was created */
  createdAt: Date;

  /** Timestamp when scene was last modified */
  updatedAt: Date;
}

/**
 * Represents a complete video project with multiple scenes
 */
export interface Video {
  /** Unique identifier for the video */
  id: string;

  /** Title/name of the video */
  title: string;

  /** Description of the video content */
  description?: string;

  /** Array of scenes in this video */
  scenes: Scene[];

  /** URL to the final compiled video (all scenes merged) */
  finalVideoUrl?: string;

  /** Total duration in seconds (sum of all scenes) */
  totalDuration?: number;

  /** Overall compilation status */
  status: 'draft' | 'compiling' | 'ready' | 'failed';

  /** Timestamp when video was created */
  createdAt: Date;

  /** Timestamp when video was last modified */
  updatedAt: Date;
}

/**
 * Scene operation types for editing
 */
export type SceneOperation =
  | { type: 'create'; scene: Partial<Scene>; position: number }
  | { type: 'modify'; sceneId: string; changes: Partial<Scene> }
  | { type: 'delete'; sceneId: string }
  | { type: 'reorder'; sceneId: string; newPosition: number }
  | { type: 'split'; sceneId: string; splitPoint: string };

/**
 * Result from scene selection agent
 */
export interface SceneSelectionResult {
  /** The operation(s) to perform */
  operations: SceneOperation[];

  /** Reasoning for the selection */
  reasoning: string;

  /** Scene IDs that will be affected */
  affectedScenes: string[];

  /** Whether this is a major restructuring */
  isMajorChange: boolean;
}

/**
 * Scene compilation result
 */
export interface SceneCompilationResult {
  success: boolean;
  sceneId: string;
  videoUrl?: string;
  videoId?: string;
  videoBytes?: Uint8Array;
  duration?: number;
  error?: string;
  logs?: string;
}

/**
 * Scene metadata extracted from Manim code
 */
export interface SceneMetadata {
  /** Scene name extracted from next_section() call */
  name: string;

  /** The Python code for this section */
  code: string;

  /** Line number where scene starts */
  startLine: number;

  /** Line number where scene ends */
  endLine: number;

  /** Objects created in this scene */
  createdObjects: string[];

  /** Objects used from previous scenes */
  usedObjects: string[];
}

/**
 * Video merge request for combining scenes
 */
export interface VideoMergeRequest {
  /** Video ID this merge is for */
  videoId: string;

  /** Scene video URLs in order */
  sceneUrls: string[];

  /** Optional transition effects between scenes */
  transitions?: {
    from: number;
    to: number;
    type: 'none' | 'fade' | 'dissolve';
    duration: number;
  }[];

  /** Output quality */
  quality?: 'low' | 'medium' | 'high';
}
