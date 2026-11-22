import { PrismaClient, Role, StudentStatus, DevelopmentStage, DocumentStatus, WeeklyStatus, Priority, TaskStatus, CorrectionStatus, MeetingType, MeetingStatus, EvaluationStage, EvaluationStatus, PaymentPlan, PaymentMethod, InstallmentStatus, NotificationType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Pinnacle Mindz database seeding...');

  // 1. Institute Settings
  const settings = await prisma.instituteSettings.upsert({
    where: { id: 'default-settings' },
    update: {},
    create: {
      id: 'default-settings',
      instituteName: 'Pinnacle Mindz',
      subtitle: 'Project Guidance & Progress Management',
      logoUrl: '/logo.svg',
      contactEmail: 'contact@pinnaclemindz.com',
      contactPhone: '+94 77 890 1234',
      address: 'No. 45/A, High Level Road, Maharagama, Colombo, Sri Lanka',
      expectedReportingFrequencyDays: 7,
      supervisorCanEditPayments: false,
      mentorsCanViewPaymentIndicator: true,
      defaultBatches: ['2024', '2025', '2026', '2027'],
    },
  });
  console.log('✓ Institute settings configured.');

  // 2. Default Document Types
  const docTypes = [
    { code: 'PROP', name: 'Project Idea / Proposal', description: 'Initial concept document and problem definition', defaultDeadlineDays: 14, orderIndex: 1 },
    { code: 'SUP_FORM', name: 'Supervisor Form', description: 'Official supervisor consent and declaration form', defaultDeadlineDays: 21, orderIndex: 2 },
    { code: 'SCOPE_FORM', name: 'Project Scope Form', description: 'Boundary and constraint specifications', defaultDeadlineDays: 28, orderIndex: 3 },
    { code: 'SCOPE_AGREE', name: 'Scope Agreement', description: 'Mutual agreement between student, supervisor, and institute', defaultDeadlineDays: 35, orderIndex: 4 },
    { code: 'SCOPE_DOC', name: 'Scope Documentation', description: 'Detailed scope documentation with user stories', defaultDeadlineDays: 45, orderIndex: 5 },
    { code: 'SRS_SPEC', name: 'Software Requirements Specification (SRS)', description: 'IEEE standard SRS document', defaultDeadlineDays: 60, orderIndex: 6 },
    { code: 'SYS_DESIGN', name: 'System Design & Architecture', description: 'Architectural blueprints, ER diagrams & sequence diagrams', defaultDeadlineDays: 75, orderIndex: 7 },
    { code: 'PROG_REP', name: 'Progress Report (Mid-Term)', description: 'First milestone functional progress report', defaultDeadlineDays: 90, orderIndex: 8 },
    { code: 'INTERIM_REP', name: 'Interim Report', description: 'Comprehensive intermediate project report', defaultDeadlineDays: 120, orderIndex: 9 },
    { code: 'TEST_REP', name: 'Test Plan & Report', description: 'Unit, integration, and UAT test execution logs', defaultDeadlineDays: 140, orderIndex: 10 },
    { code: 'FINAL_REP', name: 'Final Dissertation / Report', description: 'Official hardbound report following university formatting', defaultDeadlineDays: 160, orderIndex: 11 },
    { code: 'VIVA_PREP', name: 'Viva Voce & Demo Materials', description: 'Slide decks, demo test scripts, and viva Q&A', defaultDeadlineDays: 175, orderIndex: 12 },
  ];

  for (const dt of docTypes) {
    await prisma.documentType.upsert({
      where: { code: dt.code },
      update: { name: dt.name, description: dt.description, defaultDeadlineDays: dt.defaultDeadlineDays, orderIndex: dt.orderIndex },
      create: dt,
    });
  }
  console.log(`✓ Seeded ${docTypes.length} document types.`);

  // 3. Users: Admin, 2 Supervisors, 6 Mentors
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const superPassword = await bcrypt.hash('Super@123', 10);
  const mentorPassword = await bcrypt.hash('Mentor@123', 10);
  const studentPassword = await bcrypt.hash('Student@123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@pinnaclemindz.com' },
    update: {},
    create: {
      email: 'admin@pinnaclemindz.com',
      passwordHash: adminPassword,
      fullName: 'Institute Director / Admin',
      role: Role.ADMIN,
      phone: '+94 77 111 2233',
    },
  });

  const sup1 = await prisma.user.upsert({
    where: { email: 'supervisor1@pinnaclemindz.com' },
    update: {},
    create: {
      email: 'supervisor1@pinnaclemindz.com',
      passwordHash: superPassword,
      fullName: 'Dr. Kalinga Perera',
      role: Role.SUPERVISOR,
      phone: '+94 71 234 5678',
    },
  });

  const sup2 = await prisma.user.upsert({
    where: { email: 'supervisor2@pinnaclemindz.com' },
    update: {},
    create: {
      email: 'supervisor2@pinnaclemindz.com',
      passwordHash: superPassword,
      fullName: 'Eng. Manjula Senanayake',
      role: Role.SUPERVISOR,
      phone: '+94 72 345 6789',
    },
  });

  const mentorsData = [
    { email: 'mentor1@pinnaclemindz.com', fullName: 'Nuwan Bandara (Demo 01)', phone: '+94 77 222 3344' },
    { email: 'mentor2@pinnaclemindz.com', fullName: 'Dilini Samarasinghe (Demo 02)', phone: '+94 77 333 4455' },
    { email: 'mentor3@pinnaclemindz.com', fullName: 'Kasun Jayawardena (Demo 03)', phone: '+94 77 444 5566' },
    { email: 'mentor4@pinnaclemindz.com', fullName: 'Thilina Silva (Demo 04)', phone: '+94 77 555 6677' },
    { email: 'mentor5@pinnaclemindz.com', fullName: 'Chathuri Fernando (Demo 05)', phone: '+94 77 666 7788' },
    { email: 'mentor6@pinnaclemindz.com', fullName: 'Ramesh Wickramasinghe (Demo 06)', phone: '+94 77 777 8899' },
  ];

  const mentors = [];
  for (const m of mentorsData) {
    const createdMentor = await prisma.user.upsert({
      where: { email: m.email },
      update: {},
      create: {
        email: m.email,
        passwordHash: mentorPassword,
        fullName: m.fullName,
        role: Role.MENTOR,
        phone: m.phone,
      },
    });
    mentors.push(createdMentor);
  }
  console.log(`✓ Seeded Admin, 2 Supervisors, and ${mentors.length} Mentors.`);

  // 4. Sample Students with full lifecycles
  const allDocTypes = await prisma.documentType.findMany({ orderBy: { orderIndex: 'asc' } });

  const studentsData = [
    {
      studentId: 'PM-2026-001',
      registrationNumber: '2300839',
      fullName: 'Avishka Nawagamuwa',
      email: 'avishka.n@student.pinnacle.lk',
      contactNumber: '+94 71 900 1122',
      whatsappNumber: '+94 71 900 1122',
      batch: '2026',
      degreeProgramme: 'Bachelor of Information Technology (BIT)',
      university: 'University of Colombo School of Computing (UCSC)',
      status: StudentStatus.ACTIVE,
      assignedSupervisorId: sup1.id,
      assignedMentorId: mentors[0].id, // Demo 01
      project: {
        projectId: 'PRJ-2026-001',
        title: 'Sampath Grocery & Inventory Enterprise Cloud System',
        idea: 'An omnichannel automated inventory, POS, and supplier restocking prediction system for retail grocery chains.',
        problemStatement: 'Manual stock calculations lead to overstocking perishables, stockouts of fast-moving items, and delayed supplier purchase orders.',
        proposedSolution: 'Spring Boot REST backend with Next.js frontend, featuring real-time barcode scanning, automated batch FIFO tracking, and predictive restocking alerts.',
        mainObjectives: '1. Build fast POS checkout with barcode validation\n2. Automate stock batch FIFO tracking\n3. Generate low stock alerts and automated purchase orders\n4. Role-based security for cashiers, stockkeepers, and managers.',
        mainModules: 'Authentication & RBAC, Product & Category Management, Batch & Expiry Tracker, Point of Sale (POS), Supplier & GRN Engine, Analytics & Financial Reports.',
        techStack: 'Spring Boot 3, React, Tailwind CSS, PostgreSQL, Chart.js',
        category: 'Web & Enterprise Application',
        currentStage: DevelopmentStage.IMPLEMENTATION,
        completionPercentage: 65.0,
        githubRepoUrl: 'https://github.com/AvishkaNawagamuwa/sampath-grocery-shop-project',
        demoUrl: 'https://sampath-grocery-demo.pinnaclemindz.lk',
      },
      fee: {
        totalAgreedFee: 65000.0,
        discount: 5000.0,
        finalPayableAmount: 60000.0,
        paymentPlan: PaymentPlan.INSTALLMENTS,
        initialPayment: 20000.0,
        numberOfInstallments: 3,
        installments: [
          { installmentNumber: 1, amount: 20000.0, dueDate: new Date('2026-08-15'), status: InstallmentStatus.PAID, paidDate: new Date('2026-08-14') },
          { installmentNumber: 2, amount: 20000.0, dueDate: new Date('2026-10-15'), status: InstallmentStatus.PAID, paidDate: new Date('2026-10-12') },
          { installmentNumber: 3, amount: 20000.0, dueDate: new Date('2026-12-15'), status: InstallmentStatus.PENDING },
        ],
        payments: [
          { paymentId: 'RCP-2026-001', receiptNumber: 'PM-RCP-0101', amount: 20000.0, paymentMethod: PaymentMethod.BANK_TRANSFER, referenceNumber: 'TXN-BOC-88912', remarks: 'First installment / Registration fee' },
          { paymentId: 'RCP-2026-002', receiptNumber: 'PM-RCP-0142', amount: 20000.0, paymentMethod: PaymentMethod.CASH, referenceNumber: 'CASH-COL-009', remarks: 'Second installment' },
        ],
      },
    },
    {
      studentId: 'PM-2026-002',
      registrationNumber: '2319421',
      fullName: 'Tharusha Wickramasinghe',
      email: 'tharusha.w@student.pinnacle.lk',
      contactNumber: '+94 77 444 8899',
      whatsappNumber: '+94 77 444 8899',
      batch: '2026',
      degreeProgramme: 'Bachelor of Information Technology (BIT)',
      university: 'University of Colombo School of Computing (UCSC)',
      status: StudentStatus.ACTIVE,
      assignedSupervisorId: sup1.id,
      assignedMentorId: mentors[0].id, // Demo 01
      project: {
        projectId: 'PRJ-2026-002',
        title: 'MedSync: Distributed Telehealth Consultation & Digital Prescription Hub',
        idea: 'Connecting remote rural clinics with city hospitals through WebRTC video triage and encrypted e-prescriptions.',
        problemStatement: 'Patients in remote provinces endure 6-hour journeys for 10-minute specialist follow-up appointments.',
        proposedSolution: 'Secure appointment queueing, WebRTC low-latency video calls, digital signature prescription generator, and pharmacy dispensary dispatch.',
        mainObjectives: 'Real-time patient queue, appointment booking, digital prescriptions, doctor scheduling calendar.',
        mainModules: 'Doctor Portal, Patient App, Video Consultation, Prescription Generator, Pharmacy Dispatch.',
        techStack: 'Node.js, Express, React, WebRTC, PostgreSQL, Redis',
        category: 'Healthcare & IoT',
        currentStage: DevelopmentStage.TESTING,
        completionPercentage: 80.0,
        githubRepoUrl: 'https://github.com/tharusha-w/medsync-telehealth',
      },
      fee: {
        totalAgreedFee: 65000.0,
        discount: 0.0,
        finalPayableAmount: 65000.0,
        paymentPlan: PaymentPlan.INSTALLMENTS,
        initialPayment: 25000.0,
        numberOfInstallments: 3,
        installments: [
          { installmentNumber: 1, amount: 25000.0, dueDate: new Date('2026-07-20'), status: InstallmentStatus.PAID, paidDate: new Date('2026-07-19') },
          { installmentNumber: 2, amount: 20000.0, dueDate: new Date('2026-09-20'), status: InstallmentStatus.PAID, paidDate: new Date('2026-09-21') },
          { installmentNumber: 3, amount: 20000.0, dueDate: new Date('2026-11-20'), status: InstallmentStatus.OVERDUE },
        ],
        payments: [
          { paymentId: 'RCP-2026-003', receiptNumber: 'PM-RCP-0105', amount: 25000.0, paymentMethod: PaymentMethod.BANK_TRANSFER, referenceNumber: 'COM-TXN-99120', remarks: 'Registration fee' },
          { paymentId: 'RCP-2026-004', receiptNumber: 'PM-RCP-0129', amount: 20000.0, paymentMethod: PaymentMethod.BANK_TRANSFER, referenceNumber: 'COM-TXN-10492', remarks: 'Second installment' },
        ],
      },
    },
    {
      studentId: 'PM-2026-003',
      registrationNumber: '2200194',
      fullName: 'Sanduni Jayawardena',
      email: 'sanduni.j@student.pinnacle.lk',
      contactNumber: '+94 76 123 7788',
      whatsappNumber: '+94 76 123 7788',
      batch: '2026',
      degreeProgramme: 'BSc (Hons) in Information Technology',
      university: 'Sri Lanka Institute of Information Technology (SLIIT)',
      status: StudentStatus.ACTIVE,
      assignedSupervisorId: sup2.id,
      assignedMentorId: mentors[1].id, // Demo 02
      project: {
        projectId: 'PRJ-2026-003',
        title: 'ColdTrace: IoT-Driven Vaccine Cold-Chain Monitoring Platform',
        idea: 'Real-time telemetry tracking temperature excursions during pharmaceuticals transport.',
        problemStatement: 'Spoilage of vaccine doses due to undetected refrigeration power cuts during inter-district transit.',
        proposedSolution: 'ESP32 MQTT sensors streaming temperature and GPS coords to an event-driven dashboard with immediate SMS/Email escalation.',
        mainObjectives: 'Telemetry ingestion, threshold breaches, geofenced route tracking, compliance reports for health ministry.',
        mainModules: 'Sensor Ingestion, Realtime Map, Alert Dispatcher, Incident Management, Compliance Auditor.',
        techStack: 'Python FastAPI, MQTT Mosquitto, React, TimescaleDB, Docker',
        category: 'IoT & Telemetry',
        currentStage: DevelopmentStage.SRS_DESIGN,
        completionPercentage: 40.0,
      },
      fee: {
        totalAgreedFee: 70000.0,
        discount: 5000.0,
        finalPayableAmount: 65000.0,
        paymentPlan: PaymentPlan.FULL,
        initialPayment: 65000.0,
        numberOfInstallments: 1,
        installments: [
          { installmentNumber: 1, amount: 65000.0, dueDate: new Date('2026-09-01'), status: InstallmentStatus.PAID, paidDate: new Date('2026-08-30') },
        ],
        payments: [
          { paymentId: 'RCP-2026-005', receiptNumber: 'PM-RCP-0118', amount: 65000.0, paymentMethod: PaymentMethod.BANK_TRANSFER, referenceNumber: 'HSBC-SL-44129', remarks: 'Full course fee settlement' },
        ],
      },
    },
    {
      studentId: 'PM-2026-004',
      registrationNumber: '2300552',
      fullName: 'Kavindu Senaratne',
      email: 'kavindu.s@student.pinnacle.lk',
      contactNumber: '+94 70 888 3322',
      batch: '2026',
      degreeProgramme: 'Bachelor of Information Technology (BIT)',
      university: 'University of Colombo School of Computing (UCSC)',
      status: StudentStatus.ACTIVE,
      assignedSupervisorId: sup1.id,
      assignedMentorId: mentors[1].id, // Demo 02
      project: {
        projectId: 'PRJ-2026-004',
        title: 'CogniHire: NLP Automated Resume Screening & Candidate Ranker',
        idea: 'Machine-learning engine parsing complex CV formats and matching candidates to job descriptions based on semantic similarity.',
        problemStatement: 'HR recruitment bottlenecks parsing thousands of unstructured PDF resumes.',
        proposedSolution: 'SpaCy NLP model with vector embeddings to rank candidate relevance, extract skill taxonomies, and anonymize bias.',
        mainObjectives: 'Resume parser, semantic similarity scoring, recruiter interview scheduling, bias reduction.',
        mainModules: 'Document OCR & NLP, Candidate Ranking, Recruiter ATS Dashboard, Notification Engine.',
        techStack: 'Python, Flask, PyTorch, React, PostgreSQL',
        category: 'AI & Data Science',
        currentStage: DevelopmentStage.PROPOSAL,
        completionPercentage: 25.0,
      },
      fee: {
        totalAgreedFee: 65000.0,
        discount: 0.0,
        finalPayableAmount: 65000.0,
        paymentPlan: PaymentPlan.INSTALLMENTS,
        initialPayment: 25000.0,
        numberOfInstallments: 2,
        installments: [
          { installmentNumber: 1, amount: 25000.0, dueDate: new Date('2026-10-01'), status: InstallmentStatus.PAID, paidDate: new Date('2026-10-02') },
          { installmentNumber: 2, amount: 40000.0, dueDate: new Date('2026-12-01'), status: InstallmentStatus.PENDING },
        ],
        payments: [
          { paymentId: 'RCP-2026-006', receiptNumber: 'PM-RCP-0155', amount: 25000.0, paymentMethod: PaymentMethod.CASH, referenceNumber: 'REC-OCT-09', remarks: 'First installment payment' },
        ],
      },
    },
    {
      studentId: 'PM-2026-005',
      registrationNumber: '2310892',
      fullName: 'Malith Dias',
      email: 'malith.d@student.pinnacle.lk',
      contactNumber: '+94 77 999 1100',
      batch: '2026',
      degreeProgramme: 'Bachelor of Information Technology (BIT)',
      university: 'University of Colombo School of Computing (UCSC)',
      status: StudentStatus.ACTIVE,
      assignedSupervisorId: sup2.id,
      assignedMentorId: mentors[2].id, // Demo 03
      project: {
        projectId: 'PRJ-2026-005',
        title: 'AgroSense: Microclimate Soil Moisture & Automated Drip Irrigation',
        idea: 'Precision agriculture controller optimizing water usage based on local meteorological forecasts.',
        problemStatement: 'Crop losses due to overwatering or drought in paddy cultivations.',
        proposedSolution: 'LoRaWAN microclimate telemetry stations connected to cloud solenoid valves with automated water volume triggers.',
        mainObjectives: 'Automate irrigation, monitor soil EC and NPK, alert farmers of pest risks.',
        mainModules: 'Hardware Interface, Field Mapping, Valve Scheduler, Analytics Dashboard.',
        techStack: 'Embedded C, Node.js, React, PostgreSQL, Grafana',
        category: 'IoT & Telemetry',
        currentStage: DevelopmentStage.DOCUMENTATION,
        completionPercentage: 75.0,
      },
      fee: {
        totalAgreedFee: 60000.0,
        discount: 0.0,
        finalPayableAmount: 60000.0,
        paymentPlan: PaymentPlan.INSTALLMENTS,
        initialPayment: 20000.0,
        numberOfInstallments: 3,
        installments: [
          { installmentNumber: 1, amount: 20000.0, dueDate: new Date('2026-07-01'), status: InstallmentStatus.PAID, paidDate: new Date('2026-06-28') },
          { installmentNumber: 2, amount: 20000.0, dueDate: new Date('2026-09-01'), status: InstallmentStatus.PAID, paidDate: new Date('2026-09-02') },
          { installmentNumber: 3, amount: 20000.0, dueDate: new Date('2026-11-01'), status: InstallmentStatus.PAID, paidDate: new Date('2026-10-30') },
        ],
        payments: [
          { paymentId: 'RCP-2026-007', receiptNumber: 'PM-RCP-0089', amount: 20000.0, paymentMethod: PaymentMethod.BANK_TRANSFER, referenceNumber: 'SAMP-9901', remarks: '1st payment' },
          { paymentId: 'RCP-2026-008', receiptNumber: 'PM-RCP-0122', amount: 20000.0, paymentMethod: PaymentMethod.BANK_TRANSFER, referenceNumber: 'SAMP-1029', remarks: '2nd payment' },
          { paymentId: 'RCP-2026-009', receiptNumber: 'PM-RCP-0160', amount: 20000.0, paymentMethod: PaymentMethod.BANK_TRANSFER, referenceNumber: 'SAMP-1284', remarks: 'Final settlement' },
        ],
      },
    },
    {
      studentId: 'PM-2026-006',
      registrationNumber: '2301145',
      fullName: 'Dinithi Weerasinghe',
      email: 'dinithi.w@student.pinnacle.lk',
      contactNumber: '+94 75 333 9911',
      batch: '2026',
      degreeProgramme: 'BSc Software Engineering',
      university: 'Curtin Colombo',
      status: StudentStatus.ACTIVE,
      assignedSupervisorId: sup1.id,
      assignedMentorId: mentors[3].id, // Demo 04
      project: {
        projectId: 'PRJ-2026-006',
        title: 'FleetMatrix: Microservices Route Dispatch & Fuel Consumption Engine',
        idea: 'Optimizing commercial multi-drop logistics fleets to minimize fuel waste and mileage.',
        problemStatement: 'Inefficient dispatch routes costing 25% extra fuel across 50 delivery trucks daily.',
        proposedSolution: 'Dijkstra and simulated annealing route optimization engine built as Dockerized Spring microservices.',
        mainObjectives: 'Dynamic route calculation, fuel consumption logging, proof of delivery upload.',
        mainModules: 'Fleet Registry, Route Optimizer, Mobile Driver PWA, Fuel Auditor.',
        techStack: 'Spring Boot Microservices, Angular, PostgreSQL, Kafka',
        category: 'Web & Enterprise Application',
        currentStage: DevelopmentStage.VIVA_PREPARATION,
        completionPercentage: 92.0,
      },
      fee: {
        totalAgreedFee: 65000.0,
        discount: 5000.0,
        finalPayableAmount: 60000.0,
        paymentPlan: PaymentPlan.INSTALLMENTS,
        initialPayment: 20000.0,
        numberOfInstallments: 3,
        installments: [
          { installmentNumber: 1, amount: 20000.0, dueDate: new Date('2026-06-15'), status: InstallmentStatus.PAID, paidDate: new Date('2026-06-14') },
          { installmentNumber: 2, amount: 20000.0, dueDate: new Date('2026-08-15'), status: InstallmentStatus.PAID, paidDate: new Date('2026-08-15') },
          { installmentNumber: 3, amount: 20000.0, dueDate: new Date('2026-10-15'), status: InstallmentStatus.PAID, paidDate: new Date('2026-10-14') },
        ],
        payments: [
          { paymentId: 'RCP-2026-010', receiptNumber: 'PM-RCP-0081', amount: 20000.0, paymentMethod: PaymentMethod.BANK_TRANSFER, referenceNumber: 'COM-TXN-5541', remarks: '1st installment' },
          { paymentId: 'RCP-2026-011', receiptNumber: 'PM-RCP-0110', amount: 20000.0, paymentMethod: PaymentMethod.BANK_TRANSFER, referenceNumber: 'COM-TXN-6721', remarks: '2nd installment' },
          { paymentId: 'RCP-2026-012', receiptNumber: 'PM-RCP-0149', amount: 20000.0, paymentMethod: PaymentMethod.BANK_TRANSFER, referenceNumber: 'COM-TXN-8812', remarks: '3rd installment' },
        ],
      },
    },
  ];

  for (const s of studentsData) {
    // Create Student user login
    const studentUser = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        email: s.email,
        passwordHash: studentPassword,
        fullName: s.fullName,
        role: Role.STUDENT,
        phone: s.contactNumber,
      },
    });

    const student = await prisma.student.upsert({
      where: { studentId: s.studentId },
      update: {},
      create: {
        studentId: s.studentId,
        registrationNumber: s.registrationNumber,
        fullName: s.fullName,
        email: s.email,
        contactNumber: s.contactNumber,
        whatsappNumber: s.whatsappNumber,
        batch: s.batch,
        degreeProgramme: s.degreeProgramme,
        university: s.university,
        status: s.status,
        userId: studentUser.id,
        assignedSupervisorId: s.assignedSupervisorId,
        assignedMentorId: s.assignedMentorId,
      },
    });

    // Create Project
    const project = await prisma.project.upsert({
      where: { projectId: s.project.projectId },
      update: {},
      create: {
        projectId: s.project.projectId,
        studentId: student.id,
        title: s.project.title,
        idea: s.project.idea,
        problemStatement: s.project.problemStatement,
        proposedSolution: s.project.proposedSolution,
        mainObjectives: s.project.mainObjectives,
        mainModules: s.project.mainModules,
        techStack: s.project.techStack,
        category: s.project.category,
        currentStage: s.project.currentStage,
        completionPercentage: s.project.completionPercentage,
        githubRepoUrl: s.project.githubRepoUrl,
        demoUrl: s.project.demoUrl,
      },
    });

    // Create Project Milestones
    const milestonesList = [
      { title: 'Project Proposal & Scope Freeze', stage: DevelopmentStage.PROPOSAL, weight: 10.0, status: TaskStatus.COMPLETED, orderIndex: 1 },
      { title: 'SRS & Architectural Blueprint', stage: DevelopmentStage.SRS_DESIGN, weight: 15.0, status: s.project.completionPercentage >= 40 ? TaskStatus.COMPLETED : TaskStatus.IN_PROGRESS, orderIndex: 2 },
      { title: 'Core Database & Backend API Development', stage: DevelopmentStage.IMPLEMENTATION, weight: 25.0, status: s.project.completionPercentage >= 65 ? TaskStatus.COMPLETED : TaskStatus.IN_PROGRESS, orderIndex: 3 },
      { title: 'Frontend UI & System Integration', stage: DevelopmentStage.IMPLEMENTATION, weight: 20.0, status: s.project.completionPercentage >= 80 ? TaskStatus.COMPLETED : TaskStatus.TO_DO, orderIndex: 4 },
      { title: 'Unit, Integration & UAT Testing', stage: DevelopmentStage.TESTING, weight: 10.0, status: s.project.completionPercentage >= 80 ? TaskStatus.COMPLETED : TaskStatus.TO_DO, orderIndex: 5 },
      { title: 'Comprehensive Dissertation Documentation', stage: DevelopmentStage.DOCUMENTATION, weight: 10.0, status: s.project.completionPercentage >= 90 ? TaskStatus.COMPLETED : TaskStatus.TO_DO, orderIndex: 6 },
      { title: 'Viva Voce Dry-Runs & Final Submission', stage: DevelopmentStage.VIVA_PREPARATION, weight: 10.0, status: s.project.completionPercentage >= 100 ? TaskStatus.COMPLETED : TaskStatus.TO_DO, orderIndex: 7 },
    ];

    for (const m of milestonesList) {
      await prisma.projectMilestone.create({
        data: {
          projectId: project.id,
          title: m.title,
          stage: m.stage,
          weight: m.weight,
          status: m.status,
          orderIndex: m.orderIndex,
        },
      });
    }

    // Create Tasks
    await prisma.projectTask.createMany({
      data: [
        {
          projectId: project.id,
          title: 'Design database ER diagram and normalize to 3NF',
          description: 'Ensure foreign-key constraints and composite primary keys for order-items and batches are well-formed.',
          assignedMentorId: s.assignedMentorId,
          responsiblePerson: 'Student',
          priority: Priority.HIGH,
          status: TaskStatus.COMPLETED,
          completionDate: new Date('2026-09-10'),
          feedback: 'ER diagram verified. Relationship cardinality is accurate.',
        },
        {
          projectId: project.id,
          title: 'Implement JWT Authentication and Role-Based Guards',
          description: 'Secure all REST controllers with token verification and role checks.',
          assignedMentorId: s.assignedMentorId,
          responsiblePerson: 'Student',
          priority: Priority.HIGH,
          status: TaskStatus.COMPLETED,
          completionDate: new Date('2026-09-28'),
          feedback: 'Password hashing with BCrypt verified.',
        },
        {
          projectId: project.id,
          title: 'Develop POS transaction processing and receipt generation',
          description: 'Handle concurrent stock decrements and calculate tax/discounts accurately.',
          assignedMentorId: s.assignedMentorId,
          responsiblePerson: 'Student',
          priority: Priority.URGENT,
          status: s.project.completionPercentage >= 65 ? TaskStatus.COMPLETED : TaskStatus.IN_PROGRESS,
          dueDate: new Date('2026-11-28'),
        },
        {
          projectId: project.id,
          title: 'Complete Chapter 4 Implementation in Dissertation Report',
          description: 'Write detailed code snippets, sequence flows, and deployment configurations.',
          assignedMentorId: s.assignedMentorId,
          responsiblePerson: 'Student',
          priority: Priority.MEDIUM,
          status: TaskStatus.IN_PROGRESS,
          dueDate: new Date('2026-12-05'),
        },
      ],
    });

    // Create Document records from Document Types
    for (const dt of allDocTypes) {
      let docStatus = DocumentStatus.NOT_STARTED;
      let curVer = 0;
      let subDate: Date | null = null;
      let appDate: Date | null = null;

      if (dt.orderIndex <= 2) {
        docStatus = DocumentStatus.APPROVED;
        curVer = 2;
        subDate = new Date('2026-08-20');
        appDate = new Date('2026-08-25');
      } else if (dt.orderIndex <= 4) {
        docStatus = DocumentStatus.SUBMITTED;
        curVer = 1;
        subDate = new Date('2026-09-15');
      } else if (dt.orderIndex === 5) {
        docStatus = DocumentStatus.REVISION_REQUIRED;
        curVer = 1;
        subDate = new Date('2026-10-05');
      } else if (dt.orderIndex === 6) {
        docStatus = DocumentStatus.IN_PROGRESS;
        curVer = 1;
      }

      const stDoc = await prisma.studentDocument.create({
        data: {
          studentId: student.id,
          documentTypeId: dt.id,
          documentName: dt.name,
          documentType: dt.code,
          assignedMentorId: s.assignedMentorId,
          status: docStatus,
          currentVersion: curVer,
          submittedDate: subDate,
          approvedDate: appDate,
        },
      });

      if (curVer > 0) {
        await prisma.documentVersion.create({
          data: {
            studentDocumentId: stDoc.id,
            versionNumber: 1,
            fileUrl: '/uploads/sample_document_v1.pdf',
            fileName: `${s.studentId}_${dt.code}_v1.pdf`,
            fileSize: 245000,
            fileType: 'application/pdf',
            uploadedById: s.assignedMentorId!,
            changeSummary: 'Initial document draft submitted for review',
            status: docStatus,
            reviewerComments: docStatus === DocumentStatus.APPROVED ? 'Approved without reservations.' : 'Please fix margin alignment and check IEEE references.',
            reviewDate: new Date('2026-09-02'),
            reviewedById: s.assignedSupervisorId,
          },
        });
      }
    }

    // Create Daily Progress entries
    await prisma.dailyProgress.createMany({
      data: [
        {
          studentId: student.id,
          mentorId: s.assignedMentorId!,
          date: new Date('2026-11-18'),
          moduleTask: 'POS Checkout & Barcode Scanner Integration',
          workPlanned: 'Integrate QuaggaJS/ZXing barcode scanner and trigger real-time stock lookup.',
          workCompleted: 'Barcode camera view completed; REST endpoint returns item name, price, and current shelf quantity.',
          currentStatus: 'On Track',
          problemsEncountered: 'Lighting conditions in webcam caused scan latency.',
          mistakesIdentified: 'Scanner was trying to re-read identical barcodes multiple times per second without a debounce threshold.',
          correctionsRequired: 'Add a 1500ms debounce filter on successful barcode matches.',
          nextAction: 'Implement cart quantity incrementing on successive scans.',
        },
        {
          studentId: student.id,
          mentorId: s.assignedMentorId!,
          date: new Date('2026-11-20'),
          moduleTask: 'Database Indexing & Query Optimization',
          workPlanned: 'Audit slow query times on GRN batch balance ledger.',
          workCompleted: 'Created composite index on (product_id, expiry_date, quantity) on product_batch table.',
          currentStatus: 'Completed',
          nextAction: 'Verify transaction atomicity under multiple simultaneous POS checkouts.',
        },
      ],
    });

    // Create Weekly Progress entries
    await prisma.weeklyProgress.create({
      data: {
        studentId: student.id,
        mentorId: s.assignedMentorId!,
        weekNumber: 47,
        year: 2026,
        weekStartDate: new Date('2026-11-16'),
        weekEndDate: new Date('2026-11-22'),
        plannedActivities: '1. Complete POS cart calculations with tax.\n2. Fix foreign key constraints on batch refunds.\n3. Draft Chapter 4 architecture diagram in dissertation.',
        completedActivities: '1. Cart calculations and receipt discount logic completed.\n2. Foreign keys corrected and tested via Postman.',
        incompleteActivities: 'Chapter 4 sequence diagrams need final touchup.',
        problemsBlockers: 'Need clarification on supervisor preferred sequence diagram notation format.',
        supervisorFeedback: 'Use standard UML 2.5 swimlanes showing Controller, Service, Repository, and Database layers.',
        nextWeekPlan: 'Complete UAT testing script and conduct demo with institute mentor.',
        mentorNotes: 'Student shows high technical competence and consistent weekly attendance.',
        status: WeeklyStatus.ON_TRACK,
      },
    });

    // Create Correction
    await prisma.correction.create({
      data: {
        studentId: student.id,
        supervisorId: s.assignedSupervisorId!,
        assignedMentorId: s.assignedMentorId!,
        issueDescription: 'Chapter 3 methodology lacks detailed comparison with existing commercial solutions.',
        correctionInstruction: 'Add a comprehensive comparison table evaluating SAP POS, Odoo, and proposed architecture with at least 6 feature criteria.',
        deadline: new Date('2026-11-30'),
        status: CorrectionStatus.IN_PROGRESS,
      },
    });

    // Create Meetings
    await prisma.meeting.create({
      data: {
        studentId: student.id,
        mentorId: s.assignedMentorId!,
        supervisorId: s.assignedSupervisorId,
        meetingDate: new Date('2026-11-24T14:30:00'),
        meetingType: MeetingType.DEVELOPMENT_DEMO,
        discussionSummary: 'Live demonstration of POS checkout, GRN stock ingestion, and automated low-stock warnings.',
        demonstratedFeatures: 'Barcode scan, cart checkout, receipt PDF generation.',
        decisionsMade: 'Approved moving to dissertation Chapter 5 testing phase.',
        nextMeetingDate: new Date('2026-12-01T15:00:00'),
        followUpTasks: 'Prepare UAT test survey forms for 3 real shop managers.',
        status: MeetingStatus.SCHEDULED,
      },
    });

    // Create Evaluation
    await prisma.evaluation.create({
      data: {
        studentId: student.id,
        evaluatorId: s.assignedSupervisorId!,
        stage: EvaluationStage.PROGRESS_EVALUATION,
        evaluationTitle: 'Mid-Year Progress & Code Quality Evaluation',
        scheduledDate: new Date('2026-10-15'),
        completionDate: new Date('2026-10-15'),
        status: EvaluationStatus.COMPLETED,
        marksRating: 82.5,
        feedback: 'Very solid architectural foundation. Clean separation of concerns between DTOs and entities.',
        areasForImprovement: 'Improve unit test code coverage to exceed 75% across core billing services.',
        nextSteps: 'Proceed with performance load testing using JMeter.',
      },
    });

    // Create Fee Agreement, Installments, Payments
    const feeAgree = await prisma.studentFeeAgreement.create({
      data: {
        studentId: student.id,
        totalAgreedFee: s.fee.totalAgreedFee,
        discount: s.fee.discount,
        finalPayableAmount: s.fee.finalPayableAmount,
        paymentPlan: s.fee.paymentPlan,
        initialPayment: s.fee.initialPayment,
        numberOfInstallments: s.fee.numberOfInstallments,
        remarks: 'Agreed fee structure for final year BIT guidance program.',
      },
    });

    for (const inst of s.fee.installments) {
      await prisma.paymentInstallment.create({
        data: {
          feeAgreementId: feeAgree.id,
          installmentNumber: inst.installmentNumber,
          amount: inst.amount,
          dueDate: inst.dueDate,
          status: inst.status,
          paidDate: inst.paidDate,
        },
      });
    }

    for (const p of s.fee.payments) {
      await prisma.payment.create({
        data: {
          paymentId: p.paymentId,
          feeAgreementId: feeAgree.id,
          studentId: student.id,
          amount: p.amount,
          paymentMethod: p.paymentMethod,
          referenceNumber: p.referenceNumber,
          receiptNumber: p.receiptNumber,
          recordedById: admin.id,
          remarks: p.remarks,
        },
      });
    }

    // Create Notifications
    await prisma.notification.createMany({
      data: [
        {
          userId: s.assignedMentorId!,
          title: `Progress Update: ${s.fullName}`,
          message: `Daily progress and weekly report submitted for review.`,
          type: NotificationType.DOCUMENT_SUBMISSION,
          linkUrl: `/students/${student.id}`,
        },
        {
          userId: s.assignedSupervisorId!,
          title: `Upcoming Demo Session: ${s.fullName}`,
          message: `Live demonstration scheduled for ${s.project.title}.`,
          type: NotificationType.EVALUATION,
          linkUrl: `/meetings`,
        },
      ],
    });

    // Activity Log
    await prisma.activityLog.create({
      data: {
        actorId: admin.id,
        actorName: 'Institute Admin',
        actorRole: 'ADMIN',
        action: 'REGISTER_STUDENT',
        entityType: 'Student',
        entityId: student.id,
        details: { studentId: s.studentId, regNumber: s.registrationNumber, assignedMentor: s.assignedMentorId },
      },
    });
  }

  console.log(`✓ Seeded ${studentsData.length} comprehensive students with projects, tasks, docs, progress, payments, and meetings.`);
  console.log('🎉 Seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
