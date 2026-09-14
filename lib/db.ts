import { PrismaClient } from "@prisma/client";

// Singleton: em dev o hot-reload recria os módulos a cada save; sem isto cada
// reload abriria uma nova pool de conexões até estourar o Postgres.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
