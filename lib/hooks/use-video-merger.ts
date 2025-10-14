"use client";

import { useState, useCallback } from 'react';
import type { Scene } from '@/lib/scene-types';

export interface MergeOptions {
  quality?: 'low' | 'medium' | 'high';
  addTransitions?: boolean;
  transitionDuration?: number;
}

export function useVideoMerger() {
  const [merging, setMerging] = useState(false);
  const [mergeProgress, setMergeProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Merge scenes into final video
  const mergeScenes = useCallback(async (
    videoIdOrScenes: string | Scene[],
    scenesOrOptions?: Scene[] | MergeOptions,
    optionsParam?: MergeOptions
  ) => {
    setMerging(true);
    setMergeProgress(0);
    setError(null);

    try {
      // Parse parameters - support both old and new signatures
      let videoId: string | undefined;
      let scenes: Scene[] | undefined;
      let options: MergeOptions | undefined;

      if (typeof videoIdOrScenes === 'string') {
        // Old signature: mergeScenes(videoId, scenes?, options?)
        videoId = videoIdOrScenes;
        if (Array.isArray(scenesOrOptions)) {
          scenes = scenesOrOptions;
          options = optionsParam;
        } else {
          options = scenesOrOptions;
        }
      } else {
        // New signature: mergeScenes(scenes, options?)
        scenes = videoIdOrScenes;
        options = scenesOrOptions as MergeOptions;
      }

      // Must provide scenes array
      if (!scenes || !Array.isArray(scenes)) {
        throw new Error('Scenes array is required');
      }

      const response = await fetch('/api/video-merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          scenes,
          options
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Merge failed');
      }

      setMergeProgress(100);
      return {
        videoUrl: data.videoUrl,
        videoId: data.videoId,
        duration: data.mergeTime
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      throw err;
    } finally {
      setMerging(false);
    }
  }, []);

  // Check merge readiness
  const checkMergeReadiness = useCallback(async (videoId: string) => {
    try {
      const response = await fetch(`/api/video-merge?videoId=${videoId}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to check merge readiness');
      }

      return {
        readyToMerge: data.readyToMerge,
        validation: data.validation,
        scenes: data.scenes
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return null;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    mergeScenes,
    checkMergeReadiness,
    merging,
    mergeProgress,
    error,
    clearError,
  };
}
