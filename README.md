# U-Do App

A Turborepo monorepo containing the U-Do application.

## Package Manager

This project uses **pnpm** as the package manager. Make sure you have pnpm installed:

```bash
npm install -g pnpm
```

## Development Setup

1. Install dependencies:
```bash
pnpm install
```

2. Start development servers:
```bash
pnpm dev
```

This will start:
- Backend: Convex dev server
- Frontend: Expo web development server

## Available Commands

### Top-level commands (run from root):
- `pnpm dev` - Start development servers for all apps
- `pnpm lint` - Lint all apps
- `pnpm test` - Run tests in all apps
- `pnpm build` - Build all apps
- `pnpm check-types` - Type check all apps

### App-specific commands:
- `pnpm --filter u-do-app dev` - Start only frontend
- `pnpm --filter u-do-app-backend dev` - Start only backend

## Project Structure

- `apps/backend/` - Backend application (Convex setup pending)
- `apps/frontend/` - Frontend application (Expo/React Native)
- `apps/supabase/` - Supabase functions (deprecated)

## Notes

- The Supabase app is deprecated and ignored in the Turborepo configuration
- All apps use pnpm for dependency management
