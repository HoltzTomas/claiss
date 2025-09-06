"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { GlassCard } from "@/components/glass-card"
import { EtherealButton } from "@/components/ethereal-button"
import { GlowingInput } from "@/components/glowing-input"
import { Send, Sparkles, Play, Clock, BookOpen } from "lucide-react"
import { useSearchParams } from "next/navigation"

export default function ClassiaChat() {
  const [messages, setMessages] = useState<
    Array<{ id: string; type: "user" | "assistant"; content: string; timestamp: Date }>
  >([])
  const [input, setInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentStep, setCurrentStep] = useState("")
  const searchParams = useSearchParams()

  useEffect(() => {
    const initialPrompt = searchParams.get("prompt")
    if (initialPrompt) {
      setInput(initialPrompt)
      handleSubmit(null, initialPrompt)
    }
  }, [searchParams])

  const handleSubmit = async (e?: React.FormEvent, promptText?: string) => {
    if (e) e.preventDefault()
    const messageText = promptText || input.trim()
    if (!messageText) return

    const userMessage = {
      id: Date.now().toString(),
      type: "user" as const,
      content: messageText,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsGenerating(true)

    // Simulate AI agent steps
    const steps = [
      "Analyzing your prompt...",
      "Understanding the algorithm structure...",
      "Generating Python code with Manim...",
      "Creating visual elements...",
      "Rendering video frames...",
      "Finalizing educational video...",
    ]

    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(steps[i])
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }

    const assistantMessage = {
      id: (Date.now() + 1).toString(),
      type: "assistant" as const,
      content: `I've created an educational video showing ${messageText.toLowerCase()}. The video demonstrates the algorithm step-by-step with clear visualizations and explanations.`,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, assistantMessage])
    setIsGenerating(false)
    setCurrentStep("")
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
            <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] ${message.type === "user" ? "bg-primary/20" : "glassmorphism"} rounded-2xl p-4`}
              >
                <p className="text-sm">{message.content}</p>
                <p className="text-xs text-muted-foreground mt-2">{message.timestamp.toLocaleTimeString()}</p>
              </div>
            </div>
          ))}

          {isGenerating && (
            <div className="flex justify-start">
              <div className="glassmorphism rounded-2xl p-4 max-w-[80%]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <p className="text-sm font-medium">Generating video...</p>
                </div>
                <p className="text-xs text-muted-foreground">{currentStep}</p>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-6 border-t border-border/50">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <GlowingInput
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe what you want to learn..."
              className="flex-1"
              disabled={isGenerating}
            />
            <EtherealButton type="submit" disabled={isGenerating || !input.trim()}>
              <Send className="w-4 h-4" />
            </EtherealButton>
          </form>
        </div>
      </div>

      {/* Content Area */}
      <div className="w-1/2 flex flex-col items-center justify-center p-12">
        {isGenerating ? (
          <div className="text-center space-y-6">
            <div className="w-24 h-24 glassmorphism rounded-full flex items-center justify-center mx-auto">
              <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold mb-2">Creating Your Video</h2>
              <p className="text-muted-foreground mb-4">{currentStep}</p>
              <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>~2 minutes</span>
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  <span>Educational</span>
                </div>
              </div>
            </div>
          </div>
        ) : messages.length > 0 ? (
          <div className="text-center space-y-6">
            <GlassCard className="p-8 max-w-md">
              <div className="w-16 h-16 glassmorphism rounded-full flex items-center justify-center mx-auto mb-4">
                <Play className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Video Ready!</h3>
              <p className="text-muted-foreground mb-4">Your educational video has been generated successfully.</p>
              <EtherealButton className="w-full">
                <Play className="w-4 h-4 mr-2" />
                Watch Video
              </EtherealButton>
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
                Start a conversation to generate your first educational video. I can help visualize algorithms,
                mathematical concepts, and scientific principles.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
