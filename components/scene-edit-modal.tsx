"use client";

import React, { useState, useEffect } from 'react';
import { X, Save, Code, Eye, Loader, AlertCircle } from 'lucide-react';
import type { Scene } from '@/lib/scene-types';

interface SceneEditModalProps {
  scene: Scene;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedScene: Partial<Scene>) => Promise<void>;
}

export function SceneEditModal({ scene, isOpen, onClose, onSave }: SceneEditModalProps) {
  const [sceneName, setSceneName] = useState(scene.name);
  const [sceneCode, setSceneCode] = useState(scene.code);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    if (isOpen) {
      setSceneName(scene.name);
      setSceneCode(scene.code);
      setError(null);
    }
  }, [isOpen, scene]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      await onSave({
        name: sceneName,
        code: sceneCode
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save scene');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-4xl h-[80vh] bg-background border border-border/50 rounded-lg shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex-1">
            <input
              type="text"
              value={sceneName}
              onChange={(e) => setSceneName(e.target.value)}
              className="text-lg font-semibold bg-transparent border-none outline-none focus:ring-0 w-full"
              placeholder="Scene name..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Scene {scene.order + 1} • {scene.status}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-muted/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-4 pt-4 border-b border-border/50">
          <button
            onClick={() => setActiveTab('edit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-all ${
              activeTab === 'edit'
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Code className="w-4 h-4" />
            Edit Code
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-all ${
              activeTab === 'preview'
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'edit' ? (
            <textarea
              value={sceneCode}
              onChange={(e) => setSceneCode(e.target.value)}
              className="w-full h-full p-4 bg-muted/20 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Enter Manim code..."
              spellCheck={false}
            />
          ) : (
            <div className="h-full p-4 overflow-auto">
              <pre className="text-sm font-mono text-foreground/90 whitespace-pre-wrap">
                {sceneCode}
              </pre>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-4 py-3 bg-red-500/10 border-t border-red-500/20">
            <div className="flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border/50">
          <div className="text-xs text-muted-foreground">
            {sceneCode.length} characters • Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Esc</kbd> to close
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md hover:bg-muted/50 transition-colors"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !sceneName.trim() || !sceneCode.trim()}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Scene
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
