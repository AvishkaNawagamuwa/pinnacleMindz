import { Router } from 'express';
import { prisma } from '../prisma.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { Role } from '@prisma/client';
export const activityRouter = Router();
// GET /api/activity - Audit trail
activityRouter.get('/', authenticate, requireRoles(Role.ADMIN, Role.SUPERVISOR), async (req, res) => {
    try {
        const { entityType, entityId, action, search, page = '1', limit = '50' } = req.query;
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 50;
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        if (entityType)
            where.entityType = String(entityType);
        if (entityId)
            where.entityId = String(entityId);
        if (action)
            where.action = String(action);
        if (search) {
            const q = String(search).trim();
            where.OR = [
                { actorName: { contains: q, mode: 'insensitive' } },
                { action: { contains: q, mode: 'insensitive' } },
                { entityType: { contains: q, mode: 'insensitive' } },
            ];
        }
        const [total, logs] = await Promise.all([
            prisma.activityLog.count({ where }),
            prisma.activityLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limitNum,
                include: {
                    actor: { select: { fullName: true, email: true, role: true } },
                },
            }),
        ]);
        res.json({
            logs,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to load activity log' });
    }
});
