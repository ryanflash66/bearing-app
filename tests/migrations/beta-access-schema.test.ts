import fs from "fs";
import path from "path";

describe("beta access schema migration", () => {
  it("adds beta access tables and verification function", () => {
    const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"));

    const combinedSql = migrationFiles
      .map((file) => fs.readFileSync(path.join(migrationsDir, file), "utf8"))
      .join("\n");

    expect(combinedSql).toMatch(/create table if not exists public\.beta_access_tokens/i);
    expect(combinedSql).toMatch(/create table if not exists public\.beta_comments/i);
    expect(combinedSql).toMatch(/create or replace function public\.verify_beta_token/i);
  });
});
