import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["playwright", "playwright-core", "argon2"],
  output: "standalone",
};

export default nextConfig;
