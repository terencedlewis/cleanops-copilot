# cleanops-copilot

Organized baseline workspace for a Next.js + TypeScript + Supabase project.

## Structure

- `app/`: Next.js routes and pages
- `components/`: reusable UI components
- `features/`: domain feature modules
- `lib/`: shared utilities
- `services/`: external integrations and API clients
- `hooks/`: reusable React hooks
- `types/`: shared TypeScript types
- `styles/`: global styling assets
- `docs/`: product, architecture, prompts, and SOP documentation

## Quick Start

1. Install dependencies: `npm install`
2. Copy env template: `cp .env.example .env.local`
3. Start dev server: `npm run dev`

## Workflow

- Use short-lived branches (`feature/*`, `fix/*`, `chore/*`).
- Open pull requests early and merge via squash.
- Keep docs in sync with implementation decisions.
