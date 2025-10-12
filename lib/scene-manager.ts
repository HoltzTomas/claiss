/**
 * Scene manager for handling scene storage and operations
 * Uses localStorage for now, can be upgraded to Vercel KV later
 */

import type { Scene, Video, SceneOperation, SceneMetadata } from './scene-types';
import { parseManimScenes, createStandaloneScene, detectSceneDependencies } from './scene-parser';

/**
 * Scene manager class for video/scene operations
 */
export class SceneManager {
  private storagePrefix = 'classia-scene-';

  /**
   * Create a new video from existing monolithic code
   */
  createVideoFromCode(
    code: string,
    title: string = 'Untitled Video'
  ): Video {
    const videoId = this.generateId();
    const sceneMetadata = parseManimScenes(code);
    const dependencies = detectSceneDependencies(sceneMetadata);

    const scenes: Scene[] = sceneMetadata.map((meta, index) => ({
      id: this.generateId(),
      name: meta.name,
      code: createStandaloneScene(meta.name, meta.code),
      order: index,
      status: 'pending',
      dependencies: dependencies.get(meta.name) || [],
      sharedObjects: meta.usedObjects,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    const video: Video = {
      id: videoId,
      title,
      scenes,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.saveVideo(video);
    return video;
  }

  /**
   * Get video by ID
   */
  getVideo(videoId: string): Video | null {
    try {
      const data = localStorage.getItem(`${this.storagePrefix}video-${videoId}`);
      if (!data) return null;

      const video = JSON.parse(data);
      // Convert date strings back to Date objects
      video.createdAt = new Date(video.createdAt);
      video.updatedAt = new Date(video.updatedAt);
      video.scenes = video.scenes.map((s: any) => ({
        ...s,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt)
      }));

      return video;
    } catch (error) {
      console.error('[SCENE-MANAGER] Error loading video:', error);
      return null;
    }
  }

  /**
   * Save video to storage
   */
  saveVideo(video: Video): void {
    try {
      video.updatedAt = new Date();
      localStorage.setItem(
        `${this.storagePrefix}video-${video.id}`,
        JSON.stringify(video)
      );

      // Also save as latest
      localStorage.setItem(
        `${this.storagePrefix}latest-video`,
        video.id
      );

      console.log(`[SCENE-MANAGER] Video saved: ${video.id}`);
    } catch (error) {
      console.error('[SCENE-MANAGER] Error saving video:', error);
    }
  }

  /**
   * Get the latest video
   */
  getLatestVideo(): Video | null {
    try {
      const latestId = localStorage.getItem(`${this.storagePrefix}latest-video`);
      if (!latestId) return null;

      return this.getVideo(latestId);
    } catch (error) {
      console.error('[SCENE-MANAGER] Error loading latest video:', error);
      return null;
    }
  }

  /**
   * Get a specific scene by ID
   */
  getScene(videoId: string, sceneId: string): Scene | null {
    const video = this.getVideo(videoId);
    if (!video) return null;

    return video.scenes.find(s => s.id === sceneId) || null;
  }

  /**
   * Apply scene operation to video
   */
  applyOperation(videoId: string, operation: SceneOperation): Video | null {
    const video = this.getVideo(videoId);
    if (!video) return null;

    switch (operation.type) {
      case 'create':
        return this.createScene(video, operation.scene, operation.position);

      case 'modify':
        return this.modifyScene(video, operation.sceneId, operation.changes);

      case 'delete':
        return this.deleteScene(video, operation.sceneId);

      case 'reorder':
        return this.reorderScene(video, operation.sceneId, operation.newPosition);

      case 'split':
        return this.splitScene(video, operation.sceneId, operation.splitPoint);

      default:
        console.error('[SCENE-MANAGER] Unknown operation type');
        return null;
    }
  }

  /**
   * Create a new scene in the video
   */
  private createScene(
    video: Video,
    sceneData: Partial<Scene>,
    position: number
  ): Video {
    const newScene: Scene = {
      id: this.generateId(),
      name: sceneData.name || 'New Scene',
      code: sceneData.code || this.getDefaultSceneCode(),
      order: position,
      status: 'pending',
      dependencies: sceneData.dependencies || [],
      sharedObjects: sceneData.sharedObjects || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...sceneData
    };

    // Insert at position and reorder others
    video.scenes.splice(position, 0, newScene);
    this.reorderScenes(video);

    this.saveVideo(video);
    return video;
  }

  /**
   * Modify an existing scene
   */
  private modifyScene(
    video: Video,
    sceneId: string,
    changes: Partial<Scene>
  ): Video {
    const sceneIndex = video.scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex === -1) return video;

    video.scenes[sceneIndex] = {
      ...video.scenes[sceneIndex],
      ...changes,
      updatedAt: new Date()
    };

    // Reset compilation status if code changed
    if (changes.code) {
      video.scenes[sceneIndex].status = 'pending';
      delete video.scenes[sceneIndex].videoUrl;
      delete video.scenes[sceneIndex].videoId;
    }

    this.saveVideo(video);
    return video;
  }

  /**
   * Delete a scene
   */
  private deleteScene(video: Video, sceneId: string): Video {
    video.scenes = video.scenes.filter(s => s.id !== sceneId);
    this.reorderScenes(video);

    this.saveVideo(video);
    return video;
  }

  /**
   * Reorder a scene
   */
  private reorderScene(
    video: Video,
    sceneId: string,
    newPosition: number
  ): Video {
    const sceneIndex = video.scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex === -1) return video;

    const [scene] = video.scenes.splice(sceneIndex, 1);
    video.scenes.splice(newPosition, 0, scene);
    this.reorderScenes(video);

    this.saveVideo(video);
    return video;
  }

  /**
   * Split a scene into two scenes at a point
   */
  private splitScene(
    video: Video,
    sceneId: string,
    splitPoint: string
  ): Video {
    const sceneIndex = video.scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex === -1) return video;

    const originalScene = video.scenes[sceneIndex];
    const lines = originalScene.code.split('\n');

    // Find split point (simplified - would need smarter logic)
    const splitIndex = lines.findIndex(line => line.includes(splitPoint));
    if (splitIndex === -1) return video;

    const firstHalf = lines.slice(0, splitIndex).join('\n');
    const secondHalf = lines.slice(splitIndex).join('\n');

    // Update first scene
    video.scenes[sceneIndex] = {
      ...originalScene,
      name: `${originalScene.name} - Part 1`,
      code: firstHalf,
      updatedAt: new Date(),
      status: 'pending'
    };

    // Create second scene
    const secondScene: Scene = {
      id: this.generateId(),
      name: `${originalScene.name} - Part 2`,
      code: secondHalf,
      order: sceneIndex + 1,
      status: 'pending',
      dependencies: originalScene.dependencies,
      sharedObjects: originalScene.sharedObjects,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    video.scenes.splice(sceneIndex + 1, 0, secondScene);
    this.reorderScenes(video);

    this.saveVideo(video);
    return video;
  }

  /**
   * Reorder all scenes by their position
   */
  private reorderScenes(video: Video): void {
    video.scenes.forEach((scene, index) => {
      scene.order = index;
    });
  }

  /**
   * Get default scene code template
   */
  private getDefaultSceneCode(): string {
    return `from manim import *

class NewScene(Scene):
    def construct(self):
        # Add your animation code here
        text = Text("New Scene")
        self.play(FadeIn(text))
        self.wait(1)
        self.play(FadeOut(text))
`;
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Update scene compilation status
   */
  updateSceneStatus(
    videoId: string,
    sceneId: string,
    status: Scene['status'],
    videoUrl?: string,
    videoId?: string,
    error?: string
  ): void {
    const video = this.getVideo(videoId);
    if (!video) return;

    const scene = video.scenes.find(s => s.id === sceneId);
    if (!scene) return;

    scene.status = status;
    scene.updatedAt = new Date();

    if (videoUrl) scene.videoUrl = videoUrl;
    if (videoId) scene.videoId = videoId;
    if (error) scene.error = error;

    this.saveVideo(video);
  }

  /**
   * Get scenes that need to be compiled
   */
  getPendingScenes(videoId: string): Scene[] {
    const video = this.getVideo(videoId);
    if (!video) return [];

    return video.scenes.filter(s => s.status === 'pending');
  }

  /**
   * Check if all scenes are compiled
   */
  areAllScenesCompiled(videoId: string): boolean {
    const video = this.getVideo(videoId);
    if (!video) return false;

    return video.scenes.every(s => s.status === 'compiled');
  }

  /**
   * Export video as monolithic code (for backward compatibility)
   */
  exportToMonolithicCode(videoId: string, className: string = 'Animation'): string {
    const video = this.getVideo(videoId);
    if (!video) return '';

    const sceneCodes = video.scenes
      .sort((a, b) => a.order - b.order)
      .map(scene => {
        // Extract just the construct body from scene code
        const lines = scene.code.split('\n');
        const constructStart = lines.findIndex(l => l.includes('def construct'));
        const body = lines.slice(constructStart + 1).join('\n');

        return `        # Section: ${scene.name}
        self.next_section("${scene.name}")
${body}`;
      });

    return `from manim import *

class ${className}(Scene):
    def construct(self):
${sceneCodes.join('\n\n')}
`;
  }
}

// Export singleton instance
export const sceneManager = new SceneManager();
