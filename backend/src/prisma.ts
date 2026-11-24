import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

let _client: PrismaClient | null = null;

function getPrismaClient(): PrismaClient {
  if (!_client) {
    if (globalForPrisma.prisma) {
      _client = globalForPrisma.prisma;
    } else {
      const databaseUrl =
        process.env.DATABASE_URL ||
        process.env.POSTGRES_PRISMA_URL ||
        process.env.POSTGRES_URL;

      _client = new PrismaClient({
        datasources: databaseUrl ? { db: { url: databaseUrl } } : undefined,
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
      });

      if (process.env.NODE_ENV !== 'production') {
        globalForPrisma.prisma = _client;
      }
    }
  }
  return _client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const val = Reflect.get(client, prop, receiver);
    if (typeof val === 'function') {
      return val.bind(client);
    }
    return val;
  },
});


