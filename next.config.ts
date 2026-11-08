import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // This app is a private, per-user dashboard — nearly every route reads
  // cookies()/auth and is dynamic by nature, so Cache Components' opt-in
  // caching model adds boundary overhead without a static-rendering payoff.
  // Revisit in Phase 7 once there are cacheable public routes.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
