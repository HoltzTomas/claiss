import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Classia AI - Educational Video Generator",
  description:
    "Transform ideas into visual learning with AI-powered educational videos. Create stunning Manim animations from simple prompts for algorithms, math concepts, and more.",
  keywords: [
    "AI",
    "education",
    "video generator",
    "Manim",
    "animations",
    "learning",
    "algorithms",
    "mathematics",
  ],
  authors: [{ name: "Classia Team" }],
  creator: "Classia AI",
  publisher: "Classia",
  metadataBase: new URL("https://classia.ai"),
  openGraph: {
    title: "Classia AI - Educational Video Generator",
    description:
      "Create stunning educational videos from simple prompts using AI and Manim animations",
    type: "website",
    siteName: "Classia AI",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Classia AI Educational Video Generator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Classia AI - Educational Video Generator",
    description:
      "Transform ideas into visual learning with AI-powered educational videos",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`font-sans min-h-screen scroll-y-hidden ${GeistSans.variable} ${GeistMono.variable}`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
