"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
async function test() {
    const tests = [
        { identifier: 'admin', password: 'Admin@123', label: 'Admin uppercase A' },
        { identifier: 'admin', password: 'admin@123', label: 'Admin lowercase a' },
        { identifier: 'admin@pinnaclemindz.com', password: 'Admin@123', label: 'Admin by email' },
        { identifier: '2300839', password: 'Student@123', label: 'Student reg uppercase S' },
        { identifier: '2300839', password: 'student@123', label: 'Student reg lowercase s' },
        { identifier: 'mentor1', password: 'Mentor@123', label: 'Mentor uppercase M' },
        { identifier: 'mentor1', password: 'mentor@123', label: 'Mentor lowercase m' },
        { identifier: 'supervisor1', password: 'Super@123', label: 'Supervisor uppercase S' },
        { identifier: 'supervisor1', password: 'super@123', label: 'Supervisor lowercase s' },
    ];
    for (const t of tests) {
        const res = await fetch('http://127.0.0.1:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: t.identifier, password: t.password }),
        });
        console.log(`${t.label}: ${res.status === 200 ? 'SUCCESS 200' : 'FAILED ' + res.status}`);
    }
}
test().catch(console.error);
