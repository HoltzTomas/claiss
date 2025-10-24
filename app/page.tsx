"use client";

import type React from "react";

import { GlassCard } from "@/components/glass-card";
import { EtherealButton } from "@/components/ethereal-button";
import { TransparentBadge } from "@/components/transparent-badge";
import { GlowingInput } from "@/components/glowing-input";
import { FloatingNav } from "@/components/floating-nav";
import { ExampleModal } from "@/components/example-modal";
import { Play, Sparkles, ArrowRight, Eye, Heart, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ClassiaLanding() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleStartCreating = () => {
    router.push("/chat");
  };

  const handlePromptSubmit = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && prompt.trim()) {
      router.push(`/chat?prompt=${encodeURIComponent(prompt)}`);
    }
  };

  const handleWatchDemo = () => {
    // Show the bubble sort example (first video in exampleVideos)
    const bubbleSortVideo = exampleVideos[0];
    setSelectedVideo(bubbleSortVideo);
    setIsModalOpen(true);
  };

  const exampleVideos = [
    {
      id: 1,
      title: "Bubble Sort Algorithm",
      author: "Satoshi Nakamoto",
      views: "2.4k",
      likes: "189",
      prompt:
        "Show me how bubble sort works step by step with an array of numbers. Include comparisons, swaps, and explain the time complexity. Make it visual and easy to understand for beginners.",
      videoUrl:
        "https://jk7phfqta32ikgyg.public.blob.vercel-storage.com/videos/vid_xoyxx35jdn.mp4",
      duration: "0:20",
      category: "Algorithm",
      description:
        "A comprehensive visualization of the bubble sort algorithm showing how elements bubble up to their correct positions.",
      videoContent: (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex gap-2">
            {[64, 34, 25, 12, 22, 11, 90].map((num, i) => (
              <div
                key={i}
                className="w-8 h-16 bg-blue-400/80 rounded flex items-end justify-center text-xs font-bold text-white"
                style={{ height: `${(num / 90) * 64}px` }}
              >
                {num}
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 2,
      title: "Binary Tree Traversal",
      author: "Dr. Chen",
      views: "1.8k",
      likes: "156",
      prompt:
        "Create an animated explanation of binary tree traversal methods: in-order, pre-order, and post-order. Show the tree structure and highlight nodes as they are visited in each traversal method.",
      videoUrl:
        "https://jk7phfqta32ikgyg.public.blob.vercel-storage.com/videos/vid_vype7cvosnf.mp4",
      duration: "0:34",
      category: "Data Structure",
      description:
        "Learn the three main binary tree traversal algorithms with clear visual demonstrations.",
      videoContent: (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 bg-green-400/80 rounded-full flex items-center justify-center text-xs font-bold text-white">
                8
              </div>
              <div className="flex gap-8">
                <div className="w-6 h-6 bg-green-400/60 rounded-full flex items-center justify-center text-xs font-bold text-white">
                  3
                </div>
                <div className="w-6 h-6 bg-green-400/60 rounded-full flex items-center justify-center text-xs font-bold text-white">
                  10
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 3,
      title: "Pendulum Motion",
      author: "Ms. Johnson",
      views: "3.1k",
      likes: "267",
      prompt:
        "Demonstrate pendulum motion physics with equations. Show how gravity affects the swing, calculate the period, and explain the relationship between length and frequency. Include energy conservation concepts.",
      videoUrl:
        "https://jk7phfqta32ikgyg.public.blob.vercel-storage.com/videos/vid_mezrf9yaue9.mp4",
      duration: "0:21",
      category: "Physics",
      description:
        "Physics simulation showing pendulum motion with mathematical analysis and energy transformations.",
      videoContent: (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="flex flex-col items-center">
              <div className="w-1 h-16 bg-orange-400/60 origin-top rotate-12"></div>
              <div className="w-6 h-6 bg-orange-400/80 rounded-full -mt-1"></div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-secondary/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-3xl animate-pulse delay-2000" />
      </div>

      {/* Navigation */}
      <FloatingNav />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <TransparentBadge variant="secondary" className="text-sm">
              <Sparkles className="w-4 h-4 mr-2" />
              AI-Powered Educational Videos
            </TransparentBadge>
          </div>

          <h1 className="text-6xl md:text-7xl font-bold mb-8 text-balance">
            Transform Ideas into
            <span className="block text-blue-400">Visual Learning</span>
          </h1>

          <p className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto text-pretty">
            Classia uses AI to create stunning educational videos from simple
            prompts. Perfect for students and teachers who want to visualize
            complex algorithms and concepts.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <EtherealButton
              size="lg"
              className="group"
              onClick={handleStartCreating}
            >
              <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
              Start Creating
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </EtherealButton>
            <EtherealButton variant="ghost" size="lg" onClick={handleWatchDemo}>
              Watch Demo
            </EtherealButton>
          </div>

          {/* Demo Input */}
          <div className="max-w-2xl mx-auto">
            <GlassCard className="p-6">
              <p className="text-sm text-muted-foreground mb-4">Try it now:</p>
              <GlowingInput
                placeholder="Show me how bubble sort works step by step..."
                className="text-center text-lg"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handlePromptSubmit}
              />
              <p className="text-xs text-muted-foreground mt-3">
                Press Enter to generate your educational video
              </p>
            </GlassCard>
          </div>
        </div>
      </section>

      <section className="relative py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <div>
              <h2 className="text-3xl font-bold mb-2">From the Community</h2>
              <p className="text-muted-foreground">
                Explore what educators are creating with Classia.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exampleVideos.map((video) => (
              <div
                key={video.id}
                className="group cursor-pointer hover:scale-105 transition-all duration-300 overflow-hidden bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedVideo(video);
                  setIsModalOpen(true);
                }}
              >
                <div className="aspect-video bg-gradient-to-br from-blue-500/20 to-purple-500/20 relative overflow-hidden">
                  {video.videoContent}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                  <Play className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 text-white/80 group-hover:scale-110 transition-transform" />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold mb-2">{video.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>{video.author}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{video.views}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      <span>{video.likes}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ExampleModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedVideo(null);
        }}
        video={selectedVideo}
      />
    </div>
  );
}
