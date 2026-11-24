"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluationsRouter = void 0;
const express_1 = require("express");
const prisma_js_1 = require("../prisma.js");
const auth_js_1 = require("../middleware/auth.js");
const client_1 = require("@prisma/client");
exports.evaluationsRouter = (0, express_1.Router)();
// GET /api/evaluations - List evaluations
exports.evaluationsRouter.get('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const { studentId, stage, status } = req.query;
        const where = {};
        if (studentId)
            where.studentId = String(studentId);
        if (stage)
            where.stage = stage;
        if (status)
            where.status = status;
        if (req.user.role === client_1.Role.STUDENT) {
            const student = await prisma_js_1.prisma.student.findFirst({ where: { userId: req.user.id } });
            if (!student) {
                res.json({ evaluations: [] });
                return;
            }
            where.studentId = student.id;
        }
        const evaluations = await prisma_js_1.prisma.evaluation.findMany({
            where,
            orderBy: { scheduledDate: 'asc' },
            include: {
                student: {
                    select: {
                        id: true,
                        studentId: true,
                        fullName: true,
                        registrationNumber: true,
                        assignedMentor: { select: { fullName: true } },
                        project: { select: { title: true } },
                    },
                },
                evaluator: { select: { fullName: true, role: true } },
            },
        });
        res.json({ evaluations });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to retrieve evaluations' });
    }
});
// POST /api/evaluations - Create evaluation record (Supervisor or Admin)
exports.evaluationsRouter.post('/', auth_js_1.authenticate, (0, auth_js_1.requireRoles)(client_1.Role.ADMIN, client_1.Role.SUPERVISOR), async (req, res) => {
    try {
        const { studentId, stage, evaluationTitle, scheduledDate, status = 'SCHEDULED', marksRating, feedback, areasForImprovement, nextSteps, formAttachmentUrl, rubricScores, } = req.body;
        if (!studentId || !stage || !evaluationTitle || !scheduledDate) {
            res.status(400).json({ message: 'studentId, stage, evaluationTitle, and scheduledDate are required' });
            return;
        }
        const evaluation = await prisma_js_1.prisma.evaluation.create({
            data: {
                studentId,
                evaluatorId: req.user.id,
                stage: stage,
                evaluationTitle,
                scheduledDate: new Date(scheduledDate),
                completionDate: status === 'COMPLETED' ? new Date() : null,
                status: status,
                marksRating: marksRating !== undefined ? Number(marksRating) : null,
                feedback,
                areasForImprovement,
                nextSteps,
                formAttachmentUrl,
                rubricScores: rubricScores || undefined,
            },
            include: {
                student: { select: { fullName: true, assignedMentorId: true } },
            },
        });
        if (evaluation.student.assignedMentorId) {
            await prisma_js_1.prisma.notification.create({
                data: {
                    userId: evaluation.student.assignedMentorId,
                    title: `Evaluation Update: ${evaluationTitle}`,
                    message: `Evaluation ${evaluationTitle} scheduled/updated for ${evaluation.student.fullName}.`,
                    type: client_1.NotificationType.EVALUATION,
                    linkUrl: `/students/${studentId}`,
                },
            });
        }
        res.status(201).json({ message: 'Evaluation recorded successfully', evaluation });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to record evaluation' });
    }
});
// PUT /api/evaluations/:id - Update evaluation
exports.evaluationsRouter.put('/:id', auth_js_1.authenticate, (0, auth_js_1.requireRoles)(client_1.Role.ADMIN, client_1.Role.SUPERVISOR), async (req, res) => {
    try {
        const evaluationId = req.params.id;
        const { status, marksRating, feedback, areasForImprovement, nextSteps, rubricScores, scheduledDate } = req.body;
        const updated = await prisma_js_1.prisma.evaluation.update({
            where: { id: evaluationId },
            data: {
                status: status ? status : undefined,
                scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
                completionDate: status === 'COMPLETED' ? new Date() : undefined,
                marksRating: marksRating !== undefined ? Number(marksRating) : undefined,
                feedback: feedback !== undefined ? feedback : undefined,
                areasForImprovement: areasForImprovement !== undefined ? areasForImprovement : undefined,
                nextSteps: nextSteps !== undefined ? nextSteps : undefined,
                rubricScores: rubricScores !== undefined ? rubricScores : undefined,
            },
        });
        res.json({ message: 'Evaluation updated', evaluation: updated });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to update evaluation' });
    }
});
