"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { EtherealButton } from "@/components/ethereal-button";
import { GlowingInput } from "@/components/glowing-input";
import { VideoPlayer } from "@/components/video-player";
import {
  Send,
  Sparkles,
  Play,
  Clock,
  BookOpen,
  Film,
  Video,
  Code,
  FileText,
  Mic,
  Check,
  X,
  Cog,
  Wrench,
  Search,
  Zap,
  Users,
} from "lucide-react";

// Helper function to check if tool should be hidden from UI
const isContext7Tool = (toolName: string) => {
  const context7Tools = ["get-library-docs", "resolve-library-id"];
  return context7Tools.includes(toolName);
};

// Helper function to get tool icon and display name
const getToolInfo = (toolName: string) => {
  switch (toolName) {
    case "writeCode":
      return { icon: Code, name: "Generating Code", color: "text-blue-400" };
    case "readCode":
      return { icon: Search, name: "Reading Code", color: "text-cyan-400" };
    case "writeScript":
      return {
        icon: FileText,
        name: "Writing Script",
        color: "text-green-400",
      };
    case "readScript":
      return {
        icon: Search,
        name: "Reading Script",
        color: "text-emerald-400",
      };
    case "get-library-docs":
      return { icon: Search, name: "Thinking", color: "text-purple-400" };
    case "resolve-library-id":
      return { icon: Code, name: "Researching", color: "text-indigo-400" };
    default:
      return { icon: Cog, name: "Processing", color: "text-gray-400" };
  }
};

// Helper function to get state message
const getStateMessage = (state: string, toolName: string) => {
  const toolInfo = getToolInfo(toolName);

  switch (state) {
    case "input-streaming":
      return `Preparing ${toolInfo.name.toLowerCase()}...`;
    case "input-available":
      return `${toolInfo.name}...`;
    case "output-available":
      return `✅ ${toolInfo.name} completed`;
    case "output-error":
      return `❌ ${toolInfo.name} failed`;
    default:
      return `${toolInfo.name}...`;
  }
};

