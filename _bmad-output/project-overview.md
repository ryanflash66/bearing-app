# Project Overview

## Executive Summary
**Bearing App** is an AI-powered self-publishing platform designed to assist authors. It features a comprehensive manuscript editor (TipTap based) with real-time autosave, version history, and AI-driven suggestions (grammar, style, consistency). The application supports multi-tenancy via Accounts and enforces strict security through Row Level Security (RLS).

## Technology Stack

| Category | Technology | Description |
|---|---|---|
| **Framework** | Next.js 14+ | App Router, Server Actions, React Server Components |
| **Language** | TypeScript | Strong typing across full stack |
| **Database** | Supabase (PostgreSQL) | Managed DB, Auth, Realtime, Storage |
| **Styling** | React / CSS | Custom components |
| **Testing** | Jest | Unit and Integration testing |
| **Deployment** | Vercel (Implied) | Optimized for Next.js |

## Architecture
**Monolith Web Application**
- **Client**: React (Next.js) Components
- **Server**: Next.js API Routes & Server Actions
- **Database**: Postgres with logic in SQL (triggers, RLS)

## Repository Structure
- **Root**: `r:\Dropbox\_Code\Projects\bearing\bearing-app`
- **Documentation**: `docs/`
- **Source**: `src/`
- **Database**: `supabase/`

## Key Features
- **Manuscript Management**: CRUD, Autosave, Versioning.
- **AI Integration**: Suggestions/Consistency Checks engine.
- **Collaboration**: Conflict resolution handling.
- **Security**: Robust RBAC and RLS policies.
