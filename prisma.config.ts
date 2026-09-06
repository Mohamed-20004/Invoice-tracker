import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Used by the CLI (migrate/db). The app itself connects via the PrismaPg
    // adapter in src/lib/db.ts. A placeholder keeps `prisma generate` working
    // without a database.
    url:
      process.env.DATABASE_URL ??
      "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
});
