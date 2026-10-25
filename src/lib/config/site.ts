import "server-only";
import { parseSiteOrigin } from "./env";

export const site = {
  name: "AI Workflow Atlas",
  description: "A practical guide to AI tools and workflows. Built for people who want to turn possibilities into useful work.",
  origin: parseSiteOrigin(process.env.SITE_URL),
  publicLocale: "en",
  adminLocale: "es",
} as const;
