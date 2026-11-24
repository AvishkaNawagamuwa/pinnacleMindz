"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
async function test() {
    const payload = { identifier: 'admin', password: 'Admin@123' };
    const res = await fetch('http://127.0.0.1:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    console.log('Admin login status:', res.status);
    const data = await res.json();
    console.log('Response message / user:', data.user ? `Logged in as: ${data.user.fullName} (${data.user.role})` : data);
    // Also test student with reg number
    const resStudent = await fetch('http://127.0.0.1:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: '2300839', password: 'Student@123' }),
    });
    console.log('Student 2300839 login status:', resStudent.status);
    const dataSt = await resStudent.json();
    console.log('Student response:', dataSt.user ? `Logged in as: ${dataSt.user.fullName} (${dataSt.user.role})` : dataSt);
}
test().catch(console.error);
