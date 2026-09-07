import type { PrismaConfig } from "prisma/config";

// Deliberately no runtime imports (type-only import above is erased):
// in the production container the Prisma CLI lives in its own tree
// (/app/prisma-cli), so 'prisma/config' is not resolvable from the app
// root where this file sits. A plain object export needs no resolution.
export default {
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
} satisfies PrismaConfig;
