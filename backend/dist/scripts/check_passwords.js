import { prisma } from '../prisma.js';
import bcrypt from 'bcryptjs';
async function main() {
    const users = await prisma.user.findMany({
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
            if (await bcrypt.compare(c, u.passwordHash)) {
                matched = c;
                break;
            }
        }
        console.log(`Email: ${u.email} | Username: "${u.username}" | Role: ${u.role} | Password: "${matched || 'UNKNOWN'}"`);
    }
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
