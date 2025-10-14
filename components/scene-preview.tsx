"use client";

import React from 'react';
import { Play, Pause, RotateCcw, Maximize2, Loader } from 'lucide-react';
import type { Scene } from '@/lib/scene-types';

interface ScenePreviewProps {
  scene: Scene;
  autoPlay?: boolean;
  showControls?: boolean;
  className?: string;
  onVideoEnd?: () => void;
}

export function ScenePreview({
  scene,
  autoPlay = false,
  showControls = true,
  className = '',
  onVideoEnd
}: ScenePreviewProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  React.useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;

      const handleTimeUpdate = () => setCurrentTime(video.currentTime);
      const handleDurationChange = () => setDuration(video.duration);
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      const handleEnded = () => {
        setIsPlaying(false);
        onVideoEnd?.();
      };

      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('durationchange', handleDurationChange);
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);
      video.addEventListener('ended', handleEnded);

      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('durationchange', handleDurationChange);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('ended', handleEnded);
      };
    }
  }, [onVideoEnd]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const restart = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (!isFullscreen) {
        videoRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // If scene is not compiled, show placeholder
  if (scene.status !== 'compiled' || !scene.videoUrl) {
    return (
      <div className={`relative bg-muted/20 rounded-lg overflow-hidden ${className}`}>
        <div className="aspect-video flex flex-col items-center justify-center gap-3 p-8">
          {scene.status === 'compiling' ? (
            <>
              <Loader className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Compiling scene...</p>
            </>
          ) : scene.status === 'failed' ? (
            <>
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <span className="text-red-400 text-2xl">!</span>
              </div>
              <p className="text-sm text-red-400">Compilation failed</p>
              {scene.error && (
                <p className="text-xs text-muted-foreground max-w-md text-center">
                  {scene.error}
                </p>
              )}
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
                <Play className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Scene not compiled yet</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative group bg-black rounded-lg overflow-hidden ${className}`}>
      {/* Video */}
      <video
        ref={videoRef}
        src={scene.videoUrl}
        className="w-full h-full object-contain"
        autoPlay={autoPlay}
        loop={false}
        playsInline
      />

      {/* Overlay Controls */}
      {showControls && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Play/Pause Button (Center) */}
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={togglePlay}
              className="w-16 h-16 rounded-full bg-primary/90 hover:bg-primary flex items-center justify-center transition-all transform hover:scale-110"
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 text-primary-foreground" />
              ) : (
                <Play className="w-8 h-8 text-primary-foreground ml-1" />
              )}
            </button>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
            {/* Progress Bar */}
            <div className="relative h-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlay}
                  className="p-2 rounded-md hover:bg-white/10 transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 text-white" />
                  ) : (
                    <Play className="w-4 h-4 text-white" />
                  )}
                </button>

                <button
                  onClick={restart}
                  className="p-2 rounded-md hover:bg-white/10 transition-colors"
                >
                  <RotateCcw className="w-4 h-4 text-white" />
                </button>

                <span className="text-xs text-white/90 font-medium">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-md hover:bg-white/10 transition-colors"
              >
                <Maximize2 className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scene Info Overlay (Top) */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <h3 className="text-sm font-medium text-white">{scene.name}</h3>
        {scene.duration && (
          <p className="text-xs text-white/70">Duration: {scene.duration}s</p>
        )}
      </div>
    </div>
  );
}
