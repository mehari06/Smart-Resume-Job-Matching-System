import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => new PrismaClient();

declare global {
    // eslint-disable-next-line no-var
    var prisma: undefined | PrismaClient;
}

function getPrismaClient() {
    if (!process.env.DATABASE_URL?.trim()) {
        throw new Error("DATABASE_URL is not configured");
    }

    if (!globalThis.prisma) {
        globalThis.prisma = prismaClientSingleton();
    }

    return globalThis.prisma;
}

const prisma = new Proxy({} as PrismaClient, {
    get(_target, property, receiver) {
        const client = getPrismaClient();
        const value = Reflect.get(client, property, receiver);
        return typeof value === "function" ? value.bind(client) : value;
    },
});

export default prisma;
