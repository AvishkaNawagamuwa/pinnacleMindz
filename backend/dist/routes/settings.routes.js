import { Router } from 'express';
import { prisma } from '../prisma.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { Role } from '@prisma/client';
export const settingsRouter = Router();
// GET /api/settings - Get institute settings
settingsRouter.get('/', authenticate, async (req, res) => {
    try {
        const settings = await prisma.instituteSettings.findFirst();
        res.json({ settings });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to load institute settings' });
    }
});
// PUT /api/settings - Update institute settings (Admin only)
settingsRouter.put('/', authenticate, requireRoles(Role.ADMIN), async (req, res) => {
    try {
        const { instituteName, subtitle, contactEmail, contactPhone, address, expectedReportingFrequencyDays, supervisorCanEditPayments, mentorsCanViewPaymentIndicator, defaultBatches, } = req.body;
        const existing = await prisma.instituteSettings.findFirst();
        const id = existing?.id || 'default-settings';
        const updated = await prisma.instituteSettings.upsert({
            where: { id },
            update: {
                instituteName,
                subtitle,
                contactEmail,
                contactPhone,
                address,
                expectedReportingFrequencyDays: Number(expectedReportingFrequencyDays) || 7,
                supervisorCanEditPayments: Boolean(supervisorCanEditPayments),
                mentorsCanViewPaymentIndicator: Boolean(mentorsCanViewPaymentIndicator),
                defaultBatches: defaultBatches || undefined,
            },
            create: {
                id,
                instituteName: instituteName || 'Pinnacle Mindz',
                subtitle: subtitle || 'Project Guidance & Progress Management',
                contactEmail: contactEmail || 'contact@pinnaclemindz.com',
                contactPhone: contactPhone || '+94 77 890 1234',
                address: address || 'Colombo, Sri Lanka',
                expectedReportingFrequencyDays: Number(expectedReportingFrequencyDays) || 7,
                supervisorCanEditPayments: Boolean(supervisorCanEditPayments),
                mentorsCanViewPaymentIndicator: Boolean(mentorsCanViewPaymentIndicator),
                defaultBatches: defaultBatches || ['2024', '2025', '2026', '2027'],
            },
        });
        res.json({ message: 'Settings updated successfully', settings: updated });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to update settings' });
    }
});
