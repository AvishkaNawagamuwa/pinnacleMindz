"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectsRouter = void 0;
const express_1 = require("express");
const prisma_js_1 = require("../prisma.js");
const auth_js_1 = require("../middleware/auth.js");
exports.projectsRouter = (0, express_1.Router)();
// PUT /api/projects/:id - Update project info (title, scope, stack, stage)
exports.projectsRouter.put('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const projectId = req.params.id;
        const project = await prisma_js_1.prisma.project.findUnique({
            where: { id: projectId },
            select: { id: true, studentId: true, title: true, currentStage: true, techStack: true },
        });
        if (!project) {
            res.status(404).json({ message: 'Project not found' });
            return;
        }
        const access = await (0, auth_js_1.checkStudentAccess)(req, project.studentId, 'write');
        if (!access.allowed) {
            res.status(403).json({ message: access.reason || 'Forbidden' });
            return;
        }
        const { title, idea, problemStatement, proposedSolution, mainObjectives, mainModules, techStack, category, currentStage, completionPercentage, githubRepoUrl, demoUrl, technicalRemarks, changeReason, } = req.body;
        // Track history if title or stage changed
        if (title && title !== project.title) {
            await prisma_js_1.prisma.projectHistory.create({
                data: {
                    projectId: project.id,
                    fieldChanged: 'title',
                    oldValue: project.title,
                    newValue: title,
                    reason: changeReason || 'Project title refined',
                    changedById: req.user.id,
                },
            });
        }
        if (currentStage && currentStage !== project.currentStage) {
            await prisma_js_1.prisma.projectHistory.create({
                data: {
                    projectId: project.id,
                    fieldChanged: 'currentStage',
                    oldValue: project.currentStage,
                    newValue: currentStage,
                    reason: changeReason || 'Stage transitioned',
                    changedById: req.user.id,
                },
            });
        }
        const updated = await prisma_js_1.prisma.project.update({
            where: { id: projectId },
            data: {
                title,
                idea,
                problemStatement,
                proposedSolution,
                mainObjectives,
                mainModules,
                techStack,
                category,
                currentStage: currentStage,
                completionPercentage: completionPercentage !== undefined ? Number(completionPercentage) : undefined,
                githubRepoUrl,
                demoUrl,
                technicalRemarks,
            },
        });
        res.json({ message: 'Project updated successfully', project: updated });
    }
    catch (error) {
        console.error('Update project error:', error);
        res.status(500).json({ message: 'Failed to update project details' });
    }
});
// POST /api/projects/:id/milestones - Add milestone
exports.projectsRouter.post('/:id/milestones', auth_js_1.authenticate, async (req, res) => {
    try {
        const projectId = req.params.id;
        const project = await prisma_js_1.prisma.project.findUnique({ where: { id: projectId } });
        if (!project) {
            res.status(404).json({ message: 'Project not found' });
            return;
        }
        const access = await (0, auth_js_1.checkStudentAccess)(req, project.studentId, 'write');
        if (!access.allowed) {
            res.status(403).json({ message: access.reason || 'Forbidden' });
            return;
        }
        const { title, description, stage, weight = 10.0, dueDate, orderIndex } = req.body;
        const milestone = await prisma_js_1.prisma.projectMilestone.create({
            data: {
                projectId,
                title,
                description,
                stage: stage,
                weight: Number(weight),
                dueDate: dueDate ? new Date(dueDate) : null,
                orderIndex: Number(orderIndex) || 0,
            },
        });
        res.status(201).json({ message: 'Milestone created', milestone });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to create milestone' });
    }
});
// PUT /api/projects/:id/milestones/:mId - Update milestone
exports.projectsRouter.put('/:id/milestones/:mId', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id: projectId, mId: milestoneId } = req.params;
        const project = await prisma_js_1.prisma.project.findUnique({ where: { id: projectId } });
        if (!project) {
            res.status(404).json({ message: 'Project not found' });
            return;
        }
        const access = await (0, auth_js_1.checkStudentAccess)(req, project.studentId, 'write');
        if (!access.allowed) {
            res.status(403).json({ message: access.reason || 'Forbidden' });
            return;
        }
        const { status, title, description, dueDate, weight } = req.body;
        const updated = await prisma_js_1.prisma.projectMilestone.update({
            where: { id: milestoneId },
            data: {
                status: status,
                title,
                description,
                dueDate: dueDate ? new Date(dueDate) : undefined,
                weight: weight !== undefined ? Number(weight) : undefined,
                completedDate: status === 'COMPLETED' ? new Date() : null,
            },
        });
        // Auto-recalculate progress from weighted milestones
        const allMilestones = await prisma_js_1.prisma.projectMilestone.findMany({ where: { projectId } });
        const totalWeight = allMilestones.reduce((acc, m) => acc + m.weight, 0);
        const completedWeight = allMilestones
            .filter((m) => m.status === 'COMPLETED')
            .reduce((acc, m) => acc + m.weight, 0);
        const calcPercentage = totalWeight > 0 ? Math.min(100, (completedWeight / totalWeight) * 100) : 0;
        await prisma_js_1.prisma.project.update({
            where: { id: projectId },
            data: { completionPercentage: Math.round(calcPercentage * 10) / 10 },
        });
        res.json({ message: 'Milestone updated and progress recalculated', milestone: updated, calculatedProgress: calcPercentage });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to update milestone' });
    }
});
// POST /api/projects/:id/recalculate-progress
exports.projectsRouter.post('/:id/recalculate-progress', auth_js_1.authenticate, async (req, res) => {
    try {
        const projectId = req.params.id;
        const allMilestones = await prisma_js_1.prisma.projectMilestone.findMany({ where: { projectId } });
        const totalWeight = allMilestones.reduce((acc, m) => acc + m.weight, 0);
        const completedWeight = allMilestones
            .filter((m) => m.status === 'COMPLETED')
            .reduce((acc, m) => acc + m.weight, 0);
        const calcPercentage = totalWeight > 0 ? Math.min(100, (completedWeight / totalWeight) * 100) : 0;
        const updated = await prisma_js_1.prisma.project.update({
            where: { id: projectId },
            data: { completionPercentage: Math.round(calcPercentage * 10) / 10 },
        });
        res.json({ completionPercentage: updated.completionPercentage });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to calculate progress' });
    }
});
