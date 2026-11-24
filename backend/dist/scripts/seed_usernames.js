"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_js_1 = require("../prisma.js");
async function syncUsernames() {
    const users = await prisma_js_1.prisma.user.findMany({
        include: { studentProfile: true },
    });
    for (const u of users) {
        if (!u.username) {
            let desiredUsername = u.email.split('@')[0];
            if (u.studentProfile?.registrationNumber) {
                desiredUsername = u.studentProfile.registrationNumber.trim();
            }
            await prisma_js_1.prisma.user.update({
                where: { id: u.id },
                data: { username: desiredUsername },
            });
            console.log(`Updated user ${u.fullName} (${u.role}) -> username: "${desiredUsername}"`);
        }
    }
}
syncUsernames()
    .catch(console.error)
    .finally(() => prisma_js_1.prisma.$disconnect());
