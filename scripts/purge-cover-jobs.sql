-- Manual cleanup script for Story 5.9 cover jobs retention
-- Keeps jobs linked to gallery assets or currently selected manuscript covers.

select public.purge_stale_cover_jobs(30);

