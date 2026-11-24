"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activityRouter = void 0;
const express_1 = require("express");
const prisma_js_1 = require("../prisma.js");
const auth_js_1 = require("../middleware/auth.js");
const client_1 = require("@prisma/client");
exports.activityRouter = (0, express_1.Router)();
// GET /api/activity - Audit trail
exports.activityRouter.get('/', auth_js_1.authenticate, (0, auth_js_1.requireRoles)(client_1.Role.ADMIN, client_1.Role.SUPERVISOR), async (req, res) => {
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
            prisma_js_1.prisma.activityLog.count({ where }),
            prisma_js_1.prisma.activityLog.findMany({
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
