/** @type {import('next').NextConfig} */
const nextConfig = {
    // ─── Production Optimizations ──────────────────────────────────
    reactStrictMode: true,
    poweredByHeader: false,

    // ─── Image Optimization ────────────────────────────────────────
    images: {
        formats: ["image/avif", "image/webp"],
        minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    },

    // ─── Security Headers ──────────────────────────────────────────
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    {
                        key: "X-Frame-Options",
                        value: "DENY",
                    },
                    {
                        key: "X-Content-Type-Options",
                        value: "nosniff",
                    },
                    {
                        key: "Referrer-Policy",
                        value: "strict-origin-when-cross-origin",
                    },
                    {
                        key: "Permissions-Policy",
                        value: "camera=(), microphone=(), geolocation=()",
                    },
                    {
                        key: "X-DNS-Prefetch-Control",
                        value: "on",
                    },
                ],
            },
        ];
    },

    // ─── Compiler Optimizations ────────────────────────────────────
    compiler: {
        removeConsole:
            process.env.NODE_ENV === "production"
                ? { exclude: ["error", "warn"] }
                : false,
    },

    // ─── Experimental Features ─────────────────────────────────────
    experimental: {
        optimizePackageImports: ["firebase", "@google/generative-ai"],
    },
};

export default nextConfig;
