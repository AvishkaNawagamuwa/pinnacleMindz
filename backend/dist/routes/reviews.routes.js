"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewsRouter = void 0;
const express_1 = require("express");
const prisma_js_1 = require("../prisma.js");
const auth_js_1 = require("../middleware/auth.js");
const client_1 = require("@prisma/client");
exports.reviewsRouter = (0, express_1.Router)();
// GET /api/reviews/corrections - List corrections with filters
exports.reviewsRouter.get('/corrections', auth_js_1.authenticate, async (req, res) => {
    try {
        const { studentId, status, mentorId, supervisorId } = req.query;
        const where = {};
        if (studentId)
            where.studentId = String(studentId);
        if (status)
            where.status = status;
        if (mentorId)
            where.assignedMentorId = String(mentorId);
        if (supervisorId)
            where.supervisorId = String(supervisorId);
        if (req.user.role === client_1.Role.MENTOR && !studentId) {
            where.assignedMentorId = req.user.id;
        }
        if (req.user.role === client_1.Role.STUDENT) {
            const student = await prisma_js_1.prisma.student.findFirst({ where: { userId: req.user.id } });
            if (!student) {
                res.json({ corrections: [] });
                return;
            }
            where.studentId = student.id;
        }
        const corrections = await prisma_js_1.prisma.correction.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                student: { select: { id: true, studentId: true, fullName: true, registrationNumber: true } },
                supervisor: { select: { fullName: true } },
                assignedMentor: { select: { fullName: true } },
                task: { select: { id: true, title: true } },
                studentDocument: { select: { id: true, documentName: true } },
            },
        });
        res.json({ corrections });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to retrieve corrections' });
    }
});
// POST /api/reviews/corrections - Supervisor creates correction
exports.reviewsRouter.post('/corrections', auth_js_1.authenticate, (0, auth_js_1.requireRoles)(client_1.Role.ADMIN, client_1.Role.SUPERVISOR), async (req, res) => {
    try {
        const { studentId, taskId, studentDocumentId, issueDescription, correctionInstruction, deadline, } = req.body;
        if (!studentId || !issueDescription || !correctionInstruction) {
            res.status(400).json({ message: 'studentId, issueDescription, and correctionInstruction are required' });
            return;
        }
        const student = await prisma_js_1.prisma.student.findUnique({
            where: { id: studentId },
            select: { id: true, fullName: true, assignedMentorId: true },
        });
        if (!student) {
            res.status(404).json({ message: 'Student not found' });
            return;
        }
        const correction = await prisma_js_1.prisma.correction.create({
            data: {
                studentId,
                taskId: taskId || null,
                studentDocumentId: studentDocumentId || null,
                supervisorId: req.user.id,
                assignedMentorId: student.assignedMentorId || req.user.id,
                issueDescription: issueDescription.trim(),
                correctionInstruction: correctionInstruction.trim(),
                deadline: deadline ? new Date(deadline) : null,
                status: client_1.CorrectionStatus.OPEN,
            },
            include: {
                supervisor: { select: { fullName: true } },
            },
        });
        // Notify mentor
        if (student.assignedMentorId) {
            await prisma_js_1.prisma.notification.create({
                data: {
                    userId: student.assignedMentorId,
                    title: `New Correction Assigned: ${student.fullName}`,
                    message: `Supervisor assigned correction: "${issueDescription}". Deadline: ${deadline ? new Date(deadline).toLocaleDateString() : 'Immediate'}.`,
                    type: client_1.NotificationType.CORRECTION,
                    linkUrl: `/students/${studentId}`,
                },
            });
        }
        res.status(201).json({ message: 'Correction created', correction });
    }
    catch (error) {
        console.error('Create correction error:', error);
        res.status(500).json({ message: 'Failed to create correction' });
    }
});
// PUT /api/reviews/corrections/:id - Update correction status
exports.reviewsRouter.put('/corrections/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const correctionId = req.params.id;
        const { status, resolutionNote } = req.body;
        const correction = await prisma_js_1.prisma.correction.findUnique({
            where: { id: correctionId },
            include: { student: true },
        });
        if (!correction) {
            res.status(404).json({ message: 'Correction not found' });
            return;
        }
        // Role-based rule:
        // Mentors can set status to RESOLVED and add resolutionNote
        // Supervisors / Admins can set status to VERIFIED or reopen to OPEN / IN_PROGRESS
        if (status === client_1.CorrectionStatus.VERIFIED && req.user.role !== client_1.Role.ADMIN && req.user.role !== client_1.Role.SUPERVISOR) {
            res.status(403).json({ message: 'Only supervisors or administrators can verify and close corrections.' });
            return;
        }
        const updated = await prisma_js_1.prisma.correction.update({
            where: { id: correctionId },
            data: {
                status: status,
                resolutionNote: resolutionNote !== undefined ? resolutionNote : undefined,
                resolvedAt: status === client_1.CorrectionStatus.RESOLVED ? new Date() : undefined,
                verifiedAt: status === client_1.CorrectionStatus.VERIFIED ? new Date() : undefined,
            },
        });
        // Notify supervisor when mentor marks RESOLVED
        if (status === client_1.CorrectionStatus.RESOLVED && correction.supervisorId) {
            await prisma_js_1.prisma.notification.create({
                data: {
                    userId: correction.supervisorId,
                    title: `Correction Resolved: ${correction.student.fullName}`,
                    message: `Mentor resolved correction on "${correction.issueDescription}". Ready for verification.`,
                    type: client_1.NotificationType.CORRECTION,
                    linkUrl: `/students/${correction.studentId}`,
                },
            });
        }
        res.json({ message: 'Correction updated', correction: updated });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to update correction' });
    }
});
// POST /api/reviews/feedback - Add supervisor feedback
exports.reviewsRouter.post('/feedback', auth_js_1.authenticate, (0, auth_js_1.requireRoles)(client_1.Role.ADMIN, client_1.Role.SUPERVISOR), async (req, res) => {
    try {
        const { studentId, weeklyProgressId, studentDocumentId, feedbackType, comments, mistakesIdentified, priority = 'MEDIUM' } = req.body;
        if (!studentId || !comments) {
            res.status(400).json({ message: 'studentId and comments are required' });
            return;
        }
        const feedback = await prisma_js_1.prisma.supervisorFeedback.create({
            data: {
                studentId,
                supervisorId: req.user.id,
                weeklyProgressId: weeklyProgressId || null,
                studentDocumentId: studentDocumentId || null,
                feedbackType: feedbackType || 'Supervisor Directive',
                comments,
                mistakesIdentified,
                priority: priority,
            },
            include: {
                student: { select: { fullName: true, assignedMentorId: true } },
            },
        });
        if (feedback.student.assignedMentorId) {
            await prisma_js_1.prisma.notification.create({
                data: {
                    userId: feedback.student.assignedMentorId,
                    title: `Supervisor Feedback for ${feedback.student.fullName}`,
                    message: comments.slice(0, 100) + '...',
                    type: client_1.NotificationType.SUPERVISOR_FEEDBACK,
                    linkUrl: `/students/${studentId}`,
                },
            });
        }
        res.status(201).json({ message: 'Supervisor feedback submitted', feedback });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to submit feedback' });
    }
});
