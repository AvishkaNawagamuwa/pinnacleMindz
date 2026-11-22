import { Router } from 'express';
import { prisma } from '../prisma.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { EvaluationStage, EvaluationStatus, NotificationType, Role } from '@prisma/client';

export const evaluationsRouter = Router();

// GET /api/evaluations - List evaluations
evaluationsRouter.get('/', authenticate, async (req, res) => {
  try {
    const { studentId, stage, status } = req.query;
    const where: any = {};

    if (studentId) where.studentId = String(studentId);
    if (stage) where.stage = stage as EvaluationStage;
    if (status) where.status = status as EvaluationStatus;

    if (req.user!.role === Role.STUDENT) {
      const student = await prisma.student.findFirst({ where: { userId: req.user!.id } });
      if (!student) {
        res.json({ evaluations: [] });
        return;
      }
      where.studentId = student.id;
    }

    const evaluations = await prisma.evaluation.findMany({
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
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve evaluations' });
  }
});

// POST /api/evaluations - Create evaluation record (Supervisor or Admin)
evaluationsRouter.post('/', authenticate, requireRoles(Role.ADMIN, Role.SUPERVISOR), async (req, res): Promise<void> => {
  try {
    const {
      studentId,
      stage,
      evaluationTitle,
      scheduledDate,
      status = 'SCHEDULED',
      marksRating,
      feedback,
      areasForImprovement,
      nextSteps,
      formAttachmentUrl,
      rubricScores,
    } = req.body;

    if (!studentId || !stage || !evaluationTitle || !scheduledDate) {
      res.status(400).json({ message: 'studentId, stage, evaluationTitle, and scheduledDate are required' });
      return;
    }

    const evaluation = await prisma.evaluation.create({
      data: {
        studentId,
        evaluatorId: req.user!.id,
        stage: stage as EvaluationStage,
        evaluationTitle,
        scheduledDate: new Date(scheduledDate),
        completionDate: status === 'COMPLETED' ? new Date() : null,
        status: status as EvaluationStatus,
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
      await prisma.notification.create({
        data: {
          userId: evaluation.student.assignedMentorId,
          title: `Evaluation Update: ${evaluationTitle}`,
          message: `Evaluation ${evaluationTitle} scheduled/updated for ${evaluation.student.fullName}.`,
          type: NotificationType.EVALUATION,
          linkUrl: `/students/${studentId}`,
        },
      });
    }

    res.status(201).json({ message: 'Evaluation recorded successfully', evaluation });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to record evaluation' });
  }
});

// PUT /api/evaluations/:id - Update evaluation
evaluationsRouter.put('/:id', authenticate, requireRoles(Role.ADMIN, Role.SUPERVISOR), async (req, res): Promise<void> => {
  try {
    const evaluationId = req.params.id;
    const { status, marksRating, feedback, areasForImprovement, nextSteps, rubricScores, scheduledDate } = req.body;

    const updated = await prisma.evaluation.update({
      where: { id: evaluationId },
      data: {
        status: status ? (status as EvaluationStatus) : undefined,
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
  } catch (error) {
    res.status(500).json({ message: 'Failed to update evaluation' });
  }
});
