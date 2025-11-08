# Video Generation/Editing Process Flow

Complete documentation of the video generation and editing pipeline in Classia.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Main Scenarios](#main-scenarios)
4. [Component Details](#component-details)
5. [External Services](#external-services)
6. [Data Flow](#data-flow)

---

## Overview

The video generation system uses a **scene-based architecture** where:
- Videos are composed of multiple independent scenes
- Each scene is a separate Manim Python class
- Scenes can be compiled in parallel
- Only modified scenes need recompilation
- Final video is created by merging compiled scenes

**Key Technologies:**
- Google Gemini 2.5 Pro (AI code generation)
- Context7 MCP (Manim documentation)
- Modal.com (Remote Python execution)
- Vercel Blob (Video storage)
- localStorage (State persistence)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER INTERACTION LAYER                        │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
          ┌──────────────────┐        ┌──────────────────┐
          │  Chat Interface  │        │  Edit Scene UI   │
          │  (useChat hook)  │        │ (SceneEditModal) │
          └────────┬─────────┘        └────────┬─────────┘
                   │                           │
                   │ sendMessage()             │ handleSceneSave()
                   ▼                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                          API ROUTE LAYER                             │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  /api/video-generator-scene          /api/scene-compile             │
│  ┌────────────────────┐              ┌─────────────────┐            │
│  │ 1. Load Video      │              │ Single/Multiple │            │
│  │ 2. Init AI Model   │              │ Scene Compile   │            │
│  │    (Gemini 2.5)    │              └────────┬────────┘            │
│  │ 3. Init Context7   │                       │                     │
│  │    (Manim docs)    │                       ▼                     │
│  │ 4. Stream AI Tools │              ┌─────────────────┐            │
│  └────────┬───────────┘              │ compileScene()  │            │
│           │                          └────────┬────────┘            │
│           │                                   │                     │
└───────────┼───────────────────────────────────┼──────────────────────┘
            │                                   │
            ▼                                   │
┌─────────────────────────────────────────────┐ │
│         AI TOOL EXECUTION                   │ │
├─────────────────────────────────────────────┤ │
│                                             │ │
│  1. analyzeTargets()                        │ │
│     ↓ Which scenes to modify?              │ │
│                                             │ │
│  2. readScenes()                            │ │
│     ↓ Get existing scene code              │ │
│                                             │ │
│  3. writeScene() ──────────────────────────┼─┘
│     ↓ Generate/modify scene code           │
│     │                                       │
│     └→ writeSceneCodeTool                   │
└─────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     COMPILATION PIPELINE                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  compileManimCode(pythonCode, className)                            │
│          │                                                          │
│          ├─→ OPTION 1: Modal HTTP (preferred)                      │
│          │   ┌───────────────────────────────────┐                 │
│          │   │ Modal.com Remote Compilation      │                 │
│          │   │ - Fast cloud execution            │                 │
│          │   │ - Returns video_bytes_base64      │                 │
│          │   └───────────────┬───────────────────┘                 │
│          │                   │                                     │
│          └─→ OPTION 2: Local (fallback)                            │
│              ┌───────────────────────────────────┐                 │
│              │ System Manim CLI                  │                 │
│              │ - manim -ql scene.py ClassName    │                 │
│              │ - Saves to /tmp/                  │                 │
│              └───────────────┬───────────────────┘                 │
│                              │                                     │
│                              ▼                                     │
│                    ┌──────────────────┐                            │
│                    │ Upload to Blob   │                            │
│                    │ (Vercel Blob)    │                            │
│                    └────────┬─────────┘                            │
│                             │                                      │
│                             ▼                                      │
│                    ┌──────────────────┐                            │
│                    │ Return videoUrl  │                            │
│                    │ + videoId        │                            │
│                    └────────┬─────────┘                            │
└─────────────────────────────┼──────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    STATE MANAGEMENT LAYER                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  useSceneManager() Hook                                             │
│  ┌──────────────────────────────────────────┐                      │
│  │ • createScene(sceneData)                 │                      │
│  │ • updateScene(sceneId, changes)          │                      │
│  │ • updateSceneStatus(sceneId, videoUrl)   │                      │
│  │ • deleteScene(sceneId)                   │                      │
│  │ • reorderScene(sceneId, position)        │                      │
│  └──────────────────┬───────────────────────┘                      │
│                     │                                               │
│                     ▼                                               │
│  SceneManager Class                                                 │
│  ┌──────────────────────────────────────────┐                      │
│  │ saveVideo(video)                         │                      │
│  │   ↓                                      │                      │
│  │ localStorage['classia-scene-video-..']   │                      │
│  └──────────────────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    VIDEO MERGE PROCESS                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  User clicks "Merge Scenes"                                         │
│          ↓                                                          │
│  useVideoMerger().mergeScenes()                                     │
│          ↓                                                          │
│  POST /api/video-merge                                              │
│  ┌────────────────────────────────────────┐                        │
│  │ 1. Validate all scenes compiled        │                        │
│  │ 2. Extract videoUrls from scenes       │                        │
│  │ 3. Call Modal merge endpoint           │                        │
│  │    - Receives multiple video URLs      │                        │
│  │    - Merges with transitions           │                        │
│  │    - Returns merged video bytes        │                        │
│  │ 4. Upload to Vercel Blob               │                        │
│  │ 5. Return finalVideoUrl                │                        │
│  └────────────────┬───────────────────────┘                        │
│                   │                                                 │
│                   ▼                                                 │
│  updateFinalVideo(videoUrl)                                         │
│          ↓                                                          │
│  video.finalVideoUrl = url                                          │
│  sceneManager.saveVideo()                                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Main Scenarios

### Scenario 1: New Video Generation (AI-Driven)

```
User: "Create a video showing the Pythagorean theorem"
   ↓
useChat.sendMessage()
   ↓
/api/video-generator-scene
   ├→ AI analyzes request
   ├→ Decides on 3 scenes:
   │  1. Introduction scene
   │  2. Triangle construction scene
   │  3. Proof demonstration scene
   │
   └→ Executes for each scene:
       analyzeTargets() → "create new scene 1"
       writeScene()
         ├→ Generates Manim Python code
         ├→ Calls compileManimCode()
         │  └→ Modal compilation → videoUrl
         └→ Returns { videoUrl, isNewScene: true }

onFinish() receives all tool results
   ├→ createScene(scene1, position: 0)
   ├→ createScene(scene2, position: 1)
   ├→ createScene(scene3, position: 2)
   └→ sceneManager.saveVideo() → localStorage

Result: Video with 3 compiled scenes ready
```

**Key Files:**
- `app/chat/page.tsx:52-113` - useChat initialization
- `app/api/video-generator-scene/route.ts` - AI processing
- `lib/scene-code-tools.ts:6-107` - writeSceneCodeTool

### Scenario 2: Editing Existing Video (Manual)

```
User selects scene → clicks "Edit"
   ↓
SceneEditModal opens
   ├→ Shows current code
   └→ User modifies code (e.g., changes color)

User clicks "Save Scene"
   ↓
handleSceneSave()
   ├→ updateScene(sceneId, { code: newCode, status: 'compiling' })
   └→ compileScene(scene)
       ↓
       POST /api/scene-compile (mode: 'single')
       ↓
       compileManimCode() → Modal → videoUrl
       ↓
       updateSceneStatus(sceneId, 'compiled', videoUrl)

Result: Scene recompiled with new video
```

**Key Files:**
- `components/scene-edit-modal.tsx` - Edit UI
- `app/api/scene-compile/route.ts` - Compilation endpoint
- `lib/hooks/use-scene-compiler.ts` - Compilation hook

### Scenario 3: Editing via AI Chat

```
User: "Make the circle in scene 2 blue instead of red"
   ↓
useChat.sendMessage()
   ↓
/api/video-generator-scene
   ├→ analyzeTargets()
   │  └→ Returns: targetScenes: ['scene-2'], action: 'modify'
   │
   ├→ readScenes({ sceneIds: ['scene-2'], detailed: true })
   │  └→ Returns full code of scene 2
   │
   └→ writeScene()
       ├→ Modifies code: Circle(color=RED) → Circle(color=BLUE)
       ├→ Compiles via Modal
       └→ Returns { videoUrl, isNewScene: false }

onFinish()
   └→ updateScene('scene-2', { code, videoUrl })

Result: Scene 2 updated with blue circle
```

**Key Files:**
- `lib/scene-code-tools.ts:255-336` - analyzeSceneTargetsTool
- `lib/scene-code-tools.ts:109-174` - readScenesTool
- `lib/scene-code-tools.ts:6-107` - writeSceneCodeTool

---

## Component Details

### Frontend Entry Point

**File:** `app/chat/page.tsx:52-113`

```typescript
const { messages, sendMessage, status } = useChat({
  transport: new DefaultChatTransport({
    api: "/api/video-generator-scene",
    body: {
      videoId: currentVideoId,
      mode: 'scene'
    },
  }),
  onFinish: async ({ message }) => {
    // Extracts tool results from AI response
    // Creates or updates scenes based on writeScene results
  },
});
```

**Responsibilities:**
- Initialize chat with AI model
- Stream user messages to backend
- Process tool results (writeScene, readScenes, etc.)
- Update local state with new/modified scenes

---

### AI Processing Route

**File:** `app/api/video-generator-scene/route.ts`

**Main Function:** `POST(req: Request)`

**Flow:**
1. Parse request body (messages, videoId, mode)
2. Load existing video from SceneManager if videoId provided
3. Initialize Context7 MCP client for Manim documentation
4. Configure AI model (Google Gemini 2.5 Pro)
5. Build system prompt with:
   - Scene-based architecture instructions
   - Available tools (analyzeTargets, readScenes, writeScene, sceneOperation)
   - Current video structure (if editing)
6. Call `streamText()` to generate AI response
7. Stream back tool calls and results

**Key Configuration:**
```typescript
const result = streamText({
  model: google("gemini-2.5-pro"),
  system: systemPrompt, // Includes scene context
  messages: convertToModelMessages(messages),
  tools: {
    analyzeTargets: analyzeSceneTargetsTool,
    readScenes: readScenesTool,
    writeScene: writeSceneCodeTool,
    sceneOperation: sceneOperationTool,
  },
  experimental_activeTools: ['analyzeTargets', 'readScenes', 'writeScene'],
});
```

---

### AI Tools

**File:** `lib/scene-code-tools.ts`

#### 1. writeSceneCodeTool (Lines 6-107)

**Purpose:** Generate or modify a single scene's code and compile it

**Parameters:**
- `sceneCode` (string) - Complete Manim Python code
- `sceneName` (string) - Human-readable name
- `sceneDescription` (string) - What the scene does
- `videoId` (string, optional) - Video being edited

**Process:**
1. Validate code structure (imports, class definition)
2. Extract class name from code
3. Call `compileManimCode(code, className)`
4. Determine if scene is new or existing
5. Return compilation result with videoUrl

**Returns:**
```typescript
{
  success: boolean;
  videoUrl?: string;
  videoId?: string;
  isNewScene: boolean;
  sceneName: string;
  error?: string;
}
```

#### 2. readScenesTool (Lines 109-174)

**Purpose:** Read existing scenes from a video

**Parameters:**
- `videoId` (string) - Video to read from
- `sceneIds` (string[], optional) - Specific scenes to read
- `detailed` (boolean) - Include full code or just overview

**Returns:**
```typescript
{
  success: boolean;
  scenes: Array<{
    id: string;
    name: string;
    order: number;
    status: string;
    code?: string; // Only if detailed=true
  }>;
}
```

#### 3. analyzeSceneTargetsTool (Lines 255-336)

**Purpose:** Analyze user request to determine which scenes to target

**Parameters:**
- `userRequest` (string) - What user wants to do
- `videoId` (string) - Current video ID

**Process:**
1. Load current video structure
2. Analyze user intent
3. Identify target scenes by name/description match
4. Recommend action (create, modify, delete)

**Returns:**
```typescript
{
  targetScenes: string[]; // Scene IDs
  action: 'create' | 'modify' | 'delete';
  reasoning: string;
}
```

#### 4. sceneOperationTool (Lines 176-253)

**Purpose:** Perform scene operations (delete, reorder, split)

**Parameters:**
- `operation` (object) - Operation details
- `videoId` (string) - Target video

**Supported Operations:**
- `{ type: 'delete', sceneId: string }`
- `{ type: 'reorder', sceneId: string, newPosition: number }`
- `{ type: 'split', sceneId: string, splitPoint: string }`

---

### Compilation Pipeline

**File:** `lib/manim-compiler.ts`

**Main Function:** `compileManimCode(pythonCode: string, className: string)`

**Compilation Strategy:**

```typescript
// Priority 1: Modal HTTP (remote, fast)
if (USE_MODAL) {
  try {
    const result = await defaultModalHttpClient.compileAnimation({
      python_code: pythonCode,
      class_name: className,
      quality: 'low_quality'
    });
    // Upload video_bytes to Vercel Blob
    return { videoUrl, videoId };
  } catch (error) {
    // Fall through to local if MODAL_FALLBACK_TO_LOCAL=true
  }
}

// Priority 2: Local Manim CLI (fallback)
if (MODAL_FALLBACK_TO_LOCAL) {
  // Write code to temp file
  // Execute: manim -ql scene.py ClassName
  // Upload /tmp/media/videos/scene/480p15/ClassName.mp4 to Blob
  return { videoUrl, videoId };
}
```

**Environment Variables:**
- `USE_MODAL` - Enable Modal compilation (default: true)
- `MODAL_FALLBACK_TO_LOCAL` - Allow local fallback (default: false)
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob credentials

**Returns:**
```typescript
{
  success: boolean;
  videoUrl?: string;
  videoId?: string;
  error?: string;
}
```

---

### Scene Compilation API

**File:** `app/api/scene-compile/route.ts`

**Endpoint:** `POST /api/scene-compile`

**Modes:**

#### Single Scene Compilation
```typescript
{
  mode: 'single',
  scene: Scene
}
```

#### Multiple Scene Compilation (Parallel)
```typescript
{
  mode: 'multiple',
  scenes: Scene[]
}
```

**Response:**
```typescript
// Single mode
{
  success: boolean;
  result: SceneCompilationResult;
  duration: string;
}

// Multiple mode
{
  success: boolean;
  results: SceneCompilationResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
  duration: string;
}
```

---

### State Management

**File:** `lib/scene-manager.ts`

**Class:** `SceneManager`

**Key Methods:**

```typescript
class SceneManager {
  // Video operations
  createVideoFromCode(code: string, title: string): Video;
  getVideo(videoId: string): Video | null;
  getLatestVideo(): Video | null;
  saveVideo(video: Video): void;

  // Scene operations
  applyOperation(videoId: string, operation: SceneOperation): Video;
  updateSceneStatus(
    videoId: string,
    sceneId: string,
    status: Scene['status'],
    videoUrl?: string
  ): Video;

  // Compilation tracking
  getPendingScenes(videoId: string): Scene[];
  areAllScenesCompiled(videoId: string): boolean;
}
```

**Storage:**
- Key: `classia-scene-video-{videoId}`
- Key: `classia-scene-latest-video` (stores latest video ID)
- Uses browser localStorage

---

### Frontend Hooks

#### useSceneManager()

**File:** `lib/hooks/use-scene-manager.ts`

**Purpose:** Manage video and scene CRUD operations

**Returns:**
```typescript
{
  video: Video | null;
  loading: boolean;
  error: string | null;

  // Video operations
  loadVideo(id?: string): Promise<void>;
  createVideoFromCode(code: string, title: string): Promise<Video>;
  updateFinalVideo(url: string, duration?: number): void;

  // Scene operations
  createScene(sceneData: Partial<Scene>, position?: number): void;
  updateScene(sceneId: string, changes: Partial<Scene>): void;
  deleteScene(sceneId: string): void;
  reorderScene(sceneId: string, newPosition: number): void;
  updateSceneStatus(
    sceneId: string,
    status: Scene['status'],
    videoUrl?: string,
    videoId?: string,
    errorMsg?: string
  ): void;

  // Status checks
  getCompilationProgress(): { completed: number; total: number };
  isReadyToMerge(): boolean;
}
```

#### useSceneCompiler()

**File:** `lib/hooks/use-scene-compiler.ts`

**Purpose:** Compile individual scenes

**Returns:**
```typescript
{
  compileScene(scene: Scene): Promise<SceneCompilationResult>;
  compileScenes(scenes: Scene[]): Promise<SceneCompilationResult[]>;
  isCompiling(sceneId: string): boolean;
  getError(sceneId: string): string | undefined;
  clearError(sceneId: string): void;
  compilingCount: number;
}
```

**Usage:**
```typescript
const { compileScene } = useSceneCompiler();

// Single scene
await compileScene(scene);

// Multiple scenes (parallel)
await compileScenes([scene1, scene2, scene3]);
```

#### useVideoMerger()

**File:** `lib/hooks/use-video-merger.ts`

**Purpose:** Merge compiled scenes into final video

**Returns:**
```typescript
{
  mergeScenes(
    videoIdOrScenes: string | Scene[],
    scenesOrOptions?: Scene[] | MergeOptions,
    optionsParam?: MergeOptions
  ): Promise<MergeResult>;
  checkMergeReadiness(videoId: string): boolean;
  merging: boolean;
  mergeProgress: number;
  error: string | null;
  clearError(): void;
}
```

**Usage:**
```typescript
const { mergeScenes, checkMergeReadiness } = useVideoMerger();

// Check if ready
if (checkMergeReadiness(videoId)) {
  const result = await mergeScenes(videoId, scenes);
  // result.videoUrl contains final video URL
}
```

---

### Video Merge API

**File:** `app/api/video-merge/route.ts`

**Endpoint:** `POST /api/video-merge`

**Request:**
```typescript
{
  videoId?: string; // Optional, for logging
  scenes: Scene[]; // Must all be compiled
  options?: {
    addTransitions?: boolean;
    transitionDuration?: number;
  }
}
```

**Process:**
1. Validate all scenes are compiled
2. Filter scenes: `status === 'compiled' && videoUrl exists`
3. Extract video URLs from scenes
4. Call Modal merge endpoint:
   ```typescript
   defaultModalHttpClient.mergeVideos({
     video_urls: [url1, url2, url3],
     add_transitions: false,
     transition_duration: 0.5
   })
   ```
5. Upload merged video to Vercel Blob
6. Return final video URL

**Response:**
```typescript
{
  success: boolean;
  videoUrl: string;
  videoId: string;
  duration: string; // Time taken
  mergeTime: number; // Modal processing time
  sceneCount: number;
}
```

---

### Modal Client

**File:** `lib/modal-client-http.ts`

**Class:** `ModalHttpClient`

**Endpoints:**

#### Compilation Endpoint
```
https://holtztomas--classia-manim-compiler-compile-manim-web-endpoint.modal.run
```

**Request:**
```typescript
{
  python_code: string;
  class_name: string;
  quality: 'low_quality' | 'medium_quality' | 'high_quality';
}
```

**Response:**
```typescript
{
  success: boolean;
  video_bytes_base64: string;
  logs: string;
  duration: number;
}
```

#### Merge Endpoint
```
https://holtztomas--classia-manim-compiler-merge-videos-web-endpoint.modal.run
```

**Request:**
```typescript
{
  video_urls: string[];
  add_transitions: boolean;
  transition_duration: number;
}
```

**Response:**
```typescript
{
  success: boolean;
  video_bytes_base64: string;
  duration: number;
}
```

**Methods:**
```typescript
class ModalHttpClient {
  compileAnimation(request: CompileRequest): Promise<CompileResponse>;
  mergeVideos(request: MergeRequest): Promise<MergeResponse>;
  healthCheck(): Promise<boolean>;
}
```

---

## External Services

### 1. Google Gemini 2.5 Pro

**Purpose:** AI model for code generation

**Model ID:** `google("gemini-2.5-pro")`

**Usage:**
- Analyzes user prompts
- Generates Manim Python code
- Decides scene structure
- Modifies existing scenes

**Configuration:**
```typescript
streamText({
  model: google("gemini-2.5-pro"),
  system: systemPrompt,
  messages: convertToModelMessages(messages),
  tools: { ... },
  experimental_activeTools: ['analyzeTargets', 'readScenes', 'writeScene'],
});
```

### 2. Context7 MCP

**Purpose:** Provides up-to-date Manim documentation

**Endpoint:** `https://mcp.context7.com/mcp`

**Library:** `/3b1b/manim`

**Usage:**
```typescript
const mcpClient = experimental_createMCPClient(
  'context7-manim',
  {
    url: 'https://mcp.context7.com/mcp',
    headers: { Authorization: `Bearer ${process.env.CONTEXT7_API_KEY}` }
  }
);
```

**Provides AI with:**
- Manim class references
- Animation examples
- Best practices
- API documentation

### 3. Modal.com

**Purpose:** Remote Python execution for Manim

**Endpoints:**
- Compilation: `https://holtztomas--classia-manim-compiler-compile-manim-web-endpoint.modal.run`
- Merge: `https://holtztomas--classia-manim-compiler-merge-videos-web-endpoint.modal.run`

**Benefits:**
- No local Python/Manim installation required
- Fast cloud execution
- Consistent environment
- Handles dependencies automatically

### 4. Vercel Blob

**Purpose:** Cloud storage for MP4 files

**Usage:**
```typescript
import { put } from '@vercel/blob';

const blob = await put(`videos/${videoId}.mp4`, videoBuffer, {
  access: 'public',
});

// blob.url contains public URL
```

**Configuration:**
- Environment variable: `BLOB_READ_WRITE_TOKEN`
- Automatic CDN distribution
- Public access for video playback

---

## Data Flow

### Data Storage Architecture

```
┌─────────────────────────────────────────────┐
│           Browser localStorage               │
├─────────────────────────────────────────────┤
│                                             │
│  Key: classia-scene-video-{videoId}         │
│  Value: {                                   │
│    id: string                               │
│    title: string                            │
│    scenes: [                                │
│      {                                      │
│        id: string                           │
│        name: string                         │
│        code: string (Python)                │
│        order: number                        │
│        status: 'pending'|'compiled'|...     │
│        videoUrl?: string (Blob URL)         │
│        videoId?: string                     │
│      }                                      │
│    ]                                        │
│    finalVideoUrl?: string                   │
│  }                                          │
│                                             │
│  Key: classia-scene-latest-video            │
│  Value: videoId (string)                    │
└─────────────────────────────────────────────┘
         ↕ (SceneManager)
┌─────────────────────────────────────────────┐
│         React State (useSceneManager)        │
├─────────────────────────────────────────────┤
│  video: Video | null                        │
│  loading: boolean                           │
│  error: string | null                       │
└─────────────────────────────────────────────┘
```

### Message Flow (New Video)

```
1. User types: "Create a bouncing ball animation"

2. Frontend (useChat)
   └→ POST /api/video-generator-scene
      Body: {
        messages: [...],
        videoId: null, // New video
        mode: 'scene'
      }

3. Backend Route
   ├→ Initialize Gemini 2.5 Pro
   ├→ Load Context7 (Manim docs)
   └→ Stream AI response with tools

4. AI Tool Execution
   ├→ analyzeTargets()
   │  Returns: { action: 'create', targetScenes: [] }
   │
   └→ writeScene()
      ├→ Generates Python code
      ├→ Calls compileManimCode()
      │  ├→ POST to Modal compile endpoint
      │  ├→ Modal returns video_bytes_base64
      │  ├→ Upload to Vercel Blob
      │  └→ Returns videoUrl
      └→ Returns {
           success: true,
           videoUrl: "https://...",
           videoId: "vid_123",
           isNewScene: true
         }

5. Frontend onFinish()
   ├→ Extract tool results
   ├→ createScene({
   │    id: "scene_1",
   │    code: "...",
   │    videoUrl: "https://...",
   │    status: "compiled"
   │  })
   └→ sceneManager.saveVideo()
      └→ localStorage['classia-scene-video-vid_123'] = video

6. UI Update
   ├→ Display scene in scene list
   ├→ Show video preview
   └→ Enable merge button (if multiple scenes)
```

### Message Flow (Edit Scene)

```
1. User clicks "Edit" on Scene 2

2. SceneEditModal opens
   ├→ Shows current code
   └→ User modifies: Circle(color=RED) → Circle(color=BLUE)

3. User clicks "Save Scene"

4. handleSceneSave()
   ├→ updateScene('scene_2', {
   │    code: newCode,
   │    status: 'compiling'
   │  })
   │  └→ UI shows "Compiling..."
   │
   └→ compileScene(scene)
      └→ POST /api/scene-compile
         Body: {
           mode: 'single',
           scene: { id: 'scene_2', code: '...', ... }
         }

5. Backend Compilation
   ├→ Extract className from code
   ├→ compileManimCode(code, className)
   │  ├→ Modal compilation
   │  ├→ Upload to Blob
   │  └→ Returns videoUrl
   └→ Response: {
        success: true,
        result: {
          sceneId: 'scene_2',
          videoUrl: 'https://...',
          status: 'compiled'
        }
      }

6. Frontend Update
   └→ updateSceneStatus('scene_2', 'compiled', videoUrl)
      ├→ video.scenes[1].status = 'compiled'
      ├→ video.scenes[1].videoUrl = videoUrl
      ├→ sceneManager.saveVideo()
      └→ UI shows updated video preview
```

### Merge Flow

```
1. User clicks "Merge Scenes"

2. Frontend Validation
   ├→ isReadyToMerge()
   │  └→ All scenes status === 'compiled'?
   └→ If yes, proceed

3. mergeScenes(videoId, scenes)
   └→ POST /api/video-merge
      Body: {
        videoId: 'vid_123',
        scenes: [
          { id: 'scene_1', videoUrl: 'https://...' },
          { id: 'scene_2', videoUrl: 'https://...' },
          { id: 'scene_3', videoUrl: 'https://...' }
        ]
      }

4. Backend Merge
   ├→ validateScenes(scenes)
   │  └→ Check all have videoUrls
   │
   ├→ Extract video URLs: [url1, url2, url3]
   │
   ├→ defaultModalHttpClient.mergeVideos({
   │    video_urls: [url1, url2, url3],
   │    add_transitions: false
   │  })
   │  └→ Modal downloads videos, merges, returns bytes
   │
   ├→ Upload merged video to Vercel Blob
   │  └→ finalVideoUrl = blob.url
   │
   └→ Response: {
        success: true,
        videoUrl: finalVideoUrl,
        sceneCount: 3,
        duration: '5.2s'
      }

5. Frontend Update
   └→ updateFinalVideo(videoUrl)
      ├→ video.finalVideoUrl = videoUrl
      ├→ video.status = 'ready'
      ├→ sceneManager.saveVideo()
      └→ Navigate to "Final Video" tab
```

---

## Scene Types & Interfaces

**File:** `lib/scene-types.ts`

### Scene Interface

```typescript
interface Scene {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  code: string;                  // Manim Python code
  order: number;                 // Position in sequence
  duration?: number;             // Video length (seconds)
  status: SceneStatus;           // Compilation status
  videoUrl?: string;             // Compiled video URL
  videoId?: string;              // Video file ID
  error?: string;                // Compilation error
  dependencies?: string[];       // Dependent scene IDs
  sharedObjects?: string[];      // Objects used by other scenes
  createdAt: Date;
  updatedAt: Date;
}

type SceneStatus =
  | 'pending'    // Not compiled yet
  | 'compiling'  // Currently compiling
  | 'compiled'   // Successfully compiled
  | 'failed';    // Compilation error
```

### Video Interface

```typescript
interface Video {
  id: string;                    // Unique identifier
  title: string;                 // Display name
  description?: string;          // Optional description
  scenes: Scene[];               // All scenes in order
  finalVideoUrl?: string;        // Merged video URL
  totalDuration?: number;        // Total length (seconds)
  status: VideoStatus;           // Overall status
  createdAt: Date;
  updatedAt: Date;
}

type VideoStatus =
  | 'draft'      // Being created
  | 'compiling'  // Scenes compiling
  | 'ready'      // All scenes compiled or final video merged
  | 'failed';    // Compilation error
```

### Scene Operations

```typescript
type SceneOperation =
  | {
      type: 'create';
      scene: Partial<Scene>;
      position: number;
    }
  | {
      type: 'modify';
      sceneId: string;
      changes: Partial<Scene>;
    }
  | {
      type: 'delete';
      sceneId: string;
    }
  | {
      type: 'reorder';
      sceneId: string;
      newPosition: number;
    }
  | {
      type: 'split';
      sceneId: string;
      splitPoint: string;
    };
```

### Compilation Results

```typescript
interface SceneCompilationResult {
  sceneId: string;
  success: boolean;
  videoUrl?: string;
  videoId?: string;
  error?: string;
  duration?: number;
}

interface MergeResult {
  success: boolean;
  videoUrl?: string;
  videoId?: string;
  error?: string;
  duration: string;
  sceneCount: number;
}
```

---

## Key Benefits of Scene-Based Architecture

1. **Fast Iteration**
   - Only recompile modified scenes
   - No need to regenerate entire video

2. **Parallel Compilation**
   - Multiple scenes compile simultaneously
   - Significantly faster than sequential

3. **Granular Control**
   - Edit individual scenes independently
   - Reorder scenes without recompilation
   - Delete/add scenes easily

4. **AI Context Awareness**
   - AI knows existing scene structure
   - Can modify specific scenes
   - Maintains consistency across scenes

5. **Better Error Handling**
   - Failed scene doesn't affect others
   - Easy to identify problematic code
   - Can retry single scene

6. **Scalability**
   - Handle long videos with many scenes
   - Each scene remains manageable
   - Merge process handles any number of scenes

---

## File Reference

| Component | File Path |
|-----------|-----------|
| Chat UI | `app/chat/page.tsx` |
| AI Route | `app/api/video-generator-scene/route.ts` |
| Scene Compile API | `app/api/scene-compile/route.ts` |
| Video Merge API | `app/api/video-merge/route.ts` |
| Scene Operations API | `app/api/scene-operations/route.ts` |
| AI Tools | `lib/scene-code-tools.ts` |
| Manim Compiler | `lib/manim-compiler.ts` |
| Scene Compiler | `lib/scene-compiler.ts` |
| Scene Manager | `lib/scene-manager.ts` |
| Scene Parser | `lib/scene-parser.ts` |
| Modal Client | `lib/modal-client-http.ts` |
| Scene Types | `lib/scene-types.ts` |
| useSceneManager | `lib/hooks/use-scene-manager.ts` |
| useSceneCompiler | `lib/hooks/use-scene-compiler.ts` |
| useVideoMerger | `lib/hooks/use-video-merger.ts` |
| Scene Edit Modal | `components/scene-edit-modal.tsx` |

---

## Environment Variables

```bash
# AI Model
GOOGLE_GENERATIVE_AI_API_KEY=...

# Context7 MCP (Manim docs)
CONTEXT7_API_KEY=...

# Modal Configuration
USE_MODAL=true
MODAL_FALLBACK_TO_LOCAL=false

# Video Storage
BLOB_READ_WRITE_TOKEN=...
```

---

## Troubleshooting

### Scene Compilation Fails

**Check:**
1. Modal endpoint is accessible
2. Python code has valid Manim syntax
3. Class name matches code
4. Required imports are present

**Solutions:**
- Enable `MODAL_FALLBACK_TO_LOCAL` for local compilation
- Check Modal logs for detailed errors
- Validate code structure before compilation

### Video Merge Fails

**Check:**
1. All scenes have `status === 'compiled'`
2. All scenes have valid `videoUrl`
3. Scene order is sequential (no gaps)
4. Modal merge endpoint is accessible

**Solutions:**
- Recompile failed scenes
- Check console for validation errors
- Verify Blob URLs are accessible

### localStorage Issues

**Check:**
1. Browser localStorage is enabled
2. Storage quota not exceeded
3. Video ID is valid

**Solutions:**
- Clear old videos from localStorage
- Export important videos before clearing
- Check browser console for storage errors

---

## Future Improvements

1. **Scene Dependencies**
   - Automatic detection of scene dependencies
   - Smart compilation order
   - Shared object management

2. **Caching**
   - Cache compiled scenes
   - Reuse unchanged scenes
   - Faster merge process

3. **Collaboration**
   - Backend database instead of localStorage
   - Multi-user editing
   - Version control for scenes

4. **Advanced Editing**
   - Visual scene editor
   - Drag-and-drop scene reordering
   - Real-time preview

5. **Performance**
   - Incremental compilation
   - Background compilation
   - Progressive video loading

---

*Last updated: 2025-11-08*
