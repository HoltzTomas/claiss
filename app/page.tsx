"use client";

import { ExampleModal } from "@/components/example-modal";
import {
  CopyPlus,
  Eye,
  Heart,
  Github,
  Play,
  Sparkles,
  GraduationCap,
  Microscope,
  Handshake,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type CommunityVideo = {
  id: number;
  title: string;
  author: string;
  views: string;
  likes: string;
  prompt: string;
  videoUrl: string;
  duration: string;
  category: string;
  accent: string;
  secondaryAccent: string;
};

const communityVideos: CommunityVideo[] = [
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
    accent: "#00d4aa",
    secondaryAccent: "#4f9fff",
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
    category: "Data Structures",
    accent: "#4f9fff",
    secondaryAccent: "#7c5cff",
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
    accent: "#ff944d",
    secondaryAccent: "#e84d9b",
  },
];

const features = [
  {
    title: "Instant Generation",
    description:
      "Go from prompt to animated video in seconds. No editing skills required.",
    icon: CopyPlus,
    iconBackground: "rgba(0, 212, 170, 0.12)",
    iconColor: "#00d4aa",
  },
  {
    title: "Curriculum-Ready",
    description:
      "Aligned with CS and STEM syllabi. Teachers love the structured output.",
    icon: GraduationCap,
    iconBackground: "rgba(79, 159, 255, 0.12)",
    iconColor: "#4f9fff",
  },
  {
    title: "Concept Depth",
    description:
      "From Big-O complexity to pendulum physics, Classia makes difficult topics visual.",
    icon: Microscope,
    iconBackground: "rgba(145, 96, 255, 0.14)",
    iconColor: "#9b7dff",
  },
  {
    title: "Share & Remix",
    description:
      "Publish to the community and build on each other's prompts seamlessly.",
    icon: Handshake,
    iconBackground: "rgba(255, 164, 74, 0.12)",
    iconColor: "#ffb54a",
  },
];

type Formula = {
  text: string;
  top: string;
  left?: string;
  right?: string;
  color: string;
  size: number;
  delay: string;
};

const formulas: Formula[] = [
  { text: "f(x) = sin(x)", top: "11%", left: "14%", color: "#2f6bd2", size: 24, delay: "0s" },
  { text: "∇²ψ = 0", top: "17%", left: "4%", color: "#387de0", size: 22, delay: "-6s" },
  { text: "√(a²+b²)", top: "22%", left: "7%", color: "#0e9d83", size: 18, delay: "-12s" },
  { text: "T(n) = 2T(n/2)+n", top: "17%", right: "18%", color: "#2a62bd", size: 20, delay: "-9s" },
  { text: "P(A|B)", top: "49%", left: "25%", color: "#0fb495", size: 32, delay: "-4s" },
  { text: "dy/dx", top: "67%", left: "48%", color: "#0b8f78", size: 18, delay: "-10s" },
  { text: "log₂(n)", top: "71%", left: "27%", color: "#0b8f78", size: 18, delay: "-14s" },
  { text: "aₙ = aₙ₋₁ + aₙ₋₂", top: "80%", left: "8%", color: "#0c9f84", size: 22, delay: "-2s" },
  { text: "lim x→∞", top: "85%", left: "19%", color: "#2c68cf", size: 26, delay: "-16s" },
  { text: "O(n²)", top: "92%", left: "26%", color: "#2d70dd", size: 20, delay: "-11s" },
  { text: "Fibonacci(n)", top: "90%", left: "44%", color: "#2d70dd", size: 16, delay: "-7s" },
  { text: "σ² = E[X²]−μ²", top: "98%", left: "50%", color: "#356fcb", size: 16, delay: "-5s" },
];

const particles = Array.from({ length: 120 }, (_, index) => ({
  id: index,
  size: 2 + (index % 4),
  top: `${(index * 17) % 100}%`,
  left: `${(index * 37) % 100}%`,
  opacity: 0.24 + ((index % 5) * 0.08),
  duration: `${14 + (index % 9) * 3}s`,
  delay: `${(index % 11) * -2}s`,
  color: index % 3 === 0 ? "#00d4aa" : "#4f9fff",
}));

function LandingBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden bg-[#050810]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(79,159,255,0.12),_transparent_30%),radial-gradient(circle_at_20%_80%,_rgba(0,212,170,0.08),_transparent_28%),radial-gradient(circle_at_80%_30%,_rgba(79,159,255,0.08),_transparent_30%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:112px_112px] opacity-60" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:56px_56px] opacity-40" />

      {particles.map((particle) => (
        <span
          key={particle.id}
          className="classia-particle"
          style={{
            top: particle.top,
            left: particle.left,
            width: particle.size,
            height: particle.size,
            opacity: particle.opacity,
            background: particle.color,
            animationDuration: particle.duration,
            animationDelay: particle.delay,
          }}
        />
      ))}

      {formulas.map((formula) => (
        <span
          key={formula.text}
          className="classia-formula hidden md:block"
          style={{
            top: formula.top,
            left: formula.left,
            right: formula.right,
            color: formula.color,
            fontSize: formula.size,
            animationDelay: formula.delay,
          }}
        >
          {formula.text}
        </span>
      ))}

      <svg
        className="classia-wave classia-wave-teal top-[26%]"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
      >
        <path d="M0,70 C120,96 220,10 360,44 C500,78 610,92 720,66 C840,36 920,18 1080,44 C1230,71 1310,92 1440,60" />
      </svg>
      <svg
        className="classia-wave classia-wave-blue top-[53%]"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
      >
        <path d="M0,72 C124,16 252,116 374,72 C504,26 612,112 738,72 C866,32 978,114 1098,76 C1226,34 1334,104 1440,76" />
      </svg>
      <svg
        className="classia-wave classia-wave-purple top-[75%]"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
      >
        <path d="M0,80 C138,22 264,96 406,90 C548,84 658,34 790,58 C936,84 1042,104 1182,82 C1284,66 1366,42 1440,60" />
      </svg>
    </div>
  );
}

