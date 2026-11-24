"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const globalForPrisma = global;
let _client = null;
function getPrismaClient() {
    if (!_client) {
        if (globalForPrisma.prisma) {
            _client = globalForPrisma.prisma;
        }
        else {
            const databaseUrl = process.env.DATABASE_URL ||
                process.env.POSTGRES_PRISMA_URL ||
                process.env.POSTGRES_URL;
            _client = new client_1.PrismaClient({
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
exports.prisma = new Proxy({}, {
    get(_target, prop, receiver) {
        const client = getPrismaClient();
        const val = Reflect.get(client, prop, receiver);
        if (typeof val === 'function') {
            return val.bind(client);
        }
        return val;
    },
});
