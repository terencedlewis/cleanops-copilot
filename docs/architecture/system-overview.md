# System Overview

## Stack

- Frontend: Next.js + TypeScript
- Data/Auth: Supabase (Postgres, Auth, Storage)
- UI: Tailwind CSS and component primitives

## High-Level Modules

- `app`: route-level UI and page composition
- `features`: domain modules (auth, scheduling, operations)
- `services`: Supabase and third-party integrations
- `lib`: shared helper utilities
- `types`: shared contracts and models

## Data Flow

1. UI events in `app` or `features` call service actions.
2. Services execute typed Supabase queries.
3. Responses are normalized and returned to feature UI.
4. UI renders status, success, and error states.

## Architecture Principles

- Keep business logic feature-local where possible.
- Avoid cross-feature imports without shared abstractions.
- Treat database changes as versioned migrations.
