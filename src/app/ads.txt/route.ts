import { adsTxt } from "@/lib/advertising";

export const dynamic = "force-dynamic";
export function GET() {
  const text = adsTxt();
  return new Response(text ?? "", {
    status: text ? 200 : 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}
