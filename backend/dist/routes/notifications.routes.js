import { Router } from 'express';
import { prisma } from '../prisma.js';
import { authenticate } from '../middleware/auth.js';
export const notificationsRouter = Router();
// GET /api/notifications - User notifications
notificationsRouter.get('/', authenticate, async (req, res) => {
    try {
        const { unreadOnly } = req.query;
        const where = { userId: req.user.id };
        if (unreadOnly === 'true')
            where.isRead = false;
        const [notifications, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: 50,
            }),
            prisma.notification.count({
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
notificationsRouter.put('/:id/read', authenticate, async (req, res) => {
    try {
        const notifId = req.params.id;
        await prisma.notification.updateMany({
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
notificationsRouter.put('/read-all', authenticate, async (req, res) => {
    try {
        await prisma.notification.updateMany({
            where: { userId: req.user.id, isRead: false },
            data: { isRead: true },
        });
        res.json({ message: 'All notifications marked as read' });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to mark all as read' });
    }
});
