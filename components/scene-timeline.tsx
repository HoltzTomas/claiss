"use client";

import React, { useState } from 'react';
import { Play, Edit, Trash2, Plus, GripVertical, Clock, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import type { Scene } from '@/lib/scene-types';

interface SceneTimelineProps {
  scenes: Scene[];
  onSceneClick?: (scene: Scene) => void;
  onSceneEdit?: (scene: Scene) => void;
  onSceneDelete?: (scene: Scene) => void;
  onSceneReorder?: (sceneId: string, newPosition: number) => void;
  onAddScene?: (position: number) => void;
  currentSceneId?: string;
  className?: string;
}

export function SceneTimeline({
  scenes,
  onSceneClick,
  onSceneEdit,
  onSceneDelete,
  onSceneReorder,
  onAddScene,
  currentSceneId,
  className = ''
}: SceneTimelineProps) {
  const [draggedScene, setDraggedScene] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const getStatusIcon = (status: Scene['status']) => {
    switch (status) {
      case 'compiled':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'compiling':
        return <Loader className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getStatusColor = (status: Scene['status']) => {
    switch (status) {
      case 'compiled':
        return 'border-green-500/50';
      case 'compiling':
        return 'border-blue-500/50';
      case 'failed':
        return 'border-red-500/50';
      default:
        return 'border-yellow-500/50';
    }
  };

  const handleDragStart = (e: React.DragEvent, sceneId: string) => {
    setDraggedScene(sceneId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedScene && onSceneReorder) {
      onSceneReorder(draggedScene, dropIndex);
    }

    setDraggedScene(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedScene(null);
    setDragOverIndex(null);
  };

  const sortedScenes = [...scenes].sort((a, b) => a.order - b.order);
  const totalDuration = sortedScenes.reduce((sum, s) => sum + (s.duration || 0), 0);

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Timeline Header */}
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold">Scene Timeline</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{sortedScenes.length} scenes</span>
            {totalDuration > 0 && (
              <>
                <span>•</span>
                <Clock className="w-3 h-3" />
                <span>{Math.round(totalDuration)}s</span>
              </>
            )}
          </div>
        </div>

        {onAddScene && (
          <button
            onClick={() => onAddScene(sortedScenes.length)}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded-md hover:bg-primary/10 text-primary transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Scene
          </button>
        )}
      </div>

      {/* Scene List */}
      <div className="flex-1 overflow-y-auto">
        {sortedScenes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center mb-3">
              <Play className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No scenes yet</p>
            {onAddScene && (
              <button
                onClick={() => onAddScene(0)}
                className="mt-3 text-xs text-primary hover:underline"
              >
                Create your first scene
              </button>
            )}
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {sortedScenes.map((scene, index) => (
              <div
                key={scene.id}
                draggable={!!onSceneReorder}
                onDragStart={(e) => handleDragStart(e, scene.id)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`
                  relative group rounded-lg border-2 transition-all
                  ${currentSceneId === scene.id ? 'border-primary bg-primary/5' : getStatusColor(scene.status)}
                  ${draggedScene === scene.id ? 'opacity-50' : ''}
                  ${dragOverIndex === index ? 'mt-8' : ''}
                  hover:border-primary/50 cursor-pointer
                `}
                onClick={() => onSceneClick?.(scene)}
              >
                {/* Scene Card */}
                <div className="p-3 flex items-center gap-3">
                  {/* Drag Handle */}
                  {onSceneReorder && (
                    <div className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}

                  {/* Scene Number */}
                  <div className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold">{index + 1}</span>
                  </div>

                  {/* Scene Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium truncate">{scene.name}</h4>
                      {getStatusIcon(scene.status)}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {scene.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {scene.duration}s
                        </span>
                      )}
                      {scene.status === 'failed' && scene.error && (
                        <span className="text-red-400 truncate" title={scene.error}>
                          {scene.error}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onSceneEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSceneEdit(scene);
                        }}
                        className="p-1.5 rounded-md hover:bg-primary/10 text-primary transition-colors"
                        title="Edit scene"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {onSceneDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSceneDelete(scene);
                        }}
                        className="p-1.5 rounded-md hover:bg-red-500/10 text-red-400 transition-colors"
                        title="Delete scene"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar for Compiling */}
                {scene.status === 'compiling' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/20 rounded-b-lg overflow-hidden">
                    <div className="h-full bg-blue-500 animate-pulse" style={{ width: '60%' }} />
                  </div>
                )}
              </div>
            ))}

            {/* Add Scene Button at End */}
            {onAddScene && (
              <button
                onClick={() => onAddScene(sortedScenes.length)}
                className="w-full py-6 border-2 border-dashed border-border/50 rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all group"
              >
                <div className="flex items-center justify-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Add Scene</span>
                </div>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Timeline Footer - Compilation Status */}
      {sortedScenes.length > 0 && (
        <div className="px-4 py-3 border-t border-border/50">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">Status:</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  {sortedScenes.filter(s => s.status === 'compiled').length}
                </span>
                <span className="flex items-center gap-1">
                  <Loader className="w-3 h-3 text-blue-400" />
                  {sortedScenes.filter(s => s.status === 'compiling').length}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-yellow-400" />
                  {sortedScenes.filter(s => s.status === 'pending').length}
                </span>
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-red-400" />
                  {sortedScenes.filter(s => s.status === 'failed').length}
                </span>
              </div>
            </div>

            {/* Progress Percentage */}
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-muted/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{
                    width: `${(sortedScenes.filter(s => s.status === 'compiled').length / sortedScenes.length) * 100}%`
                  }}
                />
              </div>
              <span className="text-muted-foreground">
                {Math.round((sortedScenes.filter(s => s.status === 'compiled').length / sortedScenes.length) * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
