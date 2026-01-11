-- Migration: Add latency monitoring to ai_usage_events
-- Story H.3: Performance & Latency Baselines

alter table public.ai_usage_events 
add column if not exists latency_ms int default 0;

comment on column public.ai_usage_events.latency_ms is 'Duration of the AI operation in milliseconds';
