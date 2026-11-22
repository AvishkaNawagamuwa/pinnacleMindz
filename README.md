# Pinnacle Mindz — Project Guidance & Progress Management System

Production-ready browser-based internal academic management system built for **Pinnacle Mindz**, an institute providing BIT/BTech final-year software project guidance, supervision, development mentoring, documentation assistance, and viva preparation.

---

## 🚀 Key Highlights & Architecture

- **Branding & UI/UX**: Dark navy-blue sidebar (`#0b1329`), cyan (`#06b6d4`) and electric-blue (`#2563eb`) accents inspired by the official circular programmer logo, light-grey main content canvas (`#f8fafc`), rounded cards, and responsive layouts.
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide icons, Recharts, TanStack Query.
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, bcrypt password hashing, JWT in secure HTTP-only cookies, Multer storage, and PDFKit report generation.
- **Role-Based Access Control**:
  - **ADMIN / OWNER**: Full control over student registration, mentor reassignments, fee agreements, payment transactions, staff management, and audit logs.
  - **SUPERVISOR**: Reviews project documentation, issues correction directives, monitors mentor workloads & compliance, and records evaluation grades.
  - **MENTOR**: Manages assigned students, logs daily progress, submits weekly reports, assigns tasks, and uploads project artifacts. Object-level security prevents mentors from modifying unassigned students.
  - **STUDENT**: Dedicated portal to track project milestones, task deadlines, documentation checklist, and fee balance.

---

## 👥 Seeded Test Credentials

The database comes pre-seeded with realistic BIT/BTech students, projects, tasks, weekly reports, documents, and payments:

| Role | Email | Password | Full Name / Description |
|---|---|---|---|
| **Admin** | `admin@pinnaclemindz.com` | `Admin@123` | Institute Director / Admin |
| **Supervisor** | `supervisor1@pinnaclemindz.com` | `Super@123` | Dr. Kalinga Perera |
| **Supervisor** | `supervisor2@pinnaclemindz.com` | `Super@123` | Eng. Manjula Senanayake |
| **Mentor (Demo 01)** | `mentor1@pinnaclemindz.com` | `Mentor@123` | Nuwan Bandara |
| **Mentor (Demo 02)** | `mentor2@pinnaclemindz.com` | `Mentor@123` | Dilini Samarasinghe |
| **Mentor (Demo 03)** | `mentor3@pinnaclemindz.com` | `Mentor@123` | Kasun Jayawardena |
| **Student** | `2300839` or `avishka.n@student.pinnacle.lk` | `Student@123` | Avishka Nawagamuwa (Reg: `2300839`) |

*Tip: Students can sign in directly using their student registration number as the username.*

---

## 🛠️ Local Development Quickstart

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+) running locally

### 2. Backend Setup
```bash
cd backend
npm install
# Configure your .env file
# DATABASE_URL="postgresql://postgres:password@localhost:5432/pinnacle_mindz?schema=public"
npx prisma db push
npx tsx prisma/seed.ts
npm run dev
```
Backend API will be live at `http://localhost:5000`.

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend UI will be live at `http://localhost:5173`.

---

## 🐳 Production Deployment on Hostinger VPS (Ubuntu)

### 1. Clone repository on VPS
```bash
git clone <your-git-repo> /var/www/pinnacle-mindz
cd /var/www/pinnacle-mindz
cp .env.example .env
```

### 2. Run Docker Compose
```bash
docker compose up -d --build
```

### 3. Setup SSL with Certbot (Let's Encrypt)
```bash
sudo certbot certonly --webroot -w ./certbot/www -d app.pinnaclemindz.com
```

### 4. Automated Database Backups
Create a daily cron job:
```bash
0 2 * * * docker exec -t pinnacle-postgres pg_dump -U postgres pinnacle_mindz > /var/backups/pinnacle_$(date +\%F).sql
```

---

## 📋 Verified Acceptance Workflows

1. **Register Student**: Admin registers a new student with registration number, project specifications, fee structure, and assigned mentor.
2. **Mentor Progress Entry**: Mentor logs daily activities, identifies mistakes, notes required corrections, and sets next actions.
3. **Weekly Progress Timeline**: Chronological sprint view with expandable weeks to inspect nested daily activities and missing update alerts.
4. **Supervisor Correction**: Supervisor reviews student work, issues actionable correction with a deadline; mentor resolves it, and supervisor verifies.
5. **Document Versioning**: Upload new document drafts (PDF/DOC) with automated version increments, preserving complete audit history.
6. **Payment Management**: Record payments with unique receipt validation, automatically recalculate balances, and generate official branded PDF receipts.
7. **Reports & Exports**: Export branded A4 Project Progress Reports (PDF) and spreadsheet datasets (Excel/CSV).
