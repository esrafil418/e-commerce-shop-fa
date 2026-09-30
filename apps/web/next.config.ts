import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ecom/ui", "@ecom/validation", "@ecom/types"],
};

export default nextConfig;
