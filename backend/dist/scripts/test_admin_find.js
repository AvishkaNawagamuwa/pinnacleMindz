import { prisma } from '../prisma.js';
import bcrypt from 'bcryptjs';
async function test() {
    const identifier = 'admin';
    const rawIdentifier = 'admin';
    const user = await prisma.user.findFirst({
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
        passwordMatchAdmin123: await bcrypt.compare('Admin@123', user.passwordHash),
        passwordMatchLower: await bcrypt.compare('admin@123', user.passwordHash),
    } : 'NO USER FOUND');
}
test()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
