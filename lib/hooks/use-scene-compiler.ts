"use client";

import { useState, useCallback } from 'react';
import type { Scene } from '@/lib/scene-types';

export function useSceneCompiler() {
  const [compiling, setCompiling] = useState<Set<string>>(new Set());
  const [compilationErrors, setCompilationErrors] = useState<Map<string, string>>(new Map());

  // Compile single scene
  const compileScene = useCallback(async (scene: Scene) => {
    setCompiling(prev => new Set(prev).add(scene.id));
    setCompilationErrors(prev => {
      const next = new Map(prev);
      next.delete(scene.id);
      return next;
    });

    try {
      const response = await fetch('/api/scene-compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'single',
          scene
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.result?.error || 'Compilation failed');
      }

      return data.result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setCompilationErrors(prev => new Map(prev).set(scene.id, errorMsg));
      throw error;
    } finally {
      setCompiling(prev => {
        const next = new Set(prev);
        next.delete(scene.id);
        return next;
      });
    }
  }, []);

  // Compile multiple scenes
  const compileScenes = useCallback(async (scenes: Scene[]) => {
    const sceneIds = new Set(scenes.map(s => s.id));
    setCompiling(prev => new Set([...prev, ...sceneIds]));

    // Clear errors for these scenes
    setCompilationErrors(prev => {
      const next = new Map(prev);
      sceneIds.forEach(id => next.delete(id));
      return next;
    });

    try {
      const response = await fetch('/api/scene-compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'multiple',
          scenes
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error('Batch compilation failed');
      }

      // Track errors for failed scenes
      data.results.forEach((result: any) => {
        if (!result.success) {
          setCompilationErrors(prev =>
            new Map(prev).set(result.sceneId, result.error || 'Compilation failed')
          );
        }
      });

      return data.results;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      sceneIds.forEach(id => {
        setCompilationErrors(prev => new Map(prev).set(id, errorMsg));
      });
      throw error;
    } finally {
      setCompiling(prev => {
        const next = new Set(prev);
        sceneIds.forEach(id => next.delete(id));
        return next;
      });
    }
  }, []);

  // Check if scene is compiling
  const isCompiling = useCallback((sceneId: string) => {
    return compiling.has(sceneId);
  }, [compiling]);

  // Get compilation error for scene
  const getError = useCallback((sceneId: string) => {
    return compilationErrors.get(sceneId);
  }, [compilationErrors]);

  // Clear error for scene
  const clearError = useCallback((sceneId: string) => {
    setCompilationErrors(prev => {
      const next = new Map(prev);
      next.delete(sceneId);
      return next;
    });
  }, []);

  return {
    compileScene,
    compileScenes,
    isCompiling,
    getError,
    clearError,
    compilingCount: compiling.size,
  };
}
