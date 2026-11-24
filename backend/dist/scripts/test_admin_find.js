"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_js_1 = require("../prisma.js");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function test() {
    const identifier = 'admin';
    const rawIdentifier = 'admin';
    const user = await prisma_js_1.prisma.user.findFirst({
        where: {
            OR: [
                { email: identifier },
                { username: identifier },
                { username: rawIdentifier },
            ],
        },
    });
    console.log('Found user:', user ? {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        username: user.username,
        isActive: user.isActive,
        passwordMatchAdmin123: await bcryptjs_1.default.compare('Admin@123', user.passwordHash),
        passwordMatchLower: await bcryptjs_1.default.compare('admin@123', user.passwordHash),
    } : 'NO USER FOUND');
}
test()
    .catch(console.error)
    .finally(() => prisma_js_1.prisma.$disconnect());
