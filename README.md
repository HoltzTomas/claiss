# Claiss 🎬✨

> **AI-powered educational video generator** - Transform text prompts into stunning visual learning content using Manim animations.

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Manim](https://img.shields.io/badge/Manim-0.18.1-blue)](https://www.manim.community/)

## 📺 Demo

[//]: # (TODO: Add demo video or GIF here)
_Coming soon - add your demo video link here_

## ✨ Features

- 🤖 **AI-Powered Scene Generation** - Describe what you want to learn, and AI creates the video script and animations
- 🎬 **Scene-Based Editing** - Videos are organized into independently editable scenes for maximum flexibility
- ⚡ **Fast Compilation** - Serverless Manim compilation via Modal.com
- 🎨 **Beautiful UI** - Modern glassmorphic design with smooth animations
- 📊 **Educational Focus** - Perfect for algorithms, data structures, physics, mathematics, and more
- 🔄 **Real-time Preview** - See your scenes as they compile
- 📦 **Video Merging** - Automatically combine scenes into a final video

## 🏗️ Architecture

Claiss is built with modern web technologies:

- **Frontend**: Next.js 14 (App Router) + React 18
- **Styling**: Tailwind CSS with custom glassmorphic components
- **AI**: Vercel AI Gateway for scene generation, currently defaulting to Gemini 2.5 Pro
- **Video Compilation**: Manim via Modal.com serverless containers
- **Storage**: Vercel Blob for video storage
- **State Management**: React hooks + LocalStorage (temporary - see [Roadmap](ROADMAP.md))

### How it Works

1. **User Input**: Describe what you want to learn in natural language
2. **AI Processing**: Vercel AI Gateway routes the prompt to the configured model and generates Manim scene code
3. **Compilation**: Modal.com compiles the Manim code into video segments
4. **Storage**: Videos are stored in Vercel Blob storage
5. **Merging**: Individual scenes are merged into a final video
6. **Preview & Edit**: Users can preview, edit, and reorder scenes

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- [Vercel AI Gateway API Key](https://vercel.com/docs/ai-gateway)
- [Modal.com Account](https://modal.com) (free tier available)
- [Vercel Account](https://vercel.com) for Blob storage

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/HoltzTomas/classia-frontend.git
   cd classia-frontend
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and fill in your API keys:
   - `AI_GATEWAY_API_KEY` - Get from [Vercel AI Gateway](https://vercel.com/docs/ai-gateway)
   - `AI_GATEWAY_MODEL` - Optional override, defaults to `google/gemini-2.5-pro`
   - `MODAL_TOKEN_SECRET` - Get from [Modal Settings](https://modal.com/settings/tokens)
   - `BLOB_READ_WRITE_TOKEN` - Get from [Vercel Dashboard](https://vercel.com/dashboard/stores)

4. **Set up Modal.com for Manim compilation**

   Install Modal CLI:
   ```bash
   pip install modal
   ```

   Authenticate Modal:
   ```bash
   modal token new
   ```

   Deploy the Manim compilation service:
   ```bash
   modal deploy modal_manim.py
   ```

5. **Run the development server**
   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
claiss/
├── app/
│   ├── api/              # API routes
│   │   ├── video-generator-scene/  # AI scene generation endpoint
│   │   ├── scene-compile/          # Scene compilation endpoint
│   │   ├── video-merge/            # Video merging endpoint
│   │   └── ...
│   ├── chat/             # Main chat interface for video creation
│   ├── page.tsx          # Landing page
│   └── layout.tsx        # Root layout
├── components/           # React components
│   ├── scene-timeline.tsx
│   ├── scene-preview.tsx
│   ├── scene-edit-modal.tsx
│   ├── video-player.tsx
│   └── ...
├── lib/
│   ├── hooks/            # Custom React hooks
│   │   ├── use-scene-manager.ts
│   │   ├── use-scene-compiler.ts
│   │   └── use-video-merger.ts
│   ├── scene-*.ts        # Scene management utilities
│   ├── modal-client*.ts  # Modal.com API clients
│   └── ...
├── modal_manim.py        # Modal.com Manim compilation service
└── package.json
```

## 🎯 Usage

### Creating a Video

1. Navigate to the chat interface (click "Start Creating" on the landing page)
2. Describe what you want to learn, for example:
   - "Show me how bubble sort works step by step"
   - "Explain the Pythagorean theorem with a visual proof"
   - "Animate binary tree traversal algorithms"
3. The AI will generate scenes and compile them automatically
4. Preview each scene as it compiles
5. Edit, reorder, or delete scenes as needed
6. Click "Merge Scenes" to create the final video

### Editing Scenes

- Click on any scene in the timeline to preview it
- Use the edit button to modify the Manim code
- Scenes recompile automatically when you save changes
- Drag and drop to reorder scenes

## 🛠️ Development

### Building for Production

```bash
pnpm build
pnpm start
```

### Linting

```bash
pnpm lint
```

## 🗺️ Roadmap

See [ROADMAP.md](ROADMAP.md) for planned features and improvements.

**Current limitations** (temporary - shipped fast for MVP):
- Video data stored in LocalStorage (not persistent across devices)
- No user authentication
- No chat history persistence
- Single-user experience

**Coming soon**:
- User authentication & accounts
- Database integration for persistent storage
- Collaborative editing
- Community video gallery

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Manim Community](https://www.manim.community/) for the amazing animation library
- [Modal.com](https://modal.com) for serverless Python execution
- [Vercel](https://vercel.com) for hosting and blob storage
- [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) for multi-provider model access

## 📞 Support

- 🐛 [Report a Bug](https://github.com/HoltzTomas/classia-frontend/issues)
- 💡 [Request a Feature](https://github.com/HoltzTomas/classia-frontend/issues)
- 💬 [Discussions](https://github.com/HoltzTomas/classia-frontend/discussions)

---

**Built with ❤️ by [Tomas Holtz](https://github.com/HoltzTomas)**
