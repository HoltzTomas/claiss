# Claiss Roadmap 🗺️

This document outlines the current state of Claiss and our vision for future development.

## 📍 Current State (v0.1.0 - MVP)

The current version is a **Minimum Viable Product** focused on core functionality:

### ✅ Implemented Features
- AI-powered scene generation using Google Gemini
- Scene-based video editing workflow
- Manim compilation via Modal.com serverless infrastructure
- Real-time scene preview and editing
- Video merging from multiple scenes
- Glassmorphic UI with smooth animations
- LocalStorage-based video/scene management

### ⚠️ Known Limitations (Technical Debt)
- **LocalStorage dependency**: Videos and scenes are stored in browser LocalStorage
  - Not persistent across devices
  - Limited storage capacity
  - No backup/recovery mechanism
- **No user authentication**: Single-user, anonymous experience
- **No chat history**: Conversations are not saved
- **No collaboration**: Users cannot share or collaborate on videos
- **Limited error recovery**: Failed compilations require manual intervention
- **No export options**: Videos can only be viewed in-browser

## 🎯 Short-term Goals (v0.2.0 - Q1 2025)

**Focus**: User management and persistent storage

### User Authentication
- [ ] Implement user authentication (Clerk/NextAuth/Supabase Auth)
- [ ] User profile pages
- [ ] Personal video libraries
- [ ] Session management

### Database Integration
- [ ] Set up PostgreSQL/Supabase database
- [ ] Migrate from LocalStorage to database
- [ ] Video metadata storage
- [ ] Scene version history
- [ ] Chat conversation persistence

### Video Management
- [ ] Video library with search and filtering
- [ ] Video metadata (title, description, tags)
- [ ] Thumbnail generation
- [ ] Video deletion and archiving
- [ ] Favorites/bookmarking system

### Developer Experience
- [ ] Better error handling and user feedback
- [ ] Comprehensive logging system
- [ ] Unit and integration tests
- [ ] E2E testing setup
- [ ] Performance monitoring

## 🚀 Mid-term Goals (v0.3.0 - Q2 2025)

**Focus**: Collaboration and community features

### Collaborative Features
- [ ] Share videos via public links
- [ ] Collaborative scene editing (real-time or async)
- [ ] Comments on videos and scenes
- [ ] Fork/remix functionality

### Community Gallery
- [ ] Public video gallery
- [ ] Like/vote system
- [ ] Featured videos
- [ ] User profiles with published videos
- [ ] Search and discovery

### Advanced Editing
- [ ] Scene templates library
- [ ] Advanced Manim code editor with syntax highlighting
- [ ] Visual scene composer (drag-and-drop elements)
- [ ] Custom animation parameters UI
- [ ] Scene duplication and cloning

### Export & Sharing
- [ ] Download videos in multiple formats (MP4, WebM, GIF)
- [ ] Quality settings (720p, 1080p, 4K)
- [ ] Embed codes for websites
- [ ] Direct sharing to YouTube/social media

## 🌟 Long-term Vision (v1.0.0 - Q3-Q4 2025)

**Focus**: Extensibility and self-hosting

### Custom Templates & Plugins
- [ ] Manim template marketplace
- [ ] Plugin system for custom animations
- [ ] Custom color schemes and themes
- [ ] Animation preset library

### Self-Hosting Options
- [ ] Docker deployment option
- [ ] Local Manim compilation (alternative to Modal)
- [ ] Self-hosted database setup guides
- [ ] Kubernetes deployment configs

### Advanced Features
- [ ] Multi-language support (i18n)
- [ ] Voice-over generation and synchronization
- [ ] Background music integration
- [ ] Interactive video elements
- [ ] LaTeX equation editor
- [ ] Code syntax highlighting in videos

### AI Enhancements
- [ ] Multiple AI model support (Claude, GPT-4, etc.)
- [ ] Fine-tuned models for educational content
- [ ] AI-suggested improvements for scenes
- [ ] Automatic scene optimization
- [ ] Natural language editing ("make the animation slower")

### Enterprise Features
- [ ] Team workspaces
- [ ] Role-based access control
- [ ] Private video repositories
- [ ] Usage analytics and insights
- [ ] Billing and subscription management

## 🔬 Research & Experiments

Future ideas under consideration:

- **Interactive tutorials**: Step-through animations with quizzes
- **Live collaboration**: Real-time editing like Google Docs
- **Mobile app**: Native iOS/Android apps
- **AR/VR integration**: View animations in 3D space
- **API for developers**: Programmatic video generation
- **Classroom integration**: LMS plugins (Canvas, Moodle)
- **Accessibility**: Screen reader support, subtitles, audio descriptions

## 🤝 Contributing to the Roadmap

We welcome community input! If you have ideas for features or improvements:

1. Check existing [GitHub Issues](https://github.com/HoltzTomas/classia-frontend/issues)
2. Open a new issue with the `feature-request` label
3. Join discussions in [GitHub Discussions](https://github.com/HoltzTomas/classia-frontend/discussions)

## 📊 Versioning Strategy

- **v0.x.x**: Pre-release versions (current)
- **v1.0.0**: First stable release with core features complete
- **v2.0.0**: Major architecture changes or breaking changes

---

**Last Updated**: October 2024

This roadmap is a living document and will be updated as priorities evolve based on community feedback and technical discoveries.
