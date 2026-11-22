import { prisma } from '../prisma.js';
import { format } from 'date-fns';
import fs from 'fs';
import path from 'path';
function getLogoPath() {
    const possiblePaths = [
        path.resolve(process.cwd(), 'src/assets/logo.png'),
        path.resolve(process.cwd(), 'backend/src/assets/logo.png'),
        path.resolve(process.cwd(), '../logo.png'),
        path.resolve(process.cwd(), 'logo.png'),
    ];
    for (const p of possiblePaths) {
        if (fs.existsSync(p))
            return p;
    }
    return null;
}
export class PdfService {
    /**
     * Generates a branded, professional A4 Student Project Progress Report
     */
    static async generateStudentProgressReport(studentId) {
        const student = await prisma.student.findFirst({
            where: {
                OR: [
                    { id: studentId },
                    { userId: studentId },
                ],
            },
            include: {
                project: {
                    include: {
                        milestones: { orderBy: { orderIndex: 'asc' } },
                        tasks: { orderBy: { dueDate: 'asc' } },
                    },
                },
                assignedMentor: true,
                assignedSupervisor: true,
                documents: {
                    include: {
                        versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
                    },
                    orderBy: { documentTypeConfig: { orderIndex: 'asc' } },
                },
                dailyProgresses: {
                    orderBy: { date: 'desc' },
                    take: 5,
                },
                weeklyProgresses: {
                    orderBy: { weekStartDate: 'desc' },
                    take: 3,
                },
                corrections: {
                    orderBy: { createdAt: 'desc' },
                },
                feeAgreement: {
                    include: { payments: { where: { isVoided: false } } },
                },
            },
        });
        if (!student) {
            throw new Error('Student not found');
        }
        const settings = await prisma.instituteSettings.findFirst() || {
            instituteName: 'Pinnacle Mindz',
            subtitle: 'Project Guidance & Progress Management',
            contactEmail: 'contact@pinnaclemindz.com',
            contactPhone: '+94 77 890 1234',
            address: 'Colombo, Sri Lanka',
        };
        const { default: PDFDocument } = await import('pdfkit');
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 40, bottom: 40, left: 45, right: 45 },
                bufferPages: true,
            });
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);
            // --- BRAND HEADER ---
            // Dark Navy Banner
            doc.rect(0, 0, doc.page.width, 95).fill('#0b1329');
            // Accent Cyan Strip
            doc.rect(0, 92, doc.page.width, 4).fill('#06b6d4');
            // Title & Subtitle with Logo
            const logo = getLogoPath();
            if (logo) {
                try {
                    doc.image(logo, 45, 18, { width: 56, height: 56 });
                    doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold');
                    doc.text('PINNACLE MINDZ', 110, 22, { characterSpacing: 2 });
                    doc.fillColor('#38bdf8').fontSize(8.5).font('Helvetica');
                    doc.text(settings.subtitle.toUpperCase(), 110, 46, { characterSpacing: 1.5 });
                    doc.fillColor('#94a3b8').fontSize(7.5);
                    doc.text(`${settings.address} | Tel: ${settings.contactPhone}`, 110, 62);
                }
                catch {
                    doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold');
                    doc.text('PINNACLE MINDZ', 45, 25, { characterSpacing: 2 });
                    doc.fillColor('#38bdf8').fontSize(9).font('Helvetica');
                    doc.text(settings.subtitle.toUpperCase(), 45, 50, { characterSpacing: 1.5 });
                    doc.fillColor('#94a3b8').fontSize(8);
                    doc.text(`${settings.address} | Tel: ${settings.contactPhone}`, 45, 65);
                }
            }
            else {
                doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold');
                doc.text('PINNACLE MINDZ', 45, 25, { characterSpacing: 2 });
                doc.fillColor('#38bdf8').fontSize(9).font('Helvetica');
                doc.text(settings.subtitle.toUpperCase(), 45, 50, { characterSpacing: 1.5 });
                doc.fillColor('#94a3b8').fontSize(8);
                doc.text(`${settings.address} | Tel: ${settings.contactPhone}`, 45, 65);
            }
            // Report Label Pill on Right
            doc.roundedRect(doc.page.width - 210, 25, 165, 45, 4).fill('#162347');
            doc.fillColor('#00f0ff').fontSize(11).font('Helvetica-Bold');
            doc.text('PROJECT PROGRESS REPORT', doc.page.width - 200, 33, { width: 145, align: 'center' });
            doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica');
            doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, doc.page.width - 200, 50, { width: 145, align: 'center' });
            doc.y = 115;
            // --- SECTION 1: STUDENT & PROJECT SUMMARY ---
            doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('1. STUDENT & ACADEMIC PROJECT OVERVIEW', 45, doc.y);
            doc.moveDown(0.3);
            const tableTop = doc.y;
            doc.roundedRect(45, tableTop, doc.page.width - 90, 78, 5).strokeColor('#e2e8f0').fillColor('#f8fafc').fillAndStroke();
            doc.fillColor('#475569').fontSize(8.5).font('Helvetica-Bold');
            doc.text('Student Name:', 55, tableTop + 8);
            doc.fillColor('#0f172a').font('Helvetica').text(student.fullName, 140, tableTop + 8);
            doc.fillColor('#475569').font('Helvetica-Bold').text('Registration No:', 330, tableTop + 8);
            doc.fillColor('#0f172a').font('Helvetica').text(student.registrationNumber, 420, tableTop + 8);
            doc.fillColor('#475569').font('Helvetica-Bold').text('Degree / Batch:', 55, tableTop + 24);
            doc.fillColor('#0f172a').font('Helvetica').text(`${student.degreeProgramme} (${student.batch})`, 140, tableTop + 24);
            doc.fillColor('#475569').font('Helvetica-Bold').text('University:', 330, tableTop + 24);
            doc.fillColor('#0f172a').font('Helvetica').text(student.university, 420, tableTop + 24, { width: 120 });
            doc.fillColor('#475569').font('Helvetica-Bold').text('Assigned Mentor:', 55, tableTop + 42);
            doc.fillColor('#0369a1').font('Helvetica-Bold').text(student.assignedMentor?.fullName || 'Not Assigned', 140, tableTop + 42);
            doc.fillColor('#475569').font('Helvetica-Bold').text('Supervisor:', 330, tableTop + 42);
            doc.fillColor('#0f172a').font('Helvetica').text(student.assignedSupervisor?.fullName || 'Institute Academic Board', 420, tableTop + 42);
            doc.fillColor('#475569').font('Helvetica-Bold').text('Project Title:', 55, tableTop + 60);
            doc.fillColor('#0f172a').font('Helvetica-Bold').text(student.project?.title || 'Untitled Project', 140, tableTop + 60, { width: 380 });
            doc.y = tableTop + 90;
            // Progress Bar Box
            const progressBoxY = doc.y;
            doc.roundedRect(45, progressBoxY, doc.page.width - 90, 36, 4).fillColor('#0b1329').fill();
            doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold').text('DEVELOPMENT STAGE:', 55, progressBoxY + 12);
            doc.fillColor('#38bdf8').text(`${student.project?.currentStage || 'PROPOSAL'}`, 185, progressBoxY + 12);
            doc.fillColor('#ffffff').text('OVERALL PROGRESS:', 330, progressBoxY + 12);
            const completionPct = student.project?.completionPercentage || 0;
            doc.fillColor('#00f0ff').text(`${completionPct.toFixed(1)}%`, 460, progressBoxY + 12);
            // Mini Progress bar inside box
            const barX = 55;
            const barY = progressBoxY + 25;
            const barWidth = doc.page.width - 110;
            doc.rect(barX, barY, barWidth, 4).fillColor('#1e293b').fill();
            doc.rect(barX, barY, (barWidth * completionPct) / 100, 4).fillColor('#06b6d4').fill();
            doc.y = progressBoxY + 46;
            // --- SECTION 2: DOCUMENTATION STATUS CHECKLIST ---
            doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text('2. PROJECT DOCUMENTATION AUDIT CHECKLIST', 45, doc.y);
            doc.moveDown(0.3);
            const docTableHeaderY = doc.y;
            doc.rect(45, docTableHeaderY, doc.page.width - 90, 18).fillColor('#e2e8f0').fill();
            doc.fillColor('#334155').fontSize(8).font('Helvetica-Bold');
            doc.text('DOCUMENT / ARTIFACT', 55, docTableHeaderY + 5);
            doc.text('VERSION', 250, docTableHeaderY + 5);
            doc.text('STATUS', 330, docTableHeaderY + 5);
            doc.text('SUBMITTED / APPROVED', 430, docTableHeaderY + 5);
            let curY = docTableHeaderY + 18;
            doc.font('Helvetica').fontSize(8);
            for (const d of student.documents.slice(0, 8)) {
                doc.rect(45, curY, doc.page.width - 90, 16).fillColor(curY % 32 === 0 ? '#f8fafc' : '#ffffff').fill();
                doc.fillColor('#0f172a').text(d.documentName, 55, curY + 4, { width: 190, ellipsis: true });
                doc.fillColor('#64748b').text(`v${d.currentVersion}`, 255, curY + 4);
                // Status badge color
                let statusColor = '#64748b';
                if (d.status === 'APPROVED')
                    statusColor = '#15803d';
                else if (d.status === 'SUBMITTED')
                    statusColor = '#0369a1';
                else if (d.status === 'REVISION_REQUIRED')
                    statusColor = '#b91c1c';
                else if (d.status === 'IN_PROGRESS')
                    statusColor = '#b45309';
                doc.fillColor(statusColor).font('Helvetica-Bold').text(d.status.replace(/_/g, ' '), 330, curY + 4);
                doc.font('Helvetica').fillColor('#475569').text(d.approvedDate ? format(new Date(d.approvedDate), 'dd/MM/yyyy') : (d.submittedDate ? format(new Date(d.submittedDate), 'dd/MM/yyyy') : 'Pending'), 430, curY + 4);
                curY += 16;
            }
            doc.y = curY + 10;
            // --- SECTION 3: RECENT WEEKLY PROGRESS & SUPERVISOR INSTRUCTIONS ---
            if (doc.y > 600) {
                doc.addPage();
                doc.y = 40;
            }
            doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text('3. LATEST WEEKLY PROGRESS & MENTOR EVALUATION', 45, doc.y);
            doc.moveDown(0.3);
            const latestWeek = student.weeklyProgresses[0];
            if (latestWeek) {
                const weekBoxY = doc.y;
                doc.roundedRect(45, weekBoxY, doc.page.width - 90, 90, 4).strokeColor('#cbd5e1').fillColor('#f8fafc').fillAndStroke();
                doc.fillColor('#0369a1').fontSize(8.5).font('Helvetica-Bold');
                doc.text(`Week ${latestWeek.weekNumber} (${format(new Date(latestWeek.weekStartDate), 'dd MMM')} – ${format(new Date(latestWeek.weekEndDate), 'dd MMM yyyy')}) — Status: ${latestWeek.status}`, 55, weekBoxY + 8);
                doc.fillColor('#334155').fontSize(8).font('Helvetica-Bold').text('Completed Work:', 55, weekBoxY + 22);
                doc.fillColor('#0f172a').font('Helvetica').text(latestWeek.completedActivities, 140, weekBoxY + 22, { width: 390, height: 20 });
                doc.fillColor('#b91c1c').font('Helvetica-Bold').text('Blockers / Mistakes:', 55, weekBoxY + 44);
                doc.fillColor('#0f172a').font('Helvetica').text(latestWeek.problemsBlockers || 'None reported.', 140, weekBoxY + 44, { width: 390, height: 18 });
                doc.fillColor('#15803d').font('Helvetica-Bold').text('Supervisor Guidance:', 55, weekBoxY + 66);
                doc.fillColor('#0f172a').font('Helvetica').text(latestWeek.supervisorFeedback || 'Proceed with next planned sprint milestone.', 140, weekBoxY + 66, { width: 390, height: 18 });
                doc.y = weekBoxY + 100;
            }
            else {
                doc.fillColor('#64748b').fontSize(8.5).font('Helvetica').text('No weekly progress reports submitted yet.', 55, doc.y);
                doc.y += 20;
            }
            // --- SECTION 4: CORRECTIONS & ACTION ITEMS ---
            doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text('4. ACTIVE CORRECTIONS & ACTION POINTS', 45, doc.y);
            doc.moveDown(0.3);
            const activeCorrections = student.corrections.filter((c) => c.status !== 'VERIFIED');
            if (activeCorrections.length > 0) {
                for (const c of activeCorrections.slice(0, 3)) {
                    doc.rect(45, doc.y, doc.page.width - 90, 28).fillColor('#fff1f2').strokeColor('#fecdd3').fillAndStroke();
                    doc.fillColor('#9f1239').fontSize(8).font('Helvetica-Bold').text(`[${c.status}] Issue: ${c.issueDescription}`, 55, doc.y + 4, { width: 480 });
                    doc.fillColor('#4c0519').font('Helvetica').text(`Instruction: ${c.correctionInstruction}`, 55, doc.y + 15, { width: 480 });
                    doc.y += 32;
                }
            }
            else {
                doc.fillColor('#166534').fontSize(8.5).font('Helvetica').text('No pending supervisor corrections. All prior feedback verified.', 55, doc.y);
                doc.y += 18;
            }
            // --- SIGNATURE FOOTER ---
            const sigY = Math.max(doc.y + 25, doc.page.height - 95);
            doc.moveTo(45, sigY).lineTo(185, sigY).strokeColor('#94a3b8').stroke();
            doc.moveTo(225, sigY).lineTo(365, sigY).strokeColor('#94a3b8').stroke();
            doc.moveTo(405, sigY).lineTo(545, sigY).strokeColor('#94a3b8').stroke();
            doc.fillColor('#475569').fontSize(7.5).font('Helvetica');
            doc.text('Assigned Mentor Signature', 45, sigY + 5, { width: 140, align: 'center' });
            doc.text('Academic Supervisor Signature', 225, sigY + 5, { width: 140, align: 'center' });
            doc.text('Institute Director Approval', 405, sigY + 5, { width: 140, align: 'center' });
            // Confidentiality Notice
            doc.fillColor('#94a3b8').fontSize(7).text('CONFIDENTIAL: Pinnacle Mindz Academic Management System. Strictly for internal guidance and university submission evaluation purposes.', 45, doc.page.height - 30, { align: 'center', width: doc.page.width - 90 });
            doc.end();
        });
    }
    /**
     * Generates an official payment receipt PDF
     */
    static async generatePaymentReceiptPdf(paymentId) {
        const payment = await prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
                student: true,
                feeAgreement: {
                    include: { payments: { where: { isVoided: false } } },
                },
                recordedBy: true,
            },
        });
        if (!payment) {
            throw new Error('Payment not found');
        }
        const settings = await prisma.instituteSettings.findFirst() || {
            instituteName: 'Pinnacle Mindz',
            subtitle: 'Project Guidance & Progress Management',
            contactEmail: 'contact@pinnaclemindz.com',
            contactPhone: '+94 77 890 1234',
            address: 'Colombo, Sri Lanka',
        };
        const totalPaid = payment.feeAgreement.payments.reduce((acc, p) => acc + p.amount, 0);
        const balanceRemaining = payment.feeAgreement.finalPayableAmount - totalPaid;
        const { default: PDFDocument } = await import('pdfkit');
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 40, bottom: 40, left: 50, right: 50 },
            });
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);
            // Header Banner
            doc.rect(0, 0, doc.page.width, 100).fill('#0b1329');
            doc.rect(0, 96, doc.page.width, 4).fill('#06b6d4');
            const logo = getLogoPath();
            if (logo) {
                try {
                    doc.image(logo, 50, 18, { width: 60, height: 60 });
                    doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold').text('PINNACLE MINDZ', 120, 24, { characterSpacing: 2 });
                    doc.fillColor('#38bdf8').fontSize(8.5).font('Helvetica').text(settings.subtitle.toUpperCase(), 120, 50);
                    doc.fillColor('#94a3b8').fontSize(7.5).text(`${settings.address} | Tel: ${settings.contactPhone}`, 120, 66);
                }
                catch {
                    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('PINNACLE MINDZ', 50, 25, { characterSpacing: 2 });
                    doc.fillColor('#38bdf8').fontSize(9).font('Helvetica').text(settings.subtitle.toUpperCase(), 50, 52);
                    doc.fillColor('#94a3b8').fontSize(8).text(`${settings.address} | Tel: ${settings.contactPhone}`, 50, 68);
                }
            }
            else {
                doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('PINNACLE MINDZ', 50, 25, { characterSpacing: 2 });
                doc.fillColor('#38bdf8').fontSize(9).font('Helvetica').text(settings.subtitle.toUpperCase(), 50, 52);
                doc.fillColor('#94a3b8').fontSize(8).text(`${settings.address} | Tel: ${settings.contactPhone}`, 50, 68);
            }
            // Official Receipt Badge
            doc.roundedRect(doc.page.width - 200, 25, 150, 48, 4).fill('#162347');
            doc.fillColor('#00f0ff').fontSize(13).font('Helvetica-Bold').text('OFFICIAL RECEIPT', doc.page.width - 195, 33, { width: 140, align: 'center' });
            doc.fillColor('#ffffff').fontSize(9).text(payment.receiptNumber, doc.page.width - 195, 52, { width: 140, align: 'center' });
            doc.y = 130;
            // Receipt Meta Information
            const metaY = doc.y;
            doc.roundedRect(50, metaY, doc.page.width - 100, 65, 4).strokeColor('#e2e8f0').fillColor('#f8fafc').fillAndStroke();
            doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold').text('Receipt Date:', 65, metaY + 12);
            doc.fillColor('#0f172a').font('Helvetica').text(format(new Date(payment.paymentDate), 'dd MMMM yyyy'), 145, metaY + 12);
            doc.fillColor('#475569').font('Helvetica-Bold').text('Payment Method:', 330, metaY + 12);
            doc.fillColor('#0f172a').font('Helvetica').text(payment.paymentMethod.replace(/_/g, ' '), 430, metaY + 12);
            doc.fillColor('#475569').font('Helvetica-Bold').text('Received From:', 65, metaY + 32);
            doc.fillColor('#0f172a').font('Helvetica-Bold').text(payment.student.fullName, 145, metaY + 32);
            doc.fillColor('#475569').font('Helvetica-Bold').text('Ref / Transaction:', 330, metaY + 32);
            doc.fillColor('#0f172a').font('Helvetica').text(payment.referenceNumber || 'N/A (Cash)', 430, metaY + 32);
            doc.fillColor('#475569').font('Helvetica-Bold').text('Student Reg No:', 65, metaY + 48);
            doc.fillColor('#0f172a').font('Helvetica').text(payment.student.registrationNumber, 145, metaY + 48);
            doc.y = metaY + 85;
            // Item Table
            const itemHeaderY = doc.y;
            doc.rect(50, itemHeaderY, doc.page.width - 100, 24).fillColor('#0f172a').fill();
            doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
            doc.text('DESCRIPTION / PARTICULARS', 65, itemHeaderY + 7);
            doc.text('AMOUNT (LKR)', doc.page.width - 160, itemHeaderY + 7, { width: 100, align: 'right' });
            const rowY = itemHeaderY + 24;
            doc.rect(50, rowY, doc.page.width - 100, 40).strokeColor('#e2e8f0').fillColor('#ffffff').fillAndStroke();
            doc.fillColor('#0f172a').fontSize(9).font('Helvetica');
            doc.text(`Final Year Project Guidance & Mentoring Fee Payment\nRemarks: ${payment.remarks || 'Standard course installment fee'}`, 65, rowY + 8, { width: 340 });
            doc.font('Helvetica-Bold').text(`LKR ${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, doc.page.width - 160, rowY + 12, { width: 100, align: 'right' });
            // Financial Calculation Breakdown
            const summaryY = rowY + 50;
            doc.roundedRect(doc.page.width - 270, summaryY, 220, 90, 4).strokeColor('#cbd5e1').fillColor('#f8fafc').fillAndStroke();
            doc.fillColor('#475569').fontSize(8.5).font('Helvetica').text('Total Agreed Course Fee:', doc.page.width - 260, summaryY + 10);
            doc.fillColor('#0f172a').text(`LKR ${payment.feeAgreement.finalPayableAmount.toLocaleString()}`, doc.page.width - 130, summaryY + 10, { width: 70, align: 'right' });
            doc.fillColor('#475569').text('Amount Received This Receipt:', doc.page.width - 260, summaryY + 28);
            doc.fillColor('#16a34a').font('Helvetica-Bold').text(`LKR ${payment.amount.toLocaleString()}`, doc.page.width - 130, summaryY + 28, { width: 70, align: 'right' });
            doc.fillColor('#475569').font('Helvetica').text('Cumulative Amount Paid:', doc.page.width - 260, summaryY + 46);
            doc.fillColor('#0f172a').text(`LKR ${totalPaid.toLocaleString()}`, doc.page.width - 130, summaryY + 46, { width: 70, align: 'right' });
            doc.moveTo(doc.page.width - 260, summaryY + 62).lineTo(doc.page.width - 60, summaryY + 62).strokeColor('#94a3b8').stroke();
            doc.fillColor('#b91c1c').font('Helvetica-Bold').text('Remaining Balance Due:', doc.page.width - 260, summaryY + 70);
            doc.text(`LKR ${balanceRemaining.toLocaleString()}`, doc.page.width - 130, summaryY + 70, { width: 70, align: 'right' });
            // Verification Stamp and Signatures
            const signY = summaryY + 130;
            doc.moveTo(50, signY).lineTo(200, signY).strokeColor('#94a3b8').stroke();
            doc.moveTo(doc.page.width - 200, signY).lineTo(doc.page.width - 50, signY).strokeColor('#94a3b8').stroke();
            doc.fillColor('#475569').fontSize(8).font('Helvetica');
            doc.text(`Recorded By: ${payment.recordedBy.fullName}`, 50, signY + 6);
            doc.text('Authorized Finance Signature & Seal', doc.page.width - 200, signY + 6, { width: 150, align: 'center' });
            doc.end();
        });
    }
}
