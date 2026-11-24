"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRouter = void 0;
const express_1 = require("express");
const prisma_js_1 = require("../prisma.js");
const auth_js_1 = require("../middleware/auth.js");
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
exports.usersRouter = (0, express_1.Router)();
// GET /api/users - List institute staff
exports.usersRouter.get('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const { role } = req.query;
        const where = {};
        if (role)
            where.role = role;
        else
            where.role = { in: [client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN, client_1.Role.SUPERVISOR, client_1.Role.MENTOR] };
        const users = await prisma_js_1.prisma.user.findMany({
            where,
            orderBy: { fullName: 'asc' },
            select: {
                id: true,
                email: true,
                username: true,
                fullName: true,
                role: true,
                phone: true,
                isActive: true,
                createdAt: true,
                _count: {
                    select: {
                        mentoredStudents: true,
                        supportingMentoredStudents: true,
                        supervisedStudents: true,
                    },
                },
            },
        });
        res.json({ users });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to list staff users' });
    }
});
// GET /api/users/mentors-workload - Workload balancing interface for Admin
exports.usersRouter.get('/mentors-workload', auth_js_1.authenticate, (0, auth_js_1.requireRoles)(client_1.Role.ADMIN), async (req, res) => {
    try {
        const mentors = await prisma_js_1.prisma.user.findMany({
            where: { role: client_1.Role.MENTOR },
            select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                isActive: true,
                mentoredStudents: {
                    select: {
                        id: true,
                        studentId: true,
                        fullName: true,
                        registrationNumber: true,
                        status: true,
                        project: { select: { title: true, currentStage: true, completionPercentage: true } },
                        weeklyProgresses: { orderBy: { weekStartDate: 'desc' }, take: 1 },
                    },
                },
                supportingMentoredStudents: {
                    include: {
                        student: {
                            select: {
                                id: true,
                                studentId: true,
                                fullName: true,
                                registrationNumber: true,
                                status: true,
                                project: { select: { title: true, currentStage: true, completionPercentage: true } },
                                weeklyProgresses: { orderBy: { weekStartDate: 'desc' }, take: 1 },
                            },
                        },
                    },
                },
            },
        });
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const workload = mentors.map((m) => {
            const primaryStudents = m.mentoredStudents;
            const supportingStudents = m.supportingMentoredStudents.map((sm) => sm.student);
            const combined = [...primaryStudents, ...supportingStudents];
            const activeProjects = combined.filter((s) => s.status === 'ACTIVE').length;
            const completedProjects = combined.filter((s) => s.project?.currentStage === 'COMPLETED').length;
            const pendingUpdates = combined.filter((s) => {
                if (s.status !== 'ACTIVE')
                    return false;
                const lastWeekly = s.weeklyProgresses[0];
                return !lastWeekly || lastWeekly.createdAt < oneWeekAgo;
            }).length;
            return {
                id: m.id,
                fullName: m.fullName,
                email: m.email,
                phone: m.phone,
                isActive: m.isActive,
                assignedStudentsCount: combined.length,
                primaryCount: primaryStudents.length,
                supportingCount: supportingStudents.length,
                activeProjects,
                completedProjects,
                pendingUpdates,
                students: combined,
            };
        });
        res.json({ workload });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to retrieve workload metrics' });
    }
});
// POST /api/users - Create new supervisor or mentor (Admin only)
exports.usersRouter.post('/', auth_js_1.authenticate, (0, auth_js_1.requireRoles)(client_1.Role.ADMIN), async (req, res) => {
    try {
        const { email, username, password, fullName, role, phone } = req.body;
        if (!email || !password || !fullName || !role) {
            res.status(400).json({ message: 'Email, password, fullName, and role are required.' });
            return;
        }
        const trimmedEmail = email.toLowerCase().trim();
        const existing = await prisma_js_1.prisma.user.findFirst({
            where: {
                OR: [
                    { email: trimmedEmail },
                    ...(username ? [{ username: username.trim() }] : []),
                ],
            },
        });
        if (existing) {
            res.status(400).json({ message: 'User with this email or username already exists.' });
            return;
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_js_1.prisma.user.create({
            data: {
                email: trimmedEmail,
                username: username ? username.trim() : trimmedEmail.split('@')[0],
                passwordHash,
                fullName: fullName.trim(),
                role: role,
                phone,
                isActive: true,
            },
            select: {
                id: true,
                email: true,
                username: true,
                fullName: true,
                role: true,
                phone: true,
                isActive: true,
                createdAt: true,
            },
        });
        await prisma_js_1.prisma.activityLog.create({
            data: {
                actorId: req.user.id,
                actorName: req.user.fullName,
                actorRole: req.user.role,
                action: 'CREATE_STAFF_USER',
                entityType: 'User',
                entityId: user.id,
                details: { email: user.email, role: user.role, name: user.fullName },
            },
        });
        res.status(201).json({ message: 'Staff member created successfully', user });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to create staff member' });
    }
});
// PUT /api/users/:id - Update user details or active status
exports.usersRouter.put('/:id', auth_js_1.authenticate, (0, auth_js_1.requireRoles)(client_1.Role.ADMIN), async (req, res) => {
    try {
        const userId = req.params.id;
        const { fullName, phone, role, isActive, username } = req.body;
        const updated = await prisma_js_1.prisma.user.update({
            where: { id: userId },
            data: {
                fullName: fullName ? fullName.trim() : undefined,
                username: username ? username.trim() : undefined,
                phone,
                role: role ? role : undefined,
                isActive: isActive !== undefined ? Boolean(isActive) : undefined,
            },
            select: { id: true, email: true, username: true, fullName: true, role: true, phone: true, isActive: true },
        });
        res.json({ message: 'Staff user updated', user: updated });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to update user' });
    }
});
// PUT /api/users/:id/reset-password - Admin reset password
exports.usersRouter.put('/:id/reset-password', auth_js_1.authenticate, (0, auth_js_1.requireRoles)(client_1.Role.ADMIN), async (req, res) => {
    try {
        const userId = req.params.id;
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            res.status(400).json({ message: 'Password must be at least 6 characters.' });
            return;
        }
        const passwordHash = await bcryptjs_1.default.hash(newPassword, 10);
        await prisma_js_1.prisma.user.update({
            where: { id: userId },
            data: { passwordHash },
        });
        res.json({ message: 'Password reset successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to reset password' });
    }
});
