"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useSearchParams } from "next/navigation";
import { EtherealButton } from "@/components/ethereal-button";
import { GlowingInput } from "@/components/glowing-input";
import { SceneTimeline } from "@/components/scene-timeline";
import { ScenePreview } from "@/components/scene-preview";
import { SceneEditModal } from "@/components/scene-edit-modal";
import { MarkdownMessage } from "@/components/markdown-message";
import { Send, Sparkles, Film, Video, Code, Loader, CheckCircle, Merge } from "lucide-react";
import { useSceneManager } from "@/lib/hooks/use-scene-manager";
import { useSceneCompiler } from "@/lib/hooks/use-scene-compiler";
import { useVideoMerger } from "@/lib/hooks/use-video-merger";
import type { Scene } from "@/lib/scene-types";

// Component that uses searchParams - must be wrapped in Suspense
function ChatSceneContent() {
  const searchParams = useSearchParams();
  const [input, setInput] = useState("");
  const [activeTab, setActiveTab] = useState<"video" | "scenes" | "code">("video");
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [previewScene, setPreviewScene] = useState<Scene | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitialMessageSent = useRef(false);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);

  // Scene management hooks
  const {
    video,
    loading: videoLoading,
    error: videoError,
    loadVideo,
    updateScene,
    deleteScene,
    reorderScene,
    createScene,
    updateSceneStatus,
    getCompilationProgress,
    isReadyToMerge,
    updateFinalVideo,
  } = useSceneManager();

  const {
    compileScene,
    compileScenes,
    isCompiling,
    getError: getCompilationError,
    compilingCount
  } = useSceneCompiler();

  const {
    mergeScenes,
    merging,
    mergeProgress,
    error: mergeError
  } = useVideoMerger();

  // Chat integration
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/video-generator-scene",
      body: {
        videoId: currentVideoId,
        mode: 'scene'
      },
    }),
    onFinish: async ({ message }) => {
      console.log("[CHAT-SCENE] AI finished streaming");

      let hasNewScenes = false;
      let firstCompiledScene: any = null;

      // Check for scene operations in tool results
      if (message.parts) {
        for (const part of message.parts) {
          if (part.type === 'tool-writeScene' && (part as any).state === 'output-available') {
            const result = (part as any).result || (part as any).output;

            if (result && result.success) {
              console.log("[CHAT-SCENE] Scene written:", result.sceneName);
              hasNewScenes = true;

              const sceneData: Partial<Scene> = {
                id: result.sceneId,
                name: result.sceneName,
                code: result.code,
                status: result.videoGenerated ? 'compiled' as const : 'pending' as const,
                videoUrl: result.videoUrl,
                videoId: result.videoId,
              };

              // Track first compiled scene for auto-preview
              if (result.videoGenerated && !firstCompiledScene) {
                firstCompiledScene = sceneData;
              }

              // Update or create scene
              if (result.isNewScene) {
                createScene(sceneData as any, result.position || 0);
              } else {
                updateScene(result.sceneId, sceneData);
              }
            }
          }
        }
      }

      // After all scenes processed
      if (hasNewScenes) {
        console.log("[CHAT-SCENE] New scenes detected, reloading video and switching tabs");

        // Reload video from storage to get latest state
        setTimeout(async () => {
          // Reload the video to ensure we have the latest scene statuses
          const reloadedVideo = await loadVideo();
          if (reloadedVideo) {
            console.log("[CHAT-SCENE] Video reloaded with", reloadedVideo.scenes.length, "scenes");

            // Find the first compiled scene from reloaded video
            const firstCompiled = reloadedVideo.scenes.find((s: Scene) => s.status === 'compiled' && s.videoUrl);
            if (firstCompiled) {
              console.log("[CHAT-SCENE] Auto-selecting first compiled scene:", firstCompiled.name);
              setPreviewScene(firstCompiled);
            }
          }

          // Switch to scenes tab
          setActiveTab('scenes');
        }, 1000);
      }
    },
  });

  const isProcessing = status === "submitted" || status === "streaming";

  // Sync video ID when video changes
  useEffect(() => {
    if (video && video.id !== currentVideoId) {
      setCurrentVideoId(video.id);
    }
  }, [video, currentVideoId]);

  // Auto-scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle URL prompt parameter
  useEffect(() => {
    const promptParam = searchParams.get("prompt");
    if (
      promptParam &&
      !hasInitialMessageSent.current &&
      messages.length === 0 &&
      !isProcessing
    ) {
      hasInitialMessageSent.current = true;
      sendMessage({ text: promptParam });

      const url = new URL(window.location.href);
      url.searchParams.delete("prompt");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams, messages.length, isProcessing, sendMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    sendMessage({ text: input });
    setInput("");
  };

  const handleSceneEdit = (scene: Scene) => {
    setEditingScene(scene);
  };

  const handleSceneSave = async (updates: Partial<Scene>) => {
    if (!editingScene) return;

    // Update scene
    updateScene(editingScene.id, updates);

    // Trigger recompilation if code changed
    if (updates.code) {
      const updatedScene = { ...editingScene, ...updates, status: 'pending' as const };
      try {
        const result = await compileScene(updatedScene);
        updateSceneStatus(
          editingScene.id,
          'compiled',
          result.videoUrl,
          result.videoId
        );
      } catch (error) {
        updateSceneStatus(
          editingScene.id,
          'failed',
          undefined,
          undefined,
          error instanceof Error ? error.message : 'Compilation failed'
        );
      }
    }
  };

  const handleSceneDelete = async (scene: Scene) => {
    if (confirm(`Delete scene "${scene.name}"?`)) {
      deleteScene(scene.id);
    }
  };

  const handleMergeVideo = async () => {
    if (!video) return;

    try {
      const result = await mergeScenes(video.id, video.scenes);
      console.log("[CHAT-SCENE] Video merged:", result.videoUrl);

      // Update video with final URL in localStorage
      if (result.videoUrl) {
        updateFinalVideo(result.videoUrl, result.duration);
      }

      // Switch to video tab to show result
      setActiveTab('video');
    } catch (error) {
      console.error("[CHAT-SCENE] Merge failed:", error);
    }
  };

  const compilationProgress = getCompilationProgress();
  const readyToMerge = isReadyToMerge();

  return (
    <div className="h-screen bg-background text-foreground flex overflow-hidden">
      {/* Chat Sidebar */}
      <div className="w-1/3 border-r border-border/50 flex flex-col min-h-screen overflow-hidden">
        {/* Chat Header */}
        <div className="p-6 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 glassmorphism rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Claiss AI - Scene Mode</h1>
              <p className="text-sm text-muted-foreground">
                {video ? `${video.scenes.length} scenes` : 'Create new video'}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
          {messages.length === 0 && !isProcessing && (
            <div className="text-center py-12">
              <div className="w-16 h-16 glassmorphism rounded-full flex items-center justify-center mx-auto mb-4">
                <Film className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Start Creating</h3>
              <p className="text-muted-foreground text-sm">
                Describe what you'd like to learn and I'll create a video
                organized into scenes.
              </p>
              <div className="mt-4 text-xs text-muted-foreground">
                💡 Scenes compile independently for faster edits!
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] ${message.role === "user" ? "bg-primary/20" : "glassmorphism"} rounded-2xl p-4`}
              >
                <div className="text-sm space-y-2">
                  {message.parts.map((part, i) => {
                    if (part.type === "text") {
                      return (
                        <div key={i}>
                          <MarkdownMessage content={part.text} />
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date().toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="flex justify-start">
              <div className="max-w-[85%] glassmorphism rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <Loader className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-sm">Analyzing scenes...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-6 border-t border-border/50 flex-shrink-0">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <GlowingInput
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe what you want to create or edit..."
              className="!flex min-w-full !max-w-none"
              disabled={isProcessing}
            />
            <EtherealButton
              type="submit"
              disabled={isProcessing || !input.trim()}
            >
              <Send className="w-4 h-4" />
            </EtherealButton>
          </form>
        </div>
      </div>

      {/* Content Area with Tabs */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-border/50 p-4 flex-shrink-0">
          <div className="flex gap-2 items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("scenes")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "scenes"
                    ? "glassmorphism text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Film className="w-4 h-4" />
                Scenes ({video?.scenes.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("video")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "video"
                    ? "glassmorphism text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Video className="w-4 h-4" />
                Final Video
              </button>
              <button
                onClick={() => setActiveTab("code")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "code"
                    ? "glassmorphism text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Code className="w-4 h-4" />
                Code
              </button>
            </div>

            {/* Merge Button */}
            {video && activeTab === 'scenes' && (
              <button
                onClick={handleMergeVideo}
                disabled={!readyToMerge || merging}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {merging ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Merging...
                  </>
                ) : readyToMerge ? (
                  <>
                    <Merge className="w-4 h-4" />
                    Merge Scenes
                  </>
                ) : (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Compiling...
                  </>
                )}
              </button>
            )}
          </div>

          {/* Compilation Progress */}
          {video && compilingCount > 0 && (
            <div className="mt-3 flex items-center gap-3 text-xs">
              <Loader className="w-4 h-4 animate-spin text-primary" />
              <span className="text-muted-foreground">
                Compiling {compilingCount} scene{compilingCount > 1 ? 's' : ''}...
              </span>
              <div className="flex-1 h-1.5 bg-muted/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${compilationProgress.percentage}%` }}
                />
              </div>
              <span className="text-muted-foreground">
                {Math.round(compilationProgress.percentage)}%
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "scenes" && video && (
            <div className="h-full flex">
              {/* Scene Timeline */}
              <div className="w-1/3 border-r border-border/50">
                <SceneTimeline
                  scenes={video.scenes}
                  onSceneClick={setPreviewScene}
                  onSceneEdit={handleSceneEdit}
                  onSceneDelete={handleSceneDelete}
                  onSceneReorder={reorderScene}
                  onAddScene={(pos) => {
                    // Open modal to create new scene
                    console.log('Create scene at position', pos);
                  }}
                  currentSceneId={previewScene?.id}
                />
              </div>

              {/* Scene Preview */}
              <div className="flex-1 p-6 flex items-center justify-center">
                {previewScene ? (
                  <div className="max-w-3xl w-full">
                    <h2 className="text-2xl font-semibold mb-4">{previewScene.name}</h2>
                    <ScenePreview scene={previewScene} />
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 glassmorphism rounded-full flex items-center justify-center mx-auto mb-4">
                      <Film className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">
                      Select a scene to preview
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "video" && (
            <div className="h-full flex items-center justify-center p-6">
              {video?.finalVideoUrl ? (
                <div className="max-w-4xl w-full">
                  <h2 className="text-2xl font-semibold mb-4">{video.title}</h2>
                  <video
                    src={video.finalVideoUrl}
                    controls
                    className="w-full rounded-lg shadow-xl"
                  />
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 glassmorphism rounded-full flex items-center justify-center mx-auto mb-4">
                    <Video className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground mb-4">
                    No final video yet. Merge scenes to create it.
                  </p>
                  {readyToMerge && (
                    <button
                      onClick={handleMergeVideo}
                      className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <Merge className="w-5 h-5 inline-block mr-2" />
                      Merge Scenes Now
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "code" && (
            <div className="h-full overflow-auto p-6">
              <div className="glassmorphism rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Scene Code</h3>
                {video?.scenes.map((scene) => (
                  <div key={scene.id} className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium">{scene.name}</h4>
                      <button
                        onClick={() => handleSceneEdit(scene)}
                        className="text-xs text-primary hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                    <pre className="text-xs font-mono bg-muted/20 p-4 rounded-lg overflow-x-auto">
                      {scene.code}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scene Edit Modal */}
      {editingScene && (
        <SceneEditModal
          scene={editingScene}
          isOpen={!!editingScene}
          onClose={() => setEditingScene(null)}
          onSave={handleSceneSave}
        />
      )}
    </div>
  );
}

// Main page component with Suspense boundary
export default function ChatScenePage() {
  return (
    <Suspense fallback={
      <div className="h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <ChatSceneContent />
    </Suspense>
  );
}
