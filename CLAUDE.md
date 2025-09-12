# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
pnpm dev          # Start development server at localhost:3000
pnpm build        # Create production build
pnpm start        # Run production server
pnpm lint         # Run Next.js ESLint checks
pnpm format       # Format code with Biome
```

### Database Management
```bash
pnpm db:generate  # Generate Drizzle schema types
pnpm db:migrate   # Run database migrations
pnpm db:push      # Push schema changes to database
pnpm db:studio    # Open Drizzle Studio GUI
pnpm db:check     # Validate schema
```

### Cleanup Commands
```bash
pnpm cleanup:cache  # Clean media cache (runs tsx scripts/cleanup-media-cache.ts)
pnpm cleanup:all    # Full reset - removes .next, node_modules, reinstalls
```

## Architecture Overview

This is a React-based video editor built with Next.js 15 and Remotion. The application uses a timeline-based editing interface where users can compose videos by arranging media elements on multiple tracks.

### Core Technology Stack

- **Next.js 15** with App Router for the framework
- **Remotion 4.0** for video rendering and composition
- **DesignCombo SDK** for timeline and state management (`@designcombo/state`, `@designcombo/events`, `@designcombo/timeline`)
- **Zustand** for state management across multiple stores
- **TypeScript** for type safety
- **Tailwind CSS 4** with PostCSS for styling
- **Biome** for code formatting and linting (configured with tabs, double quotes)
- **Drizzle ORM** with PostgreSQL for database

### Key Architectural Components

#### 1. Editor Structure (`/src/features/editor/`)

The main editor is composed of three primary areas:

- **Timeline** (`timeline/`): Multi-track editing interface with drag-and-drop support
- **Scene** (`scene/`): Canvas area for preview and direct manipulation
- **Control Panels** (`control-item/`, `menu-item/`): Property editors and asset libraries
- **Transcript** (`transcript/`): Transcript editor with timeline synchronization

#### 2. State Management (`/src/features/editor/store/`)

Multiple Zustand stores handle different concerns:

- `use-store.ts`: Main timeline and composition state
- `use-data-state.ts`: Asset and media data management
- `use-project-store.ts`: Project management with localStorage persistence
- `use-layout-store.ts`: UI layout and panel states
- `use-upload-store.ts`: File upload handling
- `use-transcript-store.ts`: Transcript segment management
- `use-crop-store.ts`: Image/video cropping state
- `use-download-state.ts`: Download operation tracking
- `use-folder.ts`: Folder organization for assets

#### 3. Video Rendering

Remotion handles all video rendering through:

- `player/composition.tsx`: Main composition definition
- `player/player.tsx`: Preview player component
- API routes in `/app/api/render/` for server-side rendering

#### 4. Database Schema

PostgreSQL database using Drizzle ORM with tables:

- **User**: Authentication and user profiles
- **Project**: Video projects with JSON fields for tracks, trackItems, transitions, compositions
- **Upload**: Media files with metadata and processing status
- **Transcription**: Audio/video transcriptions with segment data

#### 5. API Integration

- **Pexels API** (`/app/api/pexels/`): Stock media integration
- **Combo.sh** (`/app/api/render/`): External rendering service
- **ElevenLabs** (`/app/actions/transcribe.ts`): Voice transcription
- **Bytescale** (`/utils/bytescale-upload.ts`, `/utils/bytescale-url.ts`): File upload and CDN service
- File uploads use presigned URLs through `/app/api/uploads/`

### Important Patterns

1. **Component Organization**: UI primitives in `/components/ui/` use shadcn/ui patterns
2. **Responsive Design**: Desktop and mobile layouts handled separately in the main editor
3. **Timeline Integration**: Uses `@designcombo/timeline` and `@designcombo/events` packages
4. **DesignCombo Event System**: 
   - All timeline manipulations use the event-driven architecture from `@designcombo/state`
   - Events are dispatched using `dispatch` from `@designcombo/events`
   - Common events: ADD_TEXT, ADD_IMAGE, ADD_VIDEO, ADD_AUDIO, EDIT_OBJECT, LAYER_SELECT, etc.
   - See `/docs/designcombo-state-reference.md` for complete event reference
5. **Type Safety**: Comprehensive TypeScript types in `types/` directories
6. **Path Aliases**: Use `@/` for src directory imports
7. **Segment Management**: `segment-splitter.ts` utility for advanced transcript segment operations (split, merge, adjust timing)
8. **File Upload**: Bytescale integration for efficient file uploads with progress tracking

### Development Guidelines

1. **State Updates**: Always use the appropriate Zustand store for state management
2. **DesignCombo SDK Usage**: 
   - **IMPORTANT**: Always refer to `/docs/designcombo-state-reference.md` when working with DesignCombo SDK events
   - Use `dispatch` from `@designcombo/events` for all timeline operations
   - Follow event patterns from the reference documentation for adding media, editing objects, and managing layers
   - Validate DESIGN_LOAD payloads using the validation utilities before dispatch
3. **Remotion Components**: Video elements must be React components compatible with Remotion
4. **Timeline Operations**: Use the timeline store's methods for track and element manipulation
5. **File Uploads**: Handle through the upload store with Bytescale service
6. **Styling**: Use Tailwind CSS classes; custom styles go in component-specific CSS modules
7. **Database Operations**: Use Drizzle queries in `/src/db/queries/` for database access
8. **Transcript Editing**: Use TranscriptEditor component for segment editing with timeline sync
9. **Project Persistence**: Projects auto-save to localStorage via project store

### Environment Variables

Required for full functionality:

```env
# Database connection
DATABASE_URL="postgresql://localhost:5432/video_editor"

# Stock media access
PEXELS_API_KEY=""

# Video rendering service
COMBO_SH_JWT=""

# Voice transcription
NEXT_PUBLIC_ELEVENLABS_API_KEY=""

# Bytescale file upload service
BYTESCALE_ACCOUNT_ID=""
BYTESCALE_API_KEY=""
NEXT_PUBLIC_BYTESCALE_ACCOUNT_ID=""
NEXT_PUBLIC_BYTESCALE_API_KEY=""
```

### Code Quality

- Biome is configured for formatting with tabs and double quotes - run `pnpm format` before committing
- ESLint is configured through Next.js - run `pnpm lint` to check for issues
- No test framework is currently configured
- The user will run `pnpm dev` manually - do not run `pnpm dev` yourself
- You can use playwright MCP to open a browser to localhost:3000 for testing

### Documentation References

- **DesignCombo SDK**: `/docs/designcombo-state-reference.md` - Complete reference for all DesignCombo events, patterns, and usage examples
- When implementing timeline features, always consult the DesignCombo reference documentation first