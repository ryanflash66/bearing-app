import fs from "fs";
import path from "path";

describe("cover generator schema migration", () => {
  it("creates cover_jobs and gallery_assets with core constraints and RLS policies", () => {
    const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"));

    const combinedSql = migrationFiles
      .map((file) => fs.readFileSync(path.join(migrationsDir, file), "utf8"))
      .join("\n");

    expect(combinedSql).toMatch(/create table if not exists public\.cover_jobs/i);
    expect(combinedSql).toMatch(/create table if not exists public\.gallery_assets/i);
    expect(combinedSql).toMatch(/add column if not exists cover_url text/i);

    expect(combinedSql).toMatch(/cover_jobs[\s\S]*status text not null check \(status in \('queued', 'running', 'completed', 'failed'\)\)/i);
    expect(combinedSql).toMatch(/cover_jobs[\s\S]*images jsonb not null default '\[\]'::jsonb/i);
    expect(combinedSql).toMatch(/cover_jobs[\s\S]*retry_count integer not null default 0/i);

    expect(combinedSql).toMatch(/gallery_assets[\s\S]*asset_type text not null/i);
    expect(combinedSql).toMatch(/gallery_assets[\s\S]*metadata jsonb not null default '\{\}'::jsonb/i);

    expect(combinedSql).toMatch(/alter table public\.cover_jobs enable row level security/i);
    expect(combinedSql).toMatch(/alter table public\.gallery_assets enable row level security/i);

    expect(combinedSql).toMatch(/create policy "cover_jobs_select_owner"/i);
    expect(combinedSql).toMatch(/create policy "cover_jobs_insert_owner"/i);
    expect(combinedSql).toMatch(/create policy "cover_jobs_update_owner"/i);

    expect(combinedSql).toMatch(/create policy "gallery_assets_select_owner"/i);
    expect(combinedSql).toMatch(/create policy "gallery_assets_insert_owner"/i);
    expect(combinedSql).toMatch(/create or replace function public\.purge_stale_cover_jobs/i);
  });
});
