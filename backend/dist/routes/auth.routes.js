import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma.js';
import { authenticate } from '../middleware/auth.js';
export const authRouter = Router();
const loginRateLimitMap = new Map();
// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
    try {
        const rawIdentifier = (req.body.email || req.body.username || req.body.identifier || '').trim();
        const identifier = rawIdentifier.toLowerCase();
        const rawPassword = req.body.password || '';
        const cleanPassword = rawPassword.trim();
        console.log(`[AUTH] Login attempt for identifier: "${identifier}" (raw: "${rawIdentifier}"), password length: ${rawPassword.length}`);
        if (!identifier || !rawPassword) {
            res.status(400).json({ message: 'Username/Email and password are required.' });
            return;
        }
        // Rate limiting check
        const rateLimit = loginRateLimitMap.get(identifier);
        if (rateLimit && rateLimit.blockedUntil && Date.now() < rateLimit.blockedUntil) {
            const waitMinutes = Math.ceil((rateLimit.blockedUntil - Date.now()) / 60000);
            res.status(429).json({
                message: `Too many failed login attempts. Account temporarily locked. Please try again after ${waitMinutes} minute(s).`,
            });
            return;
        }
        // Check database configuration
        const hasDb = Boolean(process.env.DATABASE_URL ||
            process.env.POSTGRES_PRISMA_URL ||
            process.env.POSTGRES_URL);
        if (!hasDb) {
            res.status(503).json({
                message: 'Database not connected on Vercel. Please create a database in Vercel Storage or set DATABASE_URL in Project Settings.',
            });
            return;
        }
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: identifier },
                    { username: identifier },
                    { username: rawIdentifier },
                ],
            },
            include: {
                studentProfile: {
                    select: { id: true, studentId: true, registrationNumber: true },
                },
            },
        });
        if (!user) {
            console.warn(`[AUTH] User not found for identifier: "${identifier}"`);
            const current = loginRateLimitMap.get(identifier) || { attempts: 0 };
            current.attempts += 1;
            if (current.attempts >= 5) {
                current.blockedUntil = Date.now() + 15 * 60 * 1000;
            }
            loginRateLimitMap.set(identifier, current);
            res.status(401).json({ message: 'Invalid credentials. User not found.' });
            return;
        }
        if (!user.isActive) {
            console.warn(`[AUTH] User "${user.email}" is deactivated.`);
            res.status(403).json({ message: 'This account has been deactivated. Please contact the administrator.' });
            return;
        }
        // Check exact password or trimmed password or case-variant for resilience
        let isMatch = await bcrypt.compare(rawPassword, user.passwordHash);
        if (!isMatch && cleanPassword !== rawPassword) {
            isMatch = await bcrypt.compare(cleanPassword, user.passwordHash);
        }
        // Also support capitalized first letter (e.g. admin@123 -> Admin@123)
        if (!isMatch) {
            const capitalized = cleanPassword.charAt(0).toUpperCase() + cleanPassword.slice(1);
            if (capitalized !== cleanPassword) {
                isMatch = await bcrypt.compare(capitalized, user.passwordHash);
            }
        }
        // Also support lowercase variant if standard password fails
        if (!isMatch && cleanPassword.toLowerCase() !== cleanPassword) {
            isMatch = await bcrypt.compare(cleanPassword.toLowerCase(), user.passwordHash);
        }
        if (!isMatch) {
            console.warn(`[AUTH] Password mismatch for user: "${user.email}"`);
            const current = loginRateLimitMap.get(identifier) || { attempts: 0 };
            current.attempts += 1;
            if (current.attempts >= 5) {
                current.blockedUntil = Date.now() + 15 * 60 * 1000;
            }
            loginRateLimitMap.set(identifier, current);
            res.status(401).json({ message: 'Invalid credentials. Incorrect password.' });
            return;
        }
        console.log(`[AUTH] Login successful for user: "${user.email}" (${user.role})`);
        // Reset rate limiter on successful login
        loginRateLimitMap.delete(identifier);
        // Audit log
        await prisma.activityLog.create({
            data: {
                actorId: user.id,
                actorName: user.fullName,
                actorRole: user.role,
                action: 'LOGIN',
                entityType: 'User',
                entityId: user.id,
                details: { email: user.email, username: user.username },
                ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1',
            },
        });
        const payload = {
            id: user.id,
            email: user.email,
            role: user.role,
            fullName: user.fullName,
        };
        const secret = process.env.JWT_SECRET || 'pinnacle-mindz-secret';
        const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
        const token = jwt.sign(payload, secret, { expiresIn: expiresIn });
        // HTTP-only cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        // Also return token in response body for flexible API usage
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                fullName: user.fullName,
                role: user.role,
                phone: user.phone,
                avatarUrl: user.avatarUrl,
                studentId: user.studentProfile?.id,
                studentProfile: user.studentProfile,
            },
        });
    }
    catch (error) {
        console.error('Login error:', error);
        const isDbError = error.message?.includes('database') ||
            error.message?.includes('Can\'t reach database') ||
            error.code?.startsWith('P');
        const msg = isDbError
            ? 'Database connection error: Could not connect to PostgreSQL. Please verify your DATABASE_URL in Vercel Project Settings.'
            : (error.message || 'Internal server error during login.');
        res.status(500).json({ message: msg });
    }
});
// POST /api/auth/logout
authRouter.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
});
// GET /api/auth/me
authRouter.get('/me', authenticate, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                username: true,
                fullName: true,
                role: true,
                phone: true,
                avatarUrl: true,
                isActive: true,
                studentProfile: {
                    select: { id: true, studentId: true, registrationNumber: true },
                },
            },
        });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json({
            user: {
                ...user,
                studentId: user.studentProfile?.id,
            },
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to retrieve profile' });
    }
});
// POST /api/auth/change-password
authRouter.post('/change-password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            res.status(400).json({ message: 'Both current and new password are required.' });
            return;
        }
        if (newPassword.length < 6) {
            res.status(400).json({ message: 'New password must be at least 6 characters.' });
            return;
        }
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
            res.status(400).json({ message: 'Current password is incorrect.' });
            return;
        }
        const newHash = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: newHash },
        });
        res.json({ message: 'Password updated successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to update password' });
    }
});
