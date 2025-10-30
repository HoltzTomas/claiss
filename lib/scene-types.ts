export interface Scene {
  id: string;

  name: string;

  code: string;

  order: number;

  duration?: number;

  status: 'pending' | 'compiling' | 'compiled' | 'failed';

  videoUrl?: string;

  videoId?: string;

  error?: string;

  dependencies?: string[];

  sharedObjects?: string[];

  createdAt: Date;

  updatedAt: Date;
}

export interface Video {
  id: string;

  title: string;

  description?: string;

  scenes: Scene[];

  finalVideoUrl?: string;

  totalDuration?: number;

  status: 'draft' | 'compiling' | 'ready' | 'failed';

  createdAt: Date;

  updatedAt: Date;
}

export type SceneOperation =
  | { type: 'create'; scene: Partial<Scene>; position: number }
  | { type: 'modify'; sceneId: string; changes: Partial<Scene> }
  | { type: 'delete'; sceneId: string }
  | { type: 'reorder'; sceneId: string; newPosition: number }
  | { type: 'split'; sceneId: string; splitPoint: string };

export interface SceneSelectionResult {
  operations: SceneOperation[];

  reasoning: string;

  affectedScenes: string[];

  isMajorChange: boolean;
}

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

export interface SceneMetadata {
  name: string;

  code: string;

  startLine: number;

  endLine: number;

  createdObjects: string[];

  usedObjects: string[];
}

export interface VideoMergeRequest {
  videoId: string;

  sceneUrls: string[];

  transitions?: {
    from: number;
    to: number;
    type: 'none' | 'fade' | 'dissolve';
    duration: number;
  }[];

  quality?: 'low' | 'medium' | 'high';
}
