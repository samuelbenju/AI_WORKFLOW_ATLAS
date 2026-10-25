import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: { formats: ["image/avif", "image/webp"], localPatterns: [{ pathname: "/editorial/**", search: "" }] },
  async headers() {
    return [{ source: "/admin/:path*", headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }] },
    { source: "/api/admin/:path*", headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }] },
    { source: "/login", headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }] }, {
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
      ]
    }];
  }
};

export default nextConfig;
