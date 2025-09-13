"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { EtherealButton } from "@/components/ethereal-button"
import { GlowingInput } from "@/components/glowing-input"
import { VideoPlayer } from "@/components/video-player"
import { Send, Sparkles, Play, Clock, BookOpen, Film, Video, Code, FileText, Mic, Check, X } from "lucide-react"

export default function ClassiaChat() {
  const [input, setInput] = useState("")
  const [hasVideo, setHasVideo] = useState(false)
  const [videoUrl, setVideoUrl] = useState("")
  const [isCompilingVideo, setIsCompilingVideo] = useState(false)
  const [activeTab, setActiveTab] = useState<"video" | "code" | "script">("video")
  const [hasGeneratedCode, setHasGeneratedCode] = useState(false)
  const [currentCode, setCurrentCode] = useState<string | null>(null)
  const [isLoadingCode, setIsLoadingCode] = useState(false)
  const [currentScript, setCurrentScript] = useState<string | null>(null)
  const [scriptTitle, setScriptTitle] = useState<string | null>(null)
  const [hasGeneratedScript, setHasGeneratedScript] = useState(false)
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false)
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "success" | "error">("idle")

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/video-generator",
    }),
    onFinish: ({ message }) => {
      console.log("[FRONTEND] AI finished streaming, checking for video...")
      // Start video checking when AI is done
      checkVideoWithRetries()
    },
  })

  const isLoading = status === "streaming"

  // Check for latest video
  const checkForVideo = async () => {
    try {
      // Add cache busting with timestamp to force browser reload
      const timestamp = Date.now()
      const testUrl = `/videos/latest.mp4?t=${timestamp}`
      const response = await fetch(testUrl, { method: "HEAD" })
      if (response.ok) {
        setHasVideo(true)
        setVideoUrl(testUrl)
        setIsCompilingVideo(false)
        console.log(`[FRONTEND] Video URL updated with cache busting: ${testUrl}`)
        return true
      } else if (response.status === 416) {
        // File exists but still being written (Range Not Satisfiable) - keep polling
        return false
      } else {
        setHasVideo(false)
        setVideoUrl("")
        return false
      }
    } catch (error) {
      setHasVideo(false)
      setVideoUrl("")
      return false
    }
  }

  // Smart video checking with retries instead of continuous polling
  const checkVideoWithRetries = async (attempt = 1, maxAttempts = 10) => {
    setIsCompilingVideo(true)
    console.log(`[FRONTEND] Checking for video... attempt ${attempt}`)

    const found = await checkForVideo()

    if (found) {
      setHasGeneratedCode(true)
      setIsCompilingVideo(false)
      console.log("[FRONTEND] ✅ Video found!")
      return
    }

    if (attempt >= maxAttempts) {
      setIsCompilingVideo(false)
      console.log("[FRONTEND] ❌ Max attempts reached, video not found")
      return
    }

    // Wait with exponential backoff: 1s, 2s, 4s, 6s, 8s, 10s...
    const delay = Math.min(attempt * 2000, 10000)
    console.log(`[FRONTEND] Waiting ${delay}ms before next attempt...`)

    setTimeout(() => {
      checkVideoWithRetries(attempt + 1, maxAttempts)
    }, delay)
  }

  // Initial check for video on mount
  useEffect(() => {
    checkForVideo()
  }, [])

  // Fetch current code and script when switching tabs
  const fetchCurrentCode = async () => {
    if (isLoadingCode) return

    setIsLoadingCode(true)
    try {
      const response = await fetch("/api/current-code")

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        console.log("[FRONTEND] API returned non-JSON response, likely API not available")
        setCurrentCode(null)
        setCurrentScript(null)
        setScriptTitle(null)
        setHasGeneratedScript(false)
        return
      }

      const data = await response.json()

      if (data.success && data.hasCode) {
        setCurrentCode(data.code)
        console.log("[FRONTEND] Current code loaded successfully")
      } else {
        setCurrentCode(null)
        console.log("[FRONTEND] No current code found")
      }

      // Also handle script data from the same API
      if (data.success && data.hasScript) {
        setCurrentScript(data.script)
        setScriptTitle(data.title)
        setHasGeneratedScript(true)
        console.log("[FRONTEND] Current script loaded successfully")
      } else {
        setCurrentScript(null)
        setScriptTitle(null)
        setHasGeneratedScript(false)
        console.log("[FRONTEND] No current script found")
      }
    } catch (error) {
      console.log("[FRONTEND] API not available, using fallback behavior")
      setCurrentCode(null)
      setCurrentScript(null)
      setScriptTitle(null)
      setHasGeneratedScript(false)
    } finally {
      setIsLoadingCode(false)
    }
  }

  // Fetch code when switching to code tab and we have generated code
  useEffect(() => {
    if (!currentCode) {
      fetchCurrentCode()
    }
  }, [activeTab, hasGeneratedCode, currentCode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    sendMessage({ text: input })
    setInput("")
  }

  const handleAddVoice = async () => {
    setIsGeneratingVoice(true)
    setVoiceStatus("idle")

    try {
      const response = await fetch("/api/generate-voiced-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        setVoiceStatus("success")
        // Refresh video, code, and script after voice is added
        setTimeout(() => {
          checkForVideo()
          fetchCurrentCode() // Also refresh code and script content
          setVoiceStatus("idle")
        }, 2000)
      } else {
        setVoiceStatus("error")
        setTimeout(() => setVoiceStatus("idle"), 3000)
      }
    } catch (error) {
      console.error("Error generating voice:", error)
      setVoiceStatus("error")
      setTimeout(() => setVoiceStatus("idle"), 3000)
    } finally {
      setIsGeneratingVoice(false)
    }
  }

  return (
    <div className="h-screen bg-background text-foreground flex overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Chat Sidebar */}
      <div className="w-1/2 border-r border-border/50 flex flex-col h-screen overflow-hidden">
        {/* Chat Header */}
        <div className="p-6 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 glassmorphism rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Classia AI</h1>
              <p className="text-sm text-muted-foreground">Educational Video Generator</p>
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
                Describe what you'd like to learn and I'll create a video for you.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] ${message.role === "user" ? "bg-primary/20" : "glassmorphism"} rounded-2xl p-4`}
              >
                <p className="text-sm">
                  {message.parts.map((part, i) => {
                    if (part.type === "text") {
                      return <span key={i}>{part.text}</span>
                    }
                    return null
                  })}
                </p>
                <p className="text-xs text-muted-foreground mt-2">{new Date().toLocaleTimeString()}</p>
              </div>
            </div>
          ))}

          {/* Loading State Overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
              <div className="glassmorphism rounded-2xl p-4 max-w-[80%]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <p className="text-sm font-medium">Thinking...</p>
                </div>
                <p className="text-xs text-muted-foreground">Processing your request</p>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-6 border-t border-border/50 flex-shrink-0">
          <form onSubmit={handleSubmit} className="flex gap-3 w-full justify-between">
            <GlowingInput
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe what you want to learn..."
              className="!flex min-w-full !max-w-none"
              disabled={isLoading}
            />
            <EtherealButton type="submit" disabled={isLoading || !input.trim()}>
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
          {isLoading ? (
            <div className="flex items-center justify-center min-h-full">
              <div className="text-center space-y-6">
                <div className="w-24 h-24 glassmorphism rounded-full flex items-center justify-center mx-auto">
                  <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold mb-2">AI is Thinking</h2>
                  <p className="text-muted-foreground mb-4">Generating educational content...</p>
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
                  <h2 className="text-2xl font-semibold mb-2">Compiling Animation</h2>
                  <p className="text-muted-foreground mb-4">Creating your educational video...</p>
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
                    <h2 className="text-2xl font-semibold mb-2">Latest Animation</h2>
                    <p className="text-muted-foreground">Your generated educational video</p>
                  </div>
                  <VideoPlayer
                    key={videoUrl}
                    src={videoUrl}
                    title="Educational Animation"
                    className="w-full max-w-2xl"
                  />

                  <div className="flex justify-center mt-6">
                    <EtherealButton
                      onClick={handleAddVoice}
                      disabled={isGeneratingVoice}
                      className={`transition-all duration-300 ${
                        voiceStatus === "success"
                          ? "bg-green-500/20 border-green-500/50 text-green-400"
                          : voiceStatus === "error"
                            ? "bg-red-500/20 border-red-500/50 text-red-400"
                            : ""
                      }`}
                    >
                      {isGeneratingVoice ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          <span>Adding Voice...</span>
                        </>
                      ) : voiceStatus === "success" ? (
                        <>
                          <Check className="w-4 h-4 animate-pulse" />
                          <span>Voice Added!</span>
                        </>
                      ) : voiceStatus === "error" ? (
                        <>
                          <X className="w-4 h-4 animate-bounce" />
                          <span>Failed to Add Voice</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4" />
                          <span>Add Voice</span>
                        </>
                      )}
                    </EtherealButton>
                  </div>
                </div>
              </div>
            ) : activeTab === "code" ? (
              <div className="glassmorphism rounded-lg h-full flex flex-col">
                <div className="p-4 border-b border-border/50 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Generated Python Code</span>
                    <span className="text-xs text-muted-foreground ml-auto">manim</span>
                  </div>
                </div>
                <div className="p-4 flex-1 overflow-auto min-h-0">
                  {isLoadingCode ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      <span className="ml-2 text-sm text-muted-foreground">Loading code...</span>
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
                        <p className="text-sm text-muted-foreground">No code available</p>
                        <button onClick={fetchCurrentCode} className="text-xs text-primary hover:underline mt-2">
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
                    <span className="text-sm font-medium">Educational Script</span>
                    {scriptTitle && <span className="text-xs text-muted-foreground ml-auto">{scriptTitle}</span>}
                  </div>
                </div>
                <div className="p-4 flex-1 overflow-auto min-h-0">
                  {isLoadingCode ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      <span className="ml-2 text-sm text-muted-foreground">Loading script...</span>
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
                        <p className="text-sm text-muted-foreground">No script available</p>
                        <button onClick={fetchCurrentCode} className="text-xs text-primary hover:underline mt-2">
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
                    Start a conversation with Classia AI. Ask questions about educational content, algorithms,
                    mathematical concepts, or any learning topic.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
