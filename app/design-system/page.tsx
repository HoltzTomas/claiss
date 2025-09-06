import { GlowOrb } from "@/components/glow-orb"
import { GlassCard } from "@/components/glass-card"
import { EtherealButton } from "@/components/ethereal-button"
import { FloatingNav } from "@/components/floating-nav"
import { GlowingInput } from "@/components/glowing-input"
import { TransparentBadge } from "@/components/transparent-badge"
import { EtherealProgress } from "@/components/ethereal-progress"
import { GlassModal } from "@/components/glass-modal"
import { FloatingTooltip } from "@/components/floating-tooltip"
import { EtherealChart } from "@/components/ethereal-chart"

export default function DesignSystemShowcase() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/3" />
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-accent/5 rounded-full blur-2xl" />
      <div className="absolute top-1/2 right-1/4 w-48 h-48 bg-secondary/3 rounded-full blur-xl" />

      {/* Navigation */}
      <FloatingNav />

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        <div className="text-center space-y-8 max-w-4xl">
          <GlowOrb className="mx-auto mb-12" />

          <h1 className="text-6xl md:text-8xl font-bold text-foreground mb-6 text-balance">
            Glassmorphic Design System
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground mb-12 text-pretty">
            Transparent components with frosted glass effects that create ethereal user experiences
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <EtherealButton variant="primary" size="lg">
              Explore Components
            </EtherealButton>
            <EtherealButton variant="secondary" size="lg">
              View Documentation
            </EtherealButton>
          </div>
        </div>
      </section>

      {/* Component Showcase */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">Component Library</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Each component features enhanced glassmorphism effects, subtle accents, and frosted transparency
            </p>
          </div>

          {/* Component Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Glass Cards */}
            <GlassCard className="p-6">
              <h3 className="text-xl font-semibold text-foreground mb-4">Glass Cards</h3>
              <p className="text-muted-foreground mb-4">Transparent cards with backdrop blur and subtle borders</p>
              <TransparentBadge>Glassmorphism</TransparentBadge>
            </GlassCard>

            {/* Ethereal Buttons */}
            <GlassCard className="p-6">
              <h3 className="text-xl font-semibold text-foreground mb-4">Ethereal Buttons</h3>
              <div className="space-y-3">
                <EtherealButton variant="primary" className="w-full">
                  Primary Action
                </EtherealButton>
                <EtherealButton variant="secondary" className="w-full">
                  Secondary Action
                </EtherealButton>
                <EtherealButton variant="ghost" className="w-full">
                  Ghost Button
                </EtherealButton>
              </div>
            </GlassCard>

            {/* Glowing Inputs */}
            <GlassCard className="p-6">
              <h3 className="text-xl font-semibold text-foreground mb-4">Glowing Inputs</h3>
              <div className="space-y-3">
                <GlowingInput placeholder="Enter your email..." />
                <GlowingInput placeholder="Search components..." type="search" />
              </div>
            </GlassCard>

            {/* Progress Indicators */}
            <GlassCard className="p-6">
              <h3 className="text-xl font-semibold text-foreground mb-4">Progress Indicators</h3>
              <div className="space-y-4">
                <EtherealProgress value={75} />
                <EtherealProgress value={45} variant="secondary" />
                <EtherealProgress value={90} variant="success" />
              </div>
            </GlassCard>

            {/* Floating Tooltips */}
            <GlassCard className="p-6">
              <h3 className="text-xl font-semibold text-foreground mb-4">Floating Tooltips</h3>
              <div className="flex gap-4">
                <FloatingTooltip content="This is a glowing tooltip">
                  <EtherealButton variant="ghost">Hover me</EtherealButton>
                </FloatingTooltip>
                <FloatingTooltip content="Another ethereal tooltip">
                  <TransparentBadge>Badge with tooltip</TransparentBadge>
                </FloatingTooltip>
              </div>
            </GlassCard>

            {/* Ethereal Charts */}
            <GlassCard className="p-6">
              <h3 className="text-xl font-semibold text-foreground mb-4">Ethereal Charts</h3>
              <EtherealChart />
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-12">Design System Features</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="w-16 h-16 glassmorphism rounded-full flex items-center justify-center mx-auto glow-subtle">
                <div className="w-8 h-8 bg-primary/60 rounded-full backdrop-blur-sm" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Enhanced Glassmorphism</h3>
              <p className="text-muted-foreground">Multi-layer transparency with advanced backdrop blur effects</p>
            </div>

            <div className="space-y-4">
              <div className="w-16 h-16 frosted-medium rounded-full flex items-center justify-center mx-auto">
                <div className="w-8 h-8 bg-secondary/60 rounded-full backdrop-blur-sm" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Frosted Glass</h3>
              <p className="text-muted-foreground">Subtle frosted effects with enhanced saturation and clarity</p>
            </div>

            <div className="space-y-4">
              <div className="w-16 h-16 glassmorphism-strong rounded-full flex items-center justify-center mx-auto">
                <div className="w-8 h-8 bg-gradient-to-r from-primary/60 to-accent/60 rounded-full backdrop-blur-sm" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Organic Transparency</h3>
              <p className="text-muted-foreground">Flowing forms with layered transparency for natural depth</p>
            </div>
          </div>
        </div>
      </section>

      {/* Modal Demo */}
      <GlassModal />
    </div>
  )
}
