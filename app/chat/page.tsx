"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { GlassCard } from "@/components/glass-card"
import { EtherealButton } from "@/components/ethereal-button"
import { GlowingInput } from "@/components/glowing-input"
import { VideoPlayer } from "@/components/video-player"
import { Send, Sparkles, Play, Clock, BookOpen, Film } from "lucide-react"

export default function ClassiaChat() {
  const [input, setInput] = useState("")
  const [hasVideo, setHasVideo] = useState(false)
  const [videoUrl, setVideoUrl] = useState("")
  const [isCompilingVideo, setIsCompilingVideo] = useState(false)
  
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/video-generator',
    }),
  })

  const isLoading = status === 'streaming'
  
  // Check for latest video
  const checkForVideo = async () => {
    try {
      const testUrl = `/videos/latest.mp4?t=${Date.now()}` // Cache busting
      const response = await fetch(testUrl, { method: 'HEAD' })
      if (response.ok) {
        setHasVideo(true)
        setVideoUrl(testUrl)
        setIsCompilingVideo(false)
        return true
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

  // Polling effect for video compilation
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null
    let pollAttempts = 0
    const maxPollAttempts = 30 // 60 seconds max (30 * 2s)
    
    const startPolling = () => {
      if (pollInterval) clearInterval(pollInterval)
      
      setIsCompilingVideo(true)
      pollInterval = setInterval(async () => {
        pollAttempts++
        console.log(`[FRONTEND] Polling for video... attempt ${pollAttempts}`)
        
        const found = await checkForVideo()
        
        if (found || pollAttempts >= maxPollAttempts) {
          if (pollInterval) {
            clearInterval(pollInterval)
            pollInterval = null
          }
          if (!found) {
            setIsCompilingVideo(false)
          }
          pollAttempts = 0
        }
      }, 2000) // Poll every 2 seconds
    }

    // Start polling when AI finishes streaming (video compilation begins)
    if (!isLoading && messages.length > 0 && !hasVideo) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage?.role === 'assistant') {
        console.log('[FRONTEND] AI finished streaming, starting video polling...')
        startPolling()
      }
    }

    // Cleanup polling on unmount
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [isLoading, messages, hasVideo])

  // Initial check for video on mount
  useEffect(() => {
    checkForVideo()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    
    sendMessage({ text: input })
    setInput("")
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Background Effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Chat Sidebar */}
      <div className="w-1/2 border-r border-border/50 flex flex-col">
        {/* Chat Header */}
        <div className="p-6 border-b border-border/50">
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
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
                    if (part.type === 'text') {
                      // Remove code blocks from display while keeping other text
                      const textWithoutCode = part.text.replace(/```[\s\S]*?```/g, '').trim()
                      return <span key={i}>{textWithoutCode}</span>
                    }
                    return null
                  })}
                </p>
                <p className="text-xs text-muted-foreground mt-2">{new Date().toLocaleTimeString()}</p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
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
        <div className="p-6 border-t border-border/50 w-full flex">
          <form onSubmit={handleSubmit} className="flex gap-3 w-full">
            <GlowingInput
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe what you want to learn..."
              className="!flex-1 !w-full !min-w-0 !max-w-none"
              disabled={isLoading}
            />
            <EtherealButton type="submit" disabled={isLoading || !input.trim()}>
              <Send className="w-4 h-4" />
            </EtherealButton>
          </form>
        </div>
      </div>

      {/* Content Area */}
      <div className="w-1/2 flex flex-col items-center justify-center p-12">
        {isLoading ? (
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
        ) : isCompilingVideo ? (
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
        ) : hasVideo ? (
          <div className="w-full max-w-2xl space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 glassmorphism rounded-full flex items-center justify-center mx-auto mb-4">
                <Film className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Latest Animation</h2>
              <p className="text-muted-foreground">Your generated educational video</p>
            </div>
            
            <VideoPlayer 
              src={videoUrl} 
              title="Educational Animation"
              className="w-full"
            />
            
            {messages.length > 0 && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {messages.length} message{messages.length !== 1 ? 's' : ''} exchanged
                </p>
              </div>
            )}
          </div>
        ) : messages.length > 0 ? (
          <div className="text-center space-y-6">
            <GlassCard className="p-8 max-w-md">
              <div className="w-16 h-16 glassmorphism rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Chat Active!</h3>
              <p className="text-muted-foreground mb-4">Continue the conversation or ask a new question.</p>
              <div className="text-sm text-muted-foreground">
                {messages.length} message{messages.length !== 1 ? 's' : ''} exchanged
              </div>
            </GlassCard>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  )
}
