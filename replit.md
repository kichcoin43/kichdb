# KICH DB

## Overview

KICH DB is a database management system similar to Supabase, designed to provide a self-hosted backend-as-a-service solution. It offers project-based data isolation with features including:

- **Project Management**: Create and manage isolated database projects with unique API keys
- **Table Operations**: CRUD operations on tables with typed columns (text, int, boolean, timestamp, uuid, json)
- **Authentication**: User registration, login, and session management
- **File Storage**: Bucket-based file storage with public/private access controls
- **Real-time Updates**: WebSocket-based real-time data synchronization
- **Multi-platform**: Available as a web application and Electron desktop app

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture
- **Framework**: Express.js server running on port 3030
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Location**: `shared/schema.ts` defines all database tables
- **API Pattern**: RESTful API with admin endpoints (`/api/admin/*`) and project-specific endpoints (`/api/projects/*`)
- **Authentication**: Token-based admin authentication with API key validation for project access (anon keys and service keys)

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for development and production builds
- **Styling**: Tailwind CSS with custom design tokens (CSS variables for theming)
- **UI Components**: Custom component library using class-variance-authority (CVA) for variants
- **Routing**: React Router DOM for navigation between pages
- **State Management**: React hooks (useState, useEffect) for local state

### Desktop Application (Electron)
- **Location**: `kichdb-electron/` directory contains the Electron wrapper
- **Main Process**: TypeScript compiled to CommonJS (`src/main/index.ts`)
- **Renderer Process**: React app built with Vite
- **IPC**: Context bridge exposes server URLs to renderer
- **Build Targets**: Windows (portable + NSIS installer), Linux (AppImage + deb), macOS (dmg)

### Database Schema
Core tables defined in `shared/schema.ts`:
- `machines`: User/machine registration with password authentication
- `projects`: Project containers with API keys (anon and service)
- `tables`: Dynamic tables with JSONB columns and rows storage
- `authUsers`: Project-specific user authentication
- `buckets`: File storage containers
- `files`: File metadata with bucket references

### Real-time System
- WebSocket server for real-time subscriptions
- Client-side `RealtimeClient` class manages connections and subscriptions
- Supports INSERT, UPDATE, DELETE event broadcasting per table

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Schema definition and query builder (`drizzle-orm` + `drizzle-kit`)

### Deployment
- **Vercel**: Configured for serverless deployment (`vercel.json`)
  - API routes rewritten to `/api/server`
  - CORS headers configured for cross-origin requests
  - Frontend built from `kichdb-electron/dist/renderer`

### Key NPM Packages
- `express`: HTTP server framework
- `pg`: PostgreSQL client
- `cors`: CORS middleware
- `uuid`: UUID generation for IDs and API keys
- `ws`: WebSocket support (in Electron app)
- `electron` + `electron-builder`: Desktop app packaging

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Server port (defaults to 3030)
- `ADMIN_PASSWORD`: Admin authentication (defaults to 'Nokici1974')