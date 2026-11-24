"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_js_1 = require("../prisma.js");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function main() {
    const users = await prisma_js_1.prisma.user.findMany({
        select: { id: true, email: true, username: true, role: true, passwordHash: true },
    });
    const candidates = [
        'Admin@123',
        'admin@123',
        'Admin123',
        'Super@123',
        'super@123',
        'Mentor@123',
        'mentor@123',
        'Student@123',
        'student@123',
        'Pinnacle@123',
        'password',
        'admin',
    ];
    console.log(`Checking ${users.length} users:`);
    for (const u of users) {
        let matched = null;
        for (const c of candidates) {
            if (await bcryptjs_1.default.compare(c, u.passwordHash)) {
                matched = c;
                break;
            }
        }
        console.log(`Email: ${u.email} | Username: "${u.username}" | Role: ${u.role} | Password: "${matched || 'UNKNOWN'}"`);
    }
}
main()
    .catch(console.error)
    .finally(() => prisma_js_1.prisma.$disconnect());
