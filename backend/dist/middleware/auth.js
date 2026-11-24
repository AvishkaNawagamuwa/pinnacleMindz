"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkStudentAccess = exports.requireRoles = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma_js_1 = require("../prisma.js");
const authenticate = async (req, res, next) => {
    try {
        let token = req.cookies?.token;
        if (!token && req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            res.status(401).json({ message: 'Authentication required. Please log in.' });
            return;
        }
        const secret = process.env.JWT_SECRET || 'pinnacle-mindz-secret';
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        // Verify user is still active in database
        const user = await prisma_js_1.prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, email: true, role: true, fullName: true, isActive: true },
        });
        if (!user || !user.isActive) {
            res.status(401).json({ message: 'User account is inactive or no longer exists.' });
            return;
        }
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            fullName: user.fullName,
        };
        next();
    }
    catch (error) {
        res.status(401).json({ message: 'Invalid or expired session token.' });
    }
};
exports.authenticate = authenticate;
const requireRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required.' });
            return;
        }
        const userRole = req.user.role;
        // Super admin automatically satisfies ADMIN permissions
        if (userRole === client_1.Role.SUPER_ADMIN) {
            return next();
        }
        if (!roles.includes(userRole)) {
            res.status(403).json({
                message: `Forbidden: Access requires one of [${roles.join(', ')}] role(s). Your role is ${userRole}.`,
            });
            return;
        }
        next();
    };
};
exports.requireRoles = requireRoles;
/**
 * Object-level access control helper for student data
 * Mode 'read': allows mentors to view limited directory or full assigned student
 * Mode 'write': mentors can only modify their own assigned student!
 */
const checkStudentAccess = async (req, studentId, mode = 'read') => {
    if (!req.user)
        return { allowed: false, reason: 'Unauthenticated' };
    if (req.user.role === client_1.Role.SUPER_ADMIN || req.user.role === client_1.Role.ADMIN)
        return { allowed: true, fullAccess: true };
    if (req.user.role === client_1.Role.SUPERVISOR) {
        // Supervisors have full read and review write permissions
        return { allowed: true, fullAccess: true };
    }
    // Look up student by student.id OR student.userId (or 'me')
    const student = await prisma_js_1.prisma.student.findFirst({
        where: studentId === 'me'
            ? { userId: req.user.id }
            : {
                OR: [
                    { id: studentId },
                    { userId: studentId },
                ],
            },
        select: {
            id: true,
            assignedMentorId: true,
            userId: true,
            supportingMentors: { select: { mentorId: true } },
        },
    });
    if (!student)
        return { allowed: false, reason: 'Student not found' };
    if (req.user.role === client_1.Role.MENTOR) {
        const isPrimary = student.assignedMentorId === req.user.id;
        const isSupporting = student.supportingMentors.some((m) => m.mentorId === req.user.id);
        if (isPrimary || isSupporting) {
            return { allowed: true, fullAccess: true };
        }
        if (mode === 'write') {
            return {
                allowed: false,
                reason: 'Forbidden: Mentors cannot modify students assigned to other mentors.',
            };
        }
        // Limited directory read only
        return { allowed: true, fullAccess: false };
    }
    if (req.user.role === client_1.Role.STUDENT) {
        const isSelf = student.userId === req.user.id || student.id === req.user.id;
        if (isSelf)
            return { allowed: true, fullAccess: true };
        return { allowed: false, reason: 'Forbidden: You cannot access other students.' };
    }
    return { allowed: false, reason: 'Unauthorized role' };
};
exports.checkStudentAccess = checkStudentAccess;
