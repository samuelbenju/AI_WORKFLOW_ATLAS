import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { requireDatabaseUrl } from "./url";

const globalDatabase = globalThis as unknown as { atlasDatabase?: PrismaClient };

export function createDatabaseClient(url: string): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: requireDatabaseUrl(url),
      max: 5,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
    }),
    // Never enable query logging: parameters may contain personal data.
    log: [],
  });
}

// Lazy initialization: the static public shell and build do not require a DB.
export function getDatabase(): PrismaClient {
  if (!globalDatabase.atlasDatabase) {
    globalDatabase.atlasDatabase = createDatabaseClient(requireDatabaseUrl(process.env.DATABASE_URL));
  }
  return globalDatabase.atlasDatabase;
}
