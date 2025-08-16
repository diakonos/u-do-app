# U-Do App - Developer Guide

A task management app built with Expo React Native, Convex backend, and Better Auth authentication.

## 🏗️ Architecture

### Core Components
- **Frontend**: Expo React Native app with TypeScript and Tailwind CSS
- **Backend**: Convex serverless functions and database 
- **Auth**: Better Auth integration with Convex plugin
- **Supabase**: Additional serverless functions and database migrations (legacy/auxiliary)

### Data Flow
1. **Frontend** (Expo) connects to **Convex** for all database operations (tasks, friends, users)
2. **Better Auth** handles authentication via Convex plugin with email/password + OTP flows
3. **Resend** integration for sending emails (verification, password reset)
4. **Supabase** functions provide auxiliary serverless capabilities

### Tech Stack
- **Frontend**: Expo 52, React Native 0.76, TypeScript, Tailwind CSS (NativeWind)
- **Backend**: Convex, Better Auth, Resend
- **Build**: Turbo (Turborepo), npm workspaces
- **Testing**: Jest, jest-expo
- **Linting**: ESLint, Prettier

## 📁 Directory Structure

```
u-do-app/
├── turbo.json                 # Turborepo configuration
├── package.json              # Root workspace config
├── WARP.md                   # This file
└── apps/
    ├── frontend/             # Expo React Native app
    │   ├── app/              # File-based routing (expo-router)
    │   │   ├── (tabs)/       # Tab navigation routes
    │   │   ├── _layout.tsx   # Root layout
    │   │   └── login.tsx     # Auth screens
    │   ├── components/       # React components
    │   ├── lib/              # Utilities and helpers
    │   └── package.json      # Frontend dependencies
    ├── backend/              # Convex backend
    │   ├── convex/           # Convex functions
    │   │   ├── schema.ts     # Database schema
    │   │   ├── auth.ts       # Better Auth config
    │   │   ├── tasks.ts      # Task queries/mutations
    │   │   ├── friends.ts    # Friend system logic
    │   │   └── users.ts      # User management
    │   ├── src/              # Frontend dev server (Vite)
    │   └── package.json      # Backend dependencies
    ├── auth/                 # Minimal auth package
    └── supabase/             # Supabase functions (auxiliary)
        └── supabase/
            └── functions/    # Edge functions
```

## ⚙️ Commands

### Monorepo Commands (run from root)

```bash
# Install all dependencies
npm install

# Build all apps
npx turbo build

# Run development mode for all apps
npx turbo dev

# Lint all apps
npx turbo lint

# Type checking across workspace
npx turbo check-types
```

### Frontend Commands (from `apps/frontend/`)

```bash
# Start Expo development server
npm start                # expo start --localhost

# Platform-specific builds
npm run android         # expo run:android
npm run ios            # expo run:ios 
npm run web            # expo start --web

# Testing and Quality
npm test               # jest --watchAll
npm run lint           # eslint . --ext .js,.jsx,.ts,.tsx
npm run lint:fix       # eslint with --fix
npm run format         # prettier --write

# Web build
npm run build:web      # expo export + workbox SW generation
```

### Backend Commands (from `apps/backend/`)

```bash
# Development (parallel frontend + backend)
npm run dev            # Runs Convex dev + Vite frontend

# Individual services
npm run dev:frontend   # vite --open (dev dashboard)
npm run dev:backend    # convex dev
npm run predev         # convex dev --until-success && convex dashboard

# Build and deploy
npm run build          # tsc -b && vite build
npm run preview        # vite preview

# Quality checks
npm run lint           # tsc && eslint
```

## 🗄️ Database Schema

Convex tables defined in `apps/backend/convex/schema.ts`:

### Core Tables
- **users**: User profiles (`email`, `name`, `username`, `updatedAt`)
- **tasks**: Task management (`user_id`, `task_name`, `due_date`, `is_done`, `is_private`, `assigned_by`, `updated_at`)

### Social Features  
- **friendRequests**: Friend request system (`requester_id`, `recipient_id`, `status`)
- **friendships**: Accepted friendships (`user_id`, `friend_id`, `status`)
- **pinnedFriends**: Favorite friends (`user_id`, `friend_id`)
- **friendPermissions**: Task creation permissions (`user_id`, `friend_id`, `can_create_tasks`)

### Key Indexes
- Users: `by_email`, `by_username`
- Tasks: `by_user`, `by_user_due_date`, `by_user_done`, `by_assigned_by`
- Friends: `by_requester`, `by_recipient`, `by_user_friend`

## 🔐 Authentication & Configuration

### Better Auth Integration
- **Server**: Convex plugin (`@convex-dev/better-auth`) with email/password + OTP
- **Client**: Expo client (`@better-auth/expo`) with secure storage
- **Email**: Resend integration for verification and password reset

### Environment Variables

Backend (`.env.local`):
```bash
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=your-secret-key-here
CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOY_KEY=your-deploy-key
```

### Key Config Files
- `apps/backend/convex.config.ts`: Convex configuration with Better Auth
- `apps/backend/convex/auth.ts`: Better Auth server setup
- `apps/frontend/app/_layout.tsx`: Auth client initialization

## 🧪 Testing & Quality

### Testing Commands
```bash
# Frontend tests
cd apps/frontend && npm test        # Jest with jest-expo preset

# Type checking  
cd apps/backend && npm run lint     # TypeScript + ESLint
npx turbo check-types              # Workspace-wide type checking
```

### Code Quality Tools
- **ESLint**: TypeScript, React, React Native rules
- **Prettier**: Code formatting across `.js,.jsx,.ts,.tsx,.json,.md`
- **TypeScript**: Strict mode with workspace references

### Test Frameworks
- **Jest**: Unit testing with jest-expo preset
- **React Test Renderer**: Component testing utilities

## 🚀 Development Workflow

### Quick Start
1. **Install**: `npm install` (from root)
2. **Backend**: `cd apps/backend && npm run dev` (starts Convex + dashboard)
3. **Frontend**: `cd apps/frontend && npm start` (starts Expo)
4. **Open**: Expo dev tools will show QR code for device/simulator

### Full Stack Development
```bash
# Terminal 1: Backend services
cd apps/backend
npm run dev                # Convex dev + Vite dashboard

# Terminal 2: Frontend app  
cd apps/frontend
npm start                  # Expo development server

# Terminal 3: Quality checks
npx turbo lint            # Lint all apps
npx turbo check-types     # Type checking
```

### Build & Deploy
```bash
# Build all apps
npx turbo build

# Backend deployment (Convex)
cd apps/backend && npx convex deploy

# Frontend build (web)
cd apps/frontend && npm run build:web
```

## 🔧 Package Manager

- **Manager**: npm (v10.9.2) with workspaces
- **Workspaces**: `apps/*` pattern
- **Build Tool**: Turbo with dependency caching and parallel execution

## 📦 Key Dependencies

### Frontend Core
- `expo` (52.0), `react-native` (0.76), `expo-router` (file-based routing)
- `@better-auth/expo`, `convex` (client)
- `nativewind` (Tailwind CSS), `@rneui/themed` (UI components)

### Backend Core  
- `convex` (serverless functions), `@convex-dev/better-auth`
- `better-auth` (auth framework), `@convex-dev/resend` (email)
- `vite` (frontend development server)

### Development
- `turbo` (build orchestration), `typescript`, `eslint`, `prettier`
- `jest`, `jest-expo` (testing)