export default function ClassiaChat() {
  const [input, setInput] = useState("");
  const [hasVideo, setHasVideo] = useState(false);

  // Ref for auto-scrolling to latest message
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [isCompilingVideo, setIsCompilingVideo] = useState(false);
  const [activeTab, setActiveTab] = useState<"video" | "code" | "script">(
    "video",
  );
  const [hasGeneratedCode, setHasGeneratedCode] = useState(false);
  const [currentCode, setCurrentCode] = useState<string | null>(null);
  const [isLoadingCode, setIsLoadingCode] = useState(false);
  const [currentScript, setCurrentScript] = useState<string | null>(null);
  const [scriptTitle, setScriptTitle] = useState<string | null>(null);
  const [hasGeneratedScript, setHasGeneratedScript] = useState(false);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/video-generator",
    }),
    onFinish: ({ message }) => {
      console.log("[FRONTEND] AI finished streaming, checking for video...");
      // Start video checking when AI is done
      checkVideoWithRetries();
    },
  });

  // More granular loading states for better UX
  const isProcessing = status === "submitted" || status === "streaming";
  const isWaitingForResponse = status === "submitted";
  const isReceivingResponse = status === "streaming";
  const isLoading = isProcessing; // Keep for backward compatibility

  // Auto-scroll function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Check for latest video
  const checkForVideo = async () => {
    try {
      // Add cache busting with timestamp to force browser reload
      const timestamp = Date.now();
      const testUrl = `/api/videos?t=${timestamp}`;
      const response = await fetch(testUrl, { method: "HEAD" });
      if (response.ok) {
        setHasVideo(true);
        setVideoUrl(testUrl);
        setIsCompilingVideo(false);
        console.log(
          `[FRONTEND] Video URL updated with cache busting: ${testUrl}`,
        );
        return true;
      } else if (response.status === 416) {
        // File exists but still being written (Range Not Satisfiable) - keep polling
        return false;
      } else {
        setHasVideo(false);
        setVideoUrl("");
        return false;
      }
    } catch (error) {
      setHasVideo(false);
      setVideoUrl("");
      return false;
    }
  };

  // Smart video checking with retries instead of continuous polling
  const checkVideoWithRetries = async (attempt = 1, maxAttempts = 10) => {
    setIsCompilingVideo(true);
    console.log(`[FRONTEND] Checking for video... attempt ${attempt}`);

    const found = await checkForVideo();

    if (found) {
      setHasGeneratedCode(true);
      setIsCompilingVideo(false);
      console.log("[FRONTEND] ✅ Video found!");
      return;
    }

    if (attempt >= maxAttempts) {
      setIsCompilingVideo(false);
      console.log("[FRONTEND] ❌ Max attempts reached, video not found");
      return;
    }

    // Wait with exponential backoff: 1s, 2s, 4s, 6s, 8s, 10s...
    const delay = Math.min(attempt * 2000, 10000);
    console.log(`[FRONTEND] Waiting ${delay}ms before next attempt...`);

    setTimeout(() => {
      checkVideoWithRetries(attempt + 1, maxAttempts);
    }, delay);
  };

  // Initial check for video on mount
  useEffect(() => {
    checkForVideo();
  }, []);

  // Auto-scroll when messages change (new messages, streaming updates)
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-scroll when status changes (especially when user sends message)
  useEffect(() => {
    if (status === "submitted") {
      scrollToBottom();
    }
  }, [status]);

  // Fetch current code and script when switching tabs
  const fetchCurrentCode = async () => {
    if (isLoadingCode) return;

    setIsLoadingCode(true);
    try {
      const response = await fetch("/api/current-code");

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.log(
          "[FRONTEND] API returned non-JSON response, likely API not available",
        );
        setCurrentCode(null);
        setCurrentScript(null);
        setScriptTitle(null);
        setHasGeneratedScript(false);
        return;
      }

      const data = await response.json();

      if (data.success && data.hasCode) {
        setCurrentCode(data.code);
        console.log("[FRONTEND] Current code loaded successfully");
      } else {
        setCurrentCode(null);
        console.log("[FRONTEND] No current code found");
      }

      // Also handle script data from the same API
      if (data.success && data.hasScript) {
        setCurrentScript(data.script);
        setScriptTitle(data.title);
        setHasGeneratedScript(true);
        console.log("[FRONTEND] Current script loaded successfully");
      } else {
        setCurrentScript(null);
        setScriptTitle(null);
        setHasGeneratedScript(false);
        console.log("[FRONTEND] No current script found");
      }
    } catch (error) {
      console.log("[FRONTEND] API not available, using fallback behavior");
      setCurrentCode(null);
      setCurrentScript(null);
      setScriptTitle(null);
      setHasGeneratedScript(false);
    } finally {
      setIsLoadingCode(false);
    }
  };

  // Fetch code when switching to code tab and we have generated code
  useEffect(() => {
    if (!currentCode) {
      fetchCurrentCode();
    }
  }, [activeTab, hasGeneratedCode, currentCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    sendMessage({ text: input });
    setInput("");
  };

  const handleAddVoice = async () => {
    setIsGeneratingVoice(true);
    setVoiceStatus("idle");

    try {
      const response = await fetch("/api/generate-voiced-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        setVoiceStatus("success");
        // Refresh video, code, and script after voice is added
        setTimeout(() => {
          checkForVideo();
          fetchCurrentCode(); // Also refresh code and script content
          setVoiceStatus("idle");
        }, 2000);
      } else {
        setVoiceStatus("error");
        setTimeout(() => setVoiceStatus("idle"), 3000);
      }
    } catch (error) {
      console.error("Error generating voice:", error);
      setVoiceStatus("error");
      setTimeout(() => setVoiceStatus("idle"), 3000);
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  return (
    <div className="h-screen bg-background text-foreground flex overflow-hidden">
      {/* Chat Sidebar */}
      <div className="w-1/2 border-r border-border/50 flex flex-col min-h-screen overflow-hidden">
        {/* Chat Header */}
        <div className="p-6 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 glassmorphism rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Classia AI</h1>
              <p className="text-sm text-muted-foreground">
                Educational Video Generator
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0 relative">
          {messages.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <div className="w-16 h-16 glassmorphism rounded-full flex items-center justify-center mx-auto mb-4">
                <Play className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Start Creating</h3>
              <p className="text-muted-foreground">
                Describe what you'd like to learn and I'll create a video for
                you.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] ${message.role === "user" ? "bg-primary/20" : "glassmorphism"} rounded-2xl p-4`}
              >
                <div className="text-sm space-y-2">
                  {message.parts.map((part, i) => {
                    // Handle text parts
                    if (part.type === "text") {
                      return (
                        <span key={i} className="block">
                          {part.text}
                        </span>
                      );
                    }

                    // Handle step boundaries - only show if there are visible tools around them
                    if (part.type === "step-start") {
                      // Check if there are any visible (non-Context7) tools in this message
                      const hasVisibleTools = message.parts.some((p) => {
                        if (
                          p.type.startsWith("tool-") ||
                          p.type === "dynamic-tool"
                        ) {
                          const toolName =
                            p.type === "dynamic-tool"
                              ? (p as any).toolName
                              : p.type.replace("tool-", "");
                          return !isContext7Tool(toolName);
                        }
                        return false;
                      });

                      // Only show step separator if there are visible tools and this isn't the first part
                      return i > 0 && hasVisibleTools ? (
                        <div key={i} className="py-2">
                          <div className="h-px bg-border"></div>
                        </div>
                      ) : null;
                    }

                    // Handle tool calls with different states
                    if (
                      part.type.startsWith("tool-") ||
                      part.type === "dynamic-tool"
                    ) {
                      // Handle different tool part types
                      let toolName: string;
                      let partState: string = "call";
                      let partInput: any = null;
                      let partErrorText: string | null = null;

                      if (part.type === "dynamic-tool") {
                        // Dynamic tool part
                        const dynamicPart = part as any;
                        toolName = dynamicPart.toolName || "unknown";
                        partState = dynamicPart.state || "call";
                        partInput = dynamicPart.input;
                        partErrorText = dynamicPart.errorText;
                      } else {
                        // Static tool part (tool-writeCode, tool-readCode, etc.)
                        toolName = part.type.replace("tool-", "");
                        const staticPart = part as any;
                        partState = staticPart.state || "call";
                        partInput = staticPart.input;
                        partErrorText = staticPart.errorText;
                      }

                      const toolInfo = getToolInfo(toolName);
                      const Icon = toolInfo.icon;
                      const stateMessage = getStateMessage(partState, toolName);

                      return (
                        <div
                          key={i}
                          className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/30"
                        >
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center ${
                              partState === "output-available"
                                ? "bg-green-500/20"
                                : partState === "output-error"
                                  ? "bg-red-500/20"
                                  : "bg-primary/20"
                            }`}
                          >
                            {partState === "output-available" ? (
                              <Check className="w-3 h-3 text-green-400" />
                            ) : partState === "output-error" ? (
                              <X className="w-3 h-3 text-red-400" />
                            ) : partState === "input-streaming" ||
                              partState === "input-available" ? (
                              <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Icon className={`w-3 h-3 ${toolInfo.color}`} />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground/90">
                              {stateMessage}
                            </p>

                            {/* Show input details for some states */}
                            {(partState === "input-streaming" ||
                              partState === "input-available") &&
                              partInput && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                  {typeof partInput === "string"
                                    ? partInput
                                    : JSON.stringify(partInput).slice(0, 50) +
                                      "..."}
                                </p>
                              )}

                            {/* Show error details */}
                            {partState === "output-error" && partErrorText && (
                              <p className="text-xs text-red-400 mt-1">
                                {partErrorText}
                              </p>
                            )}
                          </div>

                          {/* Show timing information */}
                          <div className="text-xs text-muted-foreground">
                            {partState === "output-available" ? (
                              <span className="text-green-400">✓</span>
                            ) : partState === "output-error" ? (
                              <span className="text-red-400">✗</span>
                            ) : (
                              <div className="w-2 h-2 bg-primary/50 rounded-full animate-pulse"></div>
                            )}
                          </div>
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

          {/* Immediate "Thinking" message when AI starts processing */}
          {isWaitingForResponse && (
            <div className="flex justify-start">
              <div className="max-w-[80%] glassmorphism rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-foreground/90">Thinking</span>
                    <div className="flex gap-1">
                      <div className="w-1 h-1 bg-primary rounded-full animate-pulse"></div>
                      <div
                        className="w-1 h-1 bg-primary rounded-full animate-pulse"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                      <div
                        className="w-1 h-1 bg-primary rounded-full animate-pulse"
                        style={{ animationDelay: "0.4s" }}
                      ></div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date().toLocaleTimeString()}
                </p>
              </div>
            </div>
          )}

          {/* Invisible element for auto-scrolling to bottom */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-6 border-t border-border/50 flex-shrink-0">
          <form
            onSubmit={handleSubmit}
            className="flex gap-3 w-full justify-between"
          >
            <GlowingInput
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe what you want to learn..."
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

      {/* Content Area */}
      <div className="w-1/2 flex flex-col h-screen overflow-hidden">
        <div className="border-b border-border/50 p-4 flex-shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("video")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "video"
                  ? "glassmorphism text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Video className="w-4 h-4" />
              Video
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
            <button
              onClick={() => setActiveTab("script")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "script"
                  ? "glassmorphism text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <FileText className="w-4 h-4" />
              Script
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {isProcessing ? (
            <div className="flex items-center justify-center min-h-full">
              <div className="text-center space-y-6">
                <div className="w-24 h-24 glassmorphism rounded-full flex items-center justify-center mx-auto">
                  <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold mb-2">
                    {isWaitingForResponse ? "AI is Analyzing" : "AI is Working"}
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    {isWaitingForResponse
                      ? "Understanding your request..."
                      : "Generating educational content..."}
                  </p>
                  <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>~30 seconds</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      <span>Educational</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : isCompilingVideo ? (
            <div className="flex items-center justify-center min-h-full">
              <div className="text-center space-y-6">
                <div className="w-24 h-24 glassmorphism rounded-full flex items-center justify-center mx-auto">
                  <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold mb-2">
                    Compiling Animation
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    Creating your educational video...
                  </p>
                  <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Film className="w-4 h-4" />
                      <span>Manim Rendering</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>~15 seconds</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : hasVideo ? (
            activeTab === "video" ? (
              <div className="flex items-center justify-center min-h-full">
                <div className="text-center space-y-6">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 glassmorphism rounded-full flex items-center justify-center mx-auto mb-4">
                      <Film className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-semibold mb-2">
                      Latest Animation
                    </h2>
                    <p className="text-muted-foreground">
                      Your generated educational video
                    </p>
                  </div>
                  <VideoPlayer
                    key={videoUrl}
                    src={videoUrl}
                    title="Educational Animation"
                    className="w-full max-w-2xl"
                  />

                  {/* Add Voice button temporarily hidden */}
                </div>
              </div>
            ) : activeTab === "code" ? (
              <div className="glassmorphism rounded-lg h-full flex flex-col">
                <div className="p-4 border-b border-border/50 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">
                      Generated Python Code
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      manim
                    </span>
                  </div>
                </div>
                <div className="p-4 flex-1 overflow-auto min-h-0">
                  {isLoadingCode ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      <span className="ml-2 text-sm text-muted-foreground">
                        Loading code...
                      </span>
                    </div>
                  ) : currentCode ? (
                    <pre className="text-xs text-foreground/90 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed h-full overflow-y-auto">
                      {currentCode}
                    </pre>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="w-12 h-12 glassmorphism rounded-full flex items-center justify-center mx-auto mb-3">
                          <Code className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          No code available
                        </p>
                        <button
                          onClick={fetchCurrentCode}
                          className="text-xs text-primary hover:underline mt-2"
                        >
                          Try refreshing
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="glassmorphism rounded-lg h-full flex flex-col">
                <div className="p-4 border-b border-border/50 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">
                      Educational Script
                    </span>
                    {scriptTitle && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        {scriptTitle}
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4 flex-1 overflow-auto min-h-0">
                  {isLoadingCode ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      <span className="ml-2 text-sm text-muted-foreground">
                        Loading script...
                      </span>
                    </div>
                  ) : currentScript ? (
                    <div className="text-sm text-foreground/90 leading-relaxed h-full overflow-y-auto whitespace-pre-wrap">
                      {currentScript}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="w-12 h-12 glassmorphism rounded-full flex items-center justify-center mx-auto mb-3">
                          <FileText className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          No script available
                        </p>
                        <button
                          onClick={fetchCurrentCode}
                          className="text-xs text-primary hover:underline mt-2"
                        >
                          Try refreshing
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center min-h-full">
              <div className="text-center space-y-6 max-w-md">
                <div className="w-24 h-24 glassmorphism rounded-full flex items-center justify-center mx-auto">
                  <Sparkles className="w-12 h-12 text-primary" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold mb-4">Ready to Learn?</h2>
                  <p className="text-muted-foreground">
                    Start a conversation with Classia AI. Ask questions about
                    educational content, algorithms, mathematical concepts, or
                    any learning topic.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
