"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsRouter = void 0;
const express_1 = require("express");
const prisma_js_1 = require("../prisma.js");
const auth_js_1 = require("../middleware/auth.js");
exports.notificationsRouter = (0, express_1.Router)();
// GET /api/notifications - User notifications
exports.notificationsRouter.get('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const { unreadOnly } = req.query;
        const where = { userId: req.user.id };
        if (unreadOnly === 'true')
            where.isRead = false;
        const [notifications, unreadCount] = await Promise.all([
            prisma_js_1.prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: 50,
            }),
            prisma_js_1.prisma.notification.count({
                where: { userId: req.user.id, isRead: false },
            }),
        ]);
        res.json({ notifications, unreadCount });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to retrieve notifications' });
    }
});
// PUT /api/notifications/:id/read - Mark notification as read
exports.notificationsRouter.put('/:id/read', auth_js_1.authenticate, async (req, res) => {
    try {
        const notifId = req.params.id;
        await prisma_js_1.prisma.notification.updateMany({
            where: { id: notifId, userId: req.user.id },
            data: { isRead: true },
        });
        res.json({ message: 'Marked as read' });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to update notification' });
    }
});
// PUT /api/notifications/read-all - Mark all user notifications as read
exports.notificationsRouter.put('/read-all', auth_js_1.authenticate, async (req, res) => {
    try {
        await prisma_js_1.prisma.notification.updateMany({
            where: { userId: req.user.id, isRead: false },
            data: { isRead: true },
        });
        res.json({ message: 'All notifications marked as read' });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to mark all as read' });
    }
});