export default function ClassiaLanding() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<CommunityVideo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [starCount, setStarCount] = useState("—");

  useEffect(() => {
    let isMounted = true;

    const loadStars = async () => {
      try {
        const response = await fetch(
          "https://api.github.com/repos/HoltzTomas/classia-frontend",
          {
            headers: {
              Accept: "application/vnd.github+json",
            },
          }
        );

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { stargazers_count?: number };

        if (!isMounted || typeof data.stargazers_count !== "number") {
          return;
        }

        setStarCount(
          data.stargazers_count >= 1000
            ? `${(data.stargazers_count / 1000).toFixed(1).replace(/\.0$/, "")}k`
            : String(data.stargazers_count)
        );
      } catch {
        // Keep the quiet fallback to avoid distracting from the landing.
      }
    };

    void loadStars();

    return () => {
      isMounted = false;
    };
  }, []);

  const navigateToChat = () => {
    const trimmedPrompt = prompt.trim();

    if (trimmedPrompt) {
      router.push(`/chat?prompt=${encodeURIComponent(trimmedPrompt)}`);
      return;
    }

    router.push("/chat");
  };

  const handlePromptSubmit = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && prompt.trim()) {
      router.push(`/chat?prompt=${encodeURIComponent(prompt.trim())}`);
    }
  };

  const openVideoModal = (video: CommunityVideo) => {
    setSelectedVideo(video);
    setIsModalOpen(true);
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050810] text-white">
      <LandingBackground />

      <nav className="fixed left-1/2 top-4 z-50 w-[calc(100%-1.5rem)] max-w-fit -translate-x-1/2">
        <div className="classia-shell flex items-center gap-3 rounded-full px-5 py-3 sm:gap-5">
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#00d4aa,#4f9fff)] shadow-[0_8px_30px_rgba(79,159,255,0.25)]">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-base font-semibold tracking-[-0.02em] text-white">
              Classia
            </span>
          </div>

          <a
            href="https://github.com/HoltzTomas/classia-frontend"
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3.5 py-1.5 text-[13px] text-white/[0.65] transition hover:border-white/20 hover:text-white sm:flex"
          >
            <Github className="h-4 w-4" />
            <span>GitHub</span>
            <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-white/60">
              ★ {starCount}
            </span>
          </a>

          <button
            type="button"
            onClick={navigateToChat}
            className="rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-white/[0.14]"
          >
            Try Free
          </button>
        </div>
      </nav>

      <main className="relative z-10">
        <section className="flex min-h-screen items-center justify-center px-5 pb-16 pt-28 sm:px-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#2b67a6] bg-[#10203a]/70 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.18em] text-[#58a6ff] uppercase shadow-[0_0_24px_rgba(79,159,255,0.08)]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#00d4aa] shadow-[0_0_16px_rgba(0,212,170,0.8)]" />
              AI-Powered Educational Videos
            </div>

            <h1 className="max-w-5xl text-[2.9rem] font-black leading-[0.94] tracking-[-0.06em] text-white sm:text-[4.1rem] lg:text-[6.3rem]">
              Transform Ideas into
              <span className="mt-2 block text-[#00d4aa]">Visual Learning</span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-white/[0.45] sm:text-[1.18rem] sm:leading-9">
              Classia uses AI to create stunning educational videos from simple
              prompts. Perfect for students and teachers who want to visualize
              complex algorithms and concepts.
            </p>

            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={navigateToChat}
                className="inline-flex items-center gap-2.5 rounded-full bg-[#00d4aa] px-7 py-3.5 text-base font-bold text-[#041017] shadow-[0_20px_60px_rgba(0,212,170,0.2)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(0,212,170,0.28)]"
              >
                <Play className="h-4 w-4 fill-current" />
                Start Creating
              </button>
              <button
                type="button"
                onClick={() => openVideoModal(communityVideos[0])}
                className="rounded-full border border-white/10 bg-transparent px-7 py-3.5 text-base font-medium text-white/70 transition hover:border-white/20 hover:text-white"
              >
                Watch Demo
              </button>
            </div>

            <div className="classia-shell mt-14 w-full max-w-2xl rounded-[22px] px-5 py-5 sm:px-6">
              <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.28em] text-white/[0.35]">
                Try it now:
              </p>
              <input
                type="text"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={handlePromptSubmit}
                placeholder="Show me how bubble sort works step by step..."
                className="w-full rounded-2xl border border-white/8 bg-white/[0.045] px-5 py-4 text-[15px] text-white outline-none transition placeholder:text-white/50 focus:border-[#00d4aa]/50 focus:bg-white/[0.065] sm:text-base"
              />
              <p className="mt-3 text-center text-xs text-white/[0.28] sm:text-sm">
                Press <span className="font-semibold text-[#00d4aa]">Enter</span> to generate your educational video
              </p>
            </div>
          </div>
        </section>

        <section className="relative z-10 px-5 py-4 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8">
              <h2 className="text-3xl font-extrabold tracking-[-0.04em] text-white sm:text-5xl">
                From the Community
              </h2>
              <p className="mt-3 max-w-2xl text-lg text-white/[0.4]">
                Explore what educators are creating with Classia.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {communityVideos.map((video) => (
                <button
                  key={video.id}
                  type="button"
                  onClick={() => openVideoModal(video)}
                  className="group classia-card text-left"
                >
                    <div className="relative aspect-[16/10] overflow-hidden rounded-[18px] border border-white/[0.06] bg-[#0b1020]">
                    <div
                      className="absolute inset-0 opacity-70"
                      style={{
                        background: `radial-gradient(circle at 50% 25%, ${video.secondaryAccent}40, transparent 30%), radial-gradient(circle at 25% 80%, ${video.accent}35, transparent 35%)`,
                      }}
                    />
                    <video
                      src={video.videoUrl}
                      className="h-full w-full object-cover opacity-72 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-90"
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(5,8,16,0.72),rgba(5,8,16,0.05))]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full border border-white/25 bg-white/[0.14] backdrop-blur-md transition group-hover:bg-[#00d4aa]">
                        <Play className="ml-0.5 h-6 w-6 fill-current text-white" />
                      </div>
                    </div>
                    <div className="absolute bottom-4 left-4 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/75 backdrop-blur-sm">
                      {video.category}
                    </div>
                  </div>

                  <div className="px-3 pb-1 pt-4">
                    <h3 className="text-[1.38rem] font-bold tracking-[-0.03em] text-white">
                      {video.title}
                    </h3>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-[0.88rem] text-white/[0.42]">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-6 w-6 rounded-full"
                          style={{
                            background: `linear-gradient(135deg, ${video.accent}, ${video.secondaryAccent})`,
                          }}
                        />
                        <span>{video.author}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        <span>{video.views}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4" />
                        <span>{video.likes}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="relative z-10 px-5 pb-24 pt-[4.5rem] sm:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8">
              <h2 className="text-3xl font-extrabold tracking-[-0.04em] text-white sm:text-5xl">
                Why Classia?
              </h2>
              <p className="mt-3 max-w-3xl text-lg text-white/[0.4]">
                Everything you need to turn abstract ideas into vivid learning experiences.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {features.map((feature) => {
                const Icon = feature.icon;

                return (
                  <article key={feature.title} className="classia-card min-h-[220px] px-7 py-7">
                    <div
                      className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl"
                      style={{ background: feature.iconBackground }}
                    >
                      <Icon className="h-5 w-5" style={{ color: feature.iconColor }} />
                    </div>
                    <h3 className="text-[1.65rem] font-bold tracking-[-0.04em] text-white">
                      {feature.title}
                    </h3>
                    <p className="mt-3 text-[1rem] leading-7 text-white/[0.42]">
                      {feature.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </main>

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
