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
pnpm migrate:up    # Run database migrations
pnpm migrate:down  # Rollback database migrations
pnpm cleanup-db    # Clean up database
```

## Architecture Overview

This is a React-based video editor built with Next.js 15 and Remotion. The application uses a timeline-based editing interface where users can compose videos by arranging media elements on multiple tracks.

### Core Technology Stack

- **Next.js 15** with App Router for the framework
- **Remotion 4.0** for video rendering and composition
- **Zustand** for state management across multiple stores
- **TypeScript** for type safety
- **Tailwind CSS 4** with PostCSS for styling
- **Biome** for code formatting and linting

### Key Architectural Components

#### 1. Editor Structure (`/src/features/editor/`)

The main editor is composed of three primary areas:

- **Timeline** (`timeline/`): Multi-track editing interface with drag-and-drop support
- **Scene** (`scene/`): Canvas area for preview and direct manipulation
- **Control Panels** (`control-item/`, `menu-item/`): Property editors and asset libraries

#### 2. State Management (`/src/features/editor/store/`)

Multiple Zustand stores handle different concerns:

- `use-store.ts`: Main timeline and composition state
- `use-data-state.ts`: Asset and media data management
- `use-layout-store.ts`: UI layout and panel states
- `use-upload-store.ts`: File upload handling

#### 3. Video Rendering

Remotion handles all video rendering through:

- `player/composition.tsx`: Main composition definition
- `player/video-player.tsx`: Preview player component
- API routes in `/app/api/render/` for server-side rendering

#### 4. API Integration

- **Pexels API** (`/app/api/pexels/`): Stock media integration
- **Combo.sh** (`/app/api/render/`): External rendering service
- File uploads use presigned URLs through `/app/api/uploads/`

### Important Patterns

1. **Component Organization**: UI primitives in `/components/ui/` use shadcn/ui patterns
2. **Responsive Design**: Desktop and mobile layouts handled separately in the main editor
3. **Timeline Integration**: Uses `@designcombo/timeline` and `@designcombo/events` packages
4. **Type Safety**: Comprehensive TypeScript types in `types/` directories
5. **Path Aliases**: Use `@/` for src directory imports

### Development Guidelines

1. **State Updates**: Always use the appropriate Zustand store for state management
2. **Remotion Components**: Video elements must be React components compatible with Remotion
3. **Timeline Operations**: Use the timeline store's methods for track and element manipulation
4. **File Uploads**: Handle through the upload store with presigned URL pattern
5. **Styling**: Use Tailwind CSS classes; custom styles go in component-specific CSS modules

### Environment Variables

Required for full functionality:

- `PEXELS_API_KEY`: For stock media access
- `COMBO_SH_JWT`: For video rendering service

### Code Quality

- Biome is configured for formatting - run `pnpm format` before committing
- ESLint is configured through Next.js - run `pnpm lint` to check for issues
- No test framework is currently configured
- Use playwright mcp to open a browser to localhost
