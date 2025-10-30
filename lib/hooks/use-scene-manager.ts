"use client";

import { useState, useEffect, useCallback } from 'react';
import { sceneManager } from '@/lib/scene-manager';
import type { Video, Scene, SceneOperation } from '@/lib/scene-types';

export function useSceneManager(videoId?: string) {
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVideo = useCallback(async (id?: string) => {
    setLoading(true);
    setError(null);

    try {
      const loadedVideo = id
        ? sceneManager.getVideo(id)
        : sceneManager.getLatestVideo();

      setVideo(loadedVideo);
      return loadedVideo;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load video';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createVideoFromCode = useCallback((code: string, title: string) => {
    try {
      const newVideo = sceneManager.createVideoFromCode(code, title);
      setVideo(newVideo);
      return newVideo;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create video';
      setError(errorMsg);
      return null;
    }
  }, []);

  const applyOperation = useCallback((operation: SceneOperation) => {
    if (!video) {
      setError('No video loaded');
      return null;
    }

    try {
      const updatedVideo = sceneManager.applyOperation(video.id, operation);
      setVideo(updatedVideo);
      return updatedVideo;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to apply operation';
      setError(errorMsg);
      return null;
    }
  }, [video]);

  const updateScene = useCallback((sceneId: string, changes: Partial<Scene>) => {
    return applyOperation({
      type: 'modify',
      sceneId,
      changes
    });
  }, [applyOperation]);

  const deleteScene = useCallback((sceneId: string) => {
    return applyOperation({
      type: 'delete',
      sceneId
    });
  }, [applyOperation]);

  const reorderScene = useCallback((sceneId: string, newPosition: number) => {
    return applyOperation({
      type: 'reorder',
      sceneId,
      newPosition
    });
  }, [applyOperation]);

  const createScene = useCallback((sceneData: Partial<Scene>, position: number) => {
    if (!video) {
      const newVideo = sceneManager.getOrCreateVideo('My Video');
      setVideo(newVideo);

      const updatedVideo = sceneManager.applyOperation(newVideo.id, {
        type: 'create',
        scene: sceneData,
        position
      });

      setVideo(updatedVideo);
      return updatedVideo;
    }

    return applyOperation({
      type: 'create',
      scene: sceneData,
      position
    });
  }, [video, applyOperation]);

  const updateSceneStatus = useCallback((
    sceneId: string,
    status: Scene['status'],
    videoUrl?: string,
    videoIdStr?: string,
    errorMsg?: string
  ) => {
    if (!video) return;

    sceneManager.updateSceneStatus(video.id, sceneId, status, videoUrl, errorMsg);

    if (videoIdStr) {
      const scene = video.scenes.find(s => s.id === sceneId);
      if (scene) {
        scene.videoId = videoIdStr;
        sceneManager.saveVideo(video);
      }
    }

    loadVideo(video.id);
  }, [video, loadVideo]);

  const getCompilationProgress = useCallback(() => {
    if (!video) return { total: 0, compiled: 0, pending: 0, failed: 0, percentage: 0 };

    const total = video.scenes.length;
    const compiled = video.scenes.filter(s => s.status === 'compiled').length;
    const pending = video.scenes.filter(s => s.status === 'pending').length;
    const failed = video.scenes.filter(s => s.status === 'failed').length;
    const percentage = total > 0 ? (compiled / total) * 100 : 0;

    return { total, compiled, pending, failed, percentage };
  }, [video]);

  const isReadyToMerge = useCallback(() => {
    if (!video) return false;
    return sceneManager.areAllScenesCompiled(video.id);
  }, [video]);

  const updateFinalVideo = useCallback((finalVideoUrl: string, totalDuration?: number) => {
    if (!video) return;

    video.finalVideoUrl = finalVideoUrl;
    video.status = 'ready';
    if (totalDuration) {
      video.totalDuration = totalDuration;
    }
    sceneManager.saveVideo(video);
    setVideo({ ...video });
  }, [video]);

  useEffect(() => {
    loadVideo(videoId);
  }, [videoId, loadVideo]);

  return {
    video,
    loading,
    error,
    loadVideo,
    createVideoFromCode,
    updateScene,
    deleteScene,
    reorderScene,
    createScene,
    updateSceneStatus,
    getCompilationProgress,
    isReadyToMerge,
    updateFinalVideo,
  };
}
