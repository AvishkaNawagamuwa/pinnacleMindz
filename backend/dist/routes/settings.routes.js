"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsRouter = void 0;
const express_1 = require("express");
const prisma_js_1 = require("../prisma.js");
const auth_js_1 = require("../middleware/auth.js");
const client_1 = require("@prisma/client");
exports.settingsRouter = (0, express_1.Router)();
// GET /api/settings - Get institute settings
exports.settingsRouter.get('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const settings = await prisma_js_1.prisma.instituteSettings.findFirst();
        res.json({ settings });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to load institute settings' });
    }
});
// PUT /api/settings - Update institute settings (Admin only)
exports.settingsRouter.put('/', auth_js_1.authenticate, (0, auth_js_1.requireRoles)(client_1.Role.ADMIN), async (req, res) => {
    try {
        const { instituteName, subtitle, contactEmail, contactPhone, address, expectedReportingFrequencyDays, supervisorCanEditPayments, mentorsCanViewPaymentIndicator, defaultBatches, } = req.body;
        const existing = await prisma_js_1.prisma.instituteSettings.findFirst();
        const id = existing?.id || 'default-settings';
        const updated = await prisma_js_1.prisma.instituteSettings.upsert({
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
