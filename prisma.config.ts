// prisma.config.ts
// Prisma 7 Configuration

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
