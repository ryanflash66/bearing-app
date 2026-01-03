# Data Models

## Overview
The database is hosted on Supabase (PostgreSQL) and manages data using strict SQL schemas with Row Level Security (RLS) enabled on all tables.

## Schema

### Tables

#### `public.accounts`
Multi-tenancy root.
- `id`: UUID (PK)
- `name`: Text
- `subscription_tier`: Text

#### `public.users`
Extends `auth.users`.
- `id`: UUID (PK, FK to auth.users)
- `full_name`: Text
- `avatar_url`: Text

#### `public.manuscripts`
Core content entity.
- `id`: UUID (PK)
- `account_id`: UUID (FK to accounts)
- `owner_user_id`: UUID (FK to users)
- `title`: Text
- `status`: Enum ('draft', 'in_review', 'ready', 'published', 'archived')
- `content_json`: JSONB (TipTap State)
- `content_text`: Text (Search/Analysis)
- `word_count`: Int (Auto-calculated)
- `deleted_at`: Timestamptz (Soft Delete)

#### `public.manuscript_versions`
History tracking.
- `id`: UUID (PK)
- `manuscript_id`: UUID (FK)
- `version_number`: Int
- `content_snapshot`: JSONB

#### `public.suggestions`
AI or collaborator suggestions.
- `id`: UUID (PK)
- `manuscript_id`: UUID (FK)
- `type`: Enum ('grammar', 'style', 'consistency')
- `status`: Enum ('pending', 'accepted', 'rejected')

#### `public.consistency_checks`
Engine results.
- `id`: UUID (PK)
- `manuscript_id`: UUID (FK)
- `result_json`: JSONB

## Security
**Row Level Security (RLS)** is enabled on all tables.
- **Select**: Users can only see data belonging to their `account_id`.
- **Insert/Update**: Restricted to `owner_user_id` or `account_admin`.
- **Delete**: Soft deletes implemented; specific policies for hard delete.

## Functions & Triggers
- `update_updated_at()`: Auto-updates timestamp.
- `calculate_word_count()`: Auto-updates `word_count` on `content_text` change.
