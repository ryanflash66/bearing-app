import fs from "fs";
import path from "path";

describe("coming soon pages schema migration", () => {
  it("adds book_signups table and manuscript landing page fields", () => {
    const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"));

    const combinedSql = migrationFiles
      .map((file) => fs.readFileSync(path.join(migrationsDir, file), "utf8"))
      .join("\n");

    // Check book_signups table creation
    expect(combinedSql).toMatch(/create table if not exists public\.book_signups/i);

    // Check manuscript landing page fields
    expect(combinedSql).toMatch(/add column if not exists slug text/i);
    expect(combinedSql).toMatch(/add column if not exists is_public boolean/i);
    expect(combinedSql).toMatch(/add column if not exists theme_config jsonb/i);
    expect(combinedSql).toMatch(/add column if not exists synopsis text/i);
    expect(combinedSql).toMatch(/add column if not exists cover_image_url text/i);

    // Check unique constraint for slug per owner
    expect(combinedSql).toMatch(/idx_manuscripts_owner_slug/i);

    // Check RLS policies
    expect(combinedSql).toMatch(/book_signups_insert_public/i);
    expect(combinedSql).toMatch(/book_signups_select_owner/i);
    expect(combinedSql).toMatch(/manuscripts_select_public/i);
  });
});
