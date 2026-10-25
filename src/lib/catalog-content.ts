import { z } from "zod";

const stepSchema = z.object({ step: z.number().int().positive(), text: z.string().min(1).max(10000) });
const referenceSchema = z.object({ url: z.string().max(2048), note: z.string().max(1000).optional() });

export function safeExternalUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}

export function workflowSteps(input: unknown) {
  const result = z.array(stepSchema).max(100).safeParse(input);
  return result.success ? result.data.toSorted((a, b) => a.step - b.step) : [];
}

export function workflowReferences(input: unknown) {
  const result = z.array(referenceSchema).max(100).safeParse(input);
  if (!result.success) return [];
  return result.data.flatMap((reference) => {
    const url = safeExternalUrl(reference.url);
    return url ? [{ url, note: reference.note }] : [];
  });
}

export const difficultyLabels = { BEGINNER: "Beginner", INTERMEDIATE: "Intermediate", ADVANCED: "Advanced" } as const;
