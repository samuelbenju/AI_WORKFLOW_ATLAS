import { z } from "zod";
import { DatabaseOperationError } from "@/lib/database-diagnostics";

export function requireDatabaseUrl(value: string | undefined): string {
  const result = z.url().safeParse(value);
  if (result.success) {
    const parsed = new URL(result.data);
    if (["postgres:", "postgresql:"].includes(parsed.protocol) && parsed.pathname.length > 1) return result.data;
  }
  throw new DatabaseOperationError({stage:"database.configure",codes:["DATABASE_URL_INVALID"]}, "DATABASE_URL must identify a PostgreSQL database. Configure it securely; no connection value is logged.");
}
