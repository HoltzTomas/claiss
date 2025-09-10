"use client"

import type React from "react"

import { useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { GlassCard } from "@/components/glass-card"
import { EtherealButton } from "@/components/ethereal-button"
import { GlowingInput } from "@/components/glowing-input"
import { Send, Sparkles, Play, Clock, BookOpen, Code, Video } from "lucide-react"

export default function ClassiaChat() {
  const [input, setInput] = useState("")
  const [activeTab, setActiveTab] = useState<"video" | "code">("video")

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/video-generator",
    }),
  })

  const isLoading = status === "streaming"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    sendMessage({ text: input })
    setInput("")
  }

  const mockPythonCode = `from manim import *

class BubbleSortVisualization(Scene):
    def construct(self):
        # Create array of numbers
        numbers = [64, 34, 25, 12, 22, 11, 90]
        
        # Create visual elements
        squares = VGroup(*[
            Square(side_length=0.8).set_fill(BLUE, opacity=0.7)
            for _ in numbers
        ])
        
        # Add numbers to squares
        labels = VGroup(*[
            Text(str(num), font_size=24)
            for num in numbers
        ])
        
        # Position elements
        for i, (square, label) in enumerate(zip(squares, labels)):
            square.move_to(RIGHT * (i - 3) * 1.2)
            label.move_to(square.get_center())
        
        # Add to scene
        self.add(squares, labels)
        
        # Bubble sort animation
        for i in range(len(numbers)):
            for j in range(len(numbers) - i - 1):
                if numbers[j] > numbers[j + 1]:
                    # Highlight comparison
                    self.play(
                        squares[j].animate.set_fill(RED, opacity=0.9),
                        squares[j + 1].animate.set_fill(RED, opacity=0.9),
                        run_time=0.5
                    )
                    
                    # Swap elements
                    numbers[j], numbers[j + 1] = numbers[j + 1], numbers[j]
                    
                    # Animate swap
                    self.play(
                        squares[j].animate.shift(RIGHT * 1.2),
                        squares[j + 1].animate.shift(LEFT * 1.2),
                        labels[j].animate.shift(RIGHT * 1.2),
                        labels[j + 1].animate.shift(LEFT * 1.2),
                        run_time=1
                    )
                    
                    # Reset colors
                    self.play(
                        squares[j].animate.set_fill(BLUE, opacity=0.7),
                        squares[j + 1].animate.set_fill(BLUE, opacity=0.7),
                        run_time=0.3
                    )
        
        # Final highlight
        self.play(
            *[square.animate.set_fill(GREEN, opacity=0.9) for square in squares],
            run_time=1
        )
        
        self.wait(2)`

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
        <div className="p-6 border-t border-border/50 w-full">
          <form onSubmit={handleSubmit} className="flex gap-3 w-full">
            <GlowingInput
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe what you want to learn..."
              className="flex-1 min-w-0"
              disabled={isLoading}
            />
            <EtherealButton type="submit" disabled={isLoading || !input.trim()} className="flex-shrink-0">
              <Send className="w-4 h-4" />
            </EtherealButton>
          </form>
        </div>
      </div>

      {/* Content Area */}
      <div className="w-1/2 flex flex-col">
        {messages.length > 0 && (
          <div className="border-b border-border/50 p-4">
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
            </div>
          </div>
        )}

        {/* Content based on active tab */}
        <div className="flex-1 flex items-center justify-center p-12">
          {isLoading ? (
            <div className="text-center space-y-6">
              <div className="w-24 h-24 glassmorphism rounded-full flex items-center justify-center mx-auto">
                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">AI is Thinking</h2>
                <p className="text-muted-foreground mb-4">Processing your request...</p>
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
          ) : messages.length > 0 ? (
            activeTab === "video" ? (
              <div className="text-center space-y-6">
                <GlassCard className="p-8 max-w-md">
                  <div className="w-16 h-16 glassmorphism rounded-full flex items-center justify-center mx-auto mb-4">
                    <Play className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Video Generated!</h3>
                  <p className="text-muted-foreground mb-4">Your educational video is ready to view.</p>
                  <div className="text-sm text-muted-foreground">Duration: 2:30 • Educational Content</div>
                </GlassCard>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col">
                <div className="flex-1 overflow-auto">
                  <div className="glassmorphism m-4 rounded-lg">
                    <div className="p-4 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        <Code className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Generated Python Code</span>
                        <span className="text-xs text-muted-foreground ml-auto">manim</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <pre className="text-xs text-foreground/90 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
                        {mockPythonCode}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            )
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
    </div>
  )
}
