"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentsRouter = void 0;
const express_1 = require("express");
const prisma_js_1 = require("../prisma.js");
const auth_js_1 = require("../middleware/auth.js");
const client_1 = require("@prisma/client");
const pdfService_js_1 = require("../services/pdfService.js");
exports.paymentsRouter = (0, express_1.Router)();
// Middleware: Verify payment access
const authorizePaymentAccess = async (req, res, next) => {
    if (req.user.role === client_1.Role.ADMIN)
        return next();
    if (req.user.role === client_1.Role.SUPERVISOR) {
        return next();
    }
    if (req.user.role === client_1.Role.STUDENT) {
        // If accessing receipt PDF, check if payment belongs to this student
        if (req.params.id) {
            const payment = await prisma_js_1.prisma.payment.findUnique({
                where: { id: req.params.id },
                select: { student: { select: { userId: true } } },
            });
            if (payment && payment.student?.userId === req.user.id) {
                return next();
            }
        }
    }
    return res.status(403).json({ message: 'Forbidden: You do not have access to financial records.' });
};
// GET /api/payments/dashboard - Financial summary & collection metrics
exports.paymentsRouter.get('/dashboard', auth_js_1.authenticate, authorizePaymentAccess, async (req, res) => {
    try {
        const feeAgreements = await prisma_js_1.prisma.studentFeeAgreement.findMany({
            include: {
                payments: { where: { isVoided: false } },
                installments: true,
                student: { select: { fullName: true, studentId: true, registrationNumber: true } },
            },
        });
        let totalExpectedRevenue = 0;
        let totalCollectedRevenue = 0;
        const pendingInstallments = [];
        const overdueInstallments = [];
        const now = new Date();
        for (const fa of feeAgreements) {
            totalExpectedRevenue += fa.finalPayableAmount;
            const studentPaid = fa.payments.reduce((acc, p) => acc + p.amount, 0);
            totalCollectedRevenue += studentPaid;
            for (const inst of fa.installments) {
                if (inst.status !== 'PAID') {
                    const isOverdue = new Date(inst.dueDate) < now;
                    const instData = {
                        id: inst.id,
                        student: fa.student,
                        installmentNumber: inst.installmentNumber,
                        amount: inst.amount,
                        dueDate: inst.dueDate,
                        isOverdue,
                    };
                    if (isOverdue)
                        overdueInstallments.push(instData);
                    else
                        pendingInstallments.push(instData);
                }
            }
        }
        const outstandingBalance = Math.max(0, totalExpectedRevenue - totalCollectedRevenue);
        // Monthly collection aggregation for charts
        const payments = await prisma_js_1.prisma.payment.findMany({
            where: { isVoided: false },
            orderBy: { paymentDate: 'asc' },
            select: { amount: true, paymentDate: true },
        });
        const monthlyMap = {};
        for (const p of payments) {
            const monthKey = new Date(p.paymentDate).toLocaleString('default', { month: 'short', year: 'numeric' });
            monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + p.amount;
        }
        const monthlyCollections = Object.entries(monthlyMap).map(([month, amount]) => ({
            month,
            amount,
        }));
        res.json({
            totalExpectedRevenue,
            totalCollectedRevenue,
            outstandingBalance,
            collectionRate: totalExpectedRevenue > 0 ? (totalCollectedRevenue / totalExpectedRevenue) * 100 : 0,
            monthlyCollections,
            overdueInstallmentsCount: overdueInstallments.length,
            overdueInstallments,
            pendingInstallments,
        });
    }
    catch (error) {
        console.error('Payment dashboard error:', error);
        res.status(500).json({ message: 'Failed to retrieve payment dashboard metrics' });
    }
});
// GET /api/payments - List all payment transactions
exports.paymentsRouter.get('/', auth_js_1.authenticate, authorizePaymentAccess, async (req, res) => {
    try {
        const { studentId, search, limit = '100' } = req.query;
        const where = {};
        if (studentId)
            where.studentId = String(studentId);
        if (search) {
            where.OR = [
                { receiptNumber: { contains: String(search), mode: 'insensitive' } },
                { referenceNumber: { contains: String(search), mode: 'insensitive' } },
                { student: { fullName: { contains: String(search), mode: 'insensitive' } } },
                { student: { registrationNumber: { contains: String(search), mode: 'insensitive' } } },
            ];
        }
        const payments = await prisma_js_1.prisma.payment.findMany({
            where,
            orderBy: { paymentDate: 'desc' },
            take: parseInt(limit, 10),
            include: {
                student: { select: { id: true, studentId: true, fullName: true, registrationNumber: true } },
                recordedBy: { select: { fullName: true } },
                feeAgreement: { select: { finalPayableAmount: true } },
            },
        });
        res.json({ payments });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to retrieve payments' });
    }
});
// POST /api/payments - Record a payment (Admin only)
exports.paymentsRouter.post('/', auth_js_1.authenticate, (0, auth_js_1.requireRoles)(client_1.Role.ADMIN), async (req, res) => {
    try {
        const { studentId, amount, paymentMethod = 'BANK_TRANSFER', referenceNumber, receiptNumber, paymentDate = new Date(), remarks, } = req.body;
        if (!studentId || !amount || Number(amount) <= 0) {
            res.status(400).json({ message: 'studentId and valid payment amount are required.' });
            return;
        }
        const student = await prisma_js_1.prisma.student.findUnique({
            where: { id: studentId },
            include: {
                feeAgreement: {
                    include: {
                        installments: { orderBy: { installmentNumber: 'asc' } },
                        payments: { where: { isVoided: false } },
                    },
                },
            },
        });
        if (!student || !student.feeAgreement) {
            res.status(404).json({ message: 'Student or fee agreement record not found.' });
            return;
        }
        // Generate or validate unique receipt number
        let finalReceiptNumber = receiptNumber?.trim();
        if (!finalReceiptNumber) {
            finalReceiptNumber = `PM-RCP-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 90 + 10)}`;
        }
        else {
            const existingReceipt = await prisma_js_1.prisma.payment.findUnique({
                where: { receiptNumber: finalReceiptNumber },
            });
            if (existingReceipt) {
                res.status(400).json({ message: `Receipt number "${finalReceiptNumber}" is already in use.` });
                return;
            }
        }
        const paymentIdCode = `RCP-${new Date().getFullYear()}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const newPayment = await prisma_js_1.prisma.$transaction(async (tx) => {
            // 1. Create Payment
            const payment = await tx.payment.create({
                data: {
                    paymentId: paymentIdCode,
                    feeAgreementId: student.feeAgreement.id,
                    studentId: student.id,
                    amount: Number(amount),
                    paymentMethod: paymentMethod,
                    referenceNumber,
                    receiptNumber: finalReceiptNumber,
                    paymentDate: new Date(paymentDate),
                    recordedById: req.user.id,
                    remarks,
                },
                include: {
                    student: true,
                    recordedBy: true,
                },
            });
            // 2. Mark earliest unpaid installment as paid if applicable
            const unpaidInstallment = student.feeAgreement.installments.find((inst) => inst.status !== client_1.InstallmentStatus.PAID);
            if (unpaidInstallment) {
                await tx.paymentInstallment.update({
                    where: { id: unpaidInstallment.id },
                    data: { status: client_1.InstallmentStatus.PAID, paidDate: new Date() },
                });
            }
            // 3. Create Audit Log
            await tx.paymentAuditLog.create({
                data: {
                    paymentId: payment.id,
                    actorId: req.user.id,
                    action: 'CREATED',
                    newState: { amount: payment.amount, receiptNumber: payment.receiptNumber, method: payment.paymentMethod },
                    note: `Payment recorded by ${req.user.fullName}`,
                },
            });
            // 4. Activity log
            await tx.activityLog.create({
                data: {
                    actorId: req.user.id,
                    actorName: req.user.fullName,
                    actorRole: req.user.role,
                    action: 'RECORD_PAYMENT',
                    entityType: 'Payment',
                    entityId: payment.id,
                    details: { amount: payment.amount, receiptNumber: payment.receiptNumber, student: student.fullName },
                },
            });
            return payment;
        });
        res.status(201).json({ message: 'Payment recorded successfully', payment: newPayment });
    }
    catch (error) {
        console.error('Record payment error:', error);
        res.status(500).json({ message: error.message || 'Failed to record payment' });
    }
});
// PUT /api/payments/:id/void - Void payment with audit log (Admin only)
exports.paymentsRouter.put('/:id/void', auth_js_1.authenticate, (0, auth_js_1.requireRoles)(client_1.Role.ADMIN), async (req, res) => {
    try {
        const paymentId = req.params.id;
        const { voidReason } = req.body;
        if (!voidReason) {
            res.status(400).json({ message: 'Reason for voiding transaction is required for audit purposes.' });
            return;
        }
        const payment = await prisma_js_1.prisma.payment.findUnique({
            where: { id: paymentId },
        });
        if (!payment) {
            res.status(404).json({ message: 'Payment not found' });
            return;
        }
        if (payment.isVoided) {
            res.status(400).json({ message: 'Payment is already voided' });
            return;
        }
        const updated = await prisma_js_1.prisma.$transaction(async (tx) => {
            const p = await tx.payment.update({
                where: { id: paymentId },
                data: {
                    isVoided: true,
                    voidReason,
                },
            });
            await tx.paymentAuditLog.create({
                data: {
                    paymentId,
                    actorId: req.user.id,
                    action: 'VOIDED',
                    previousState: { isVoided: false },
                    newState: { isVoided: true, voidReason },
                    note: `Transaction voided by ${req.user.fullName}: ${voidReason}`,
                },
            });
            return p;
        });
        res.json({ message: 'Payment voided and audit recorded', payment: updated });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to void payment' });
    }
});
// GET /api/payments/:id/receipt-pdf - Download official PDF receipt
exports.paymentsRouter.get('/:id/receipt-pdf', auth_js_1.authenticate, authorizePaymentAccess, async (req, res) => {
    try {
        const paymentId = req.params.id;
        const pdfBuffer = await pdfService_js_1.PdfService.generatePaymentReceiptPdf(paymentId);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="receipt_${paymentId}.pdf"`);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('PDF Receipt error:', error);
        res.status(500).json({ message: 'Failed to generate PDF receipt' });
    }
});
