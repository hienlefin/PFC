import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "libsql", "@libsql/client"],
};

export default nextConfig;
