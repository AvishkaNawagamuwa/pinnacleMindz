import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Badge } from '../../components/common/Badge';
import { FileSpreadsheet, Download, FileText, Users, Clock, FileCheck2, ExternalLink } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [mentorReports, setMentorReports] = useState<any[]>([]);
  const [deadlines, setDeadlines] = useState<any>(null);
  const [docAudit, setDocAudit] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [stRes, mRes, dRes, docRes] = await Promise.all([
          api.get('/students'),
          api.get('/reports/mentor-performance'),
          api.get('/reports/deadlines'),
          api.get('/reports/documentation-status'),
        ]);
        const stList = stRes.data.students || [];
        setStudents(stList);
        if (stList.length > 0) setSelectedStudentId(stList[0].id);
        setMentorReports(mRes.data.mentorReports || []);
        setDeadlines(dRes.data);
        setDocAudit(docRes.data.docAudit || []);
      } catch (err) {
        console.error('Failed to load reports:', err);
      }
    };
    fetchData();
  }, []);

  const handleDownloadStudentPdf = () => {
    if (selectedStudentId) {
      window.open(`/api/reports/student-progress-pdf/${selectedStudentId}`, '_blank');
    }
  };

  const handleExportCsv = (type: 'students' | 'payments' | 'submissions') => {
    window.open(`/api/reports/export-csv?type=${type}`, '_blank');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Institute Reports & Export Centre</h1>
        <p className="text-xs text-slate-500 mt-1">
          Generate university-format progress reports (PDF), mentor workload audits, and Excel/CSV spreadsheets.
        </p>
      </div>

      {/* Grid of Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Student Project Progress PDF */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-soft space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-cyan-50 text-cyan-600">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Student Progress Report (Branded PDF)</h3>
              <p className="text-xs text-slate-500">
                A4 document with Pinnacle Mindz seal, deliverables audit, and supervisor sign-offs.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="block text-xs font-semibold text-slate-700">Select Candidate:</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-hidden"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.studentId} - {s.registrationNumber})
                </option>
              ))}
            </select>

            <button
              onClick={handleDownloadStudentPdf}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-md cursor-pointer transition-all"
            >
              <Download className="w-4 h-4" /> Generate Branded PDF Report
            </button>
          </div>
        </div>

        {/* Card 2: Bulk CSV / Excel Exports */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-soft space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Institute Spreadsheets Export</h3>
              <p className="text-xs text-slate-500">
                Download structured datasets for academic board submissions and financial auditing.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => handleExportCsv('students')}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-800 transition-all cursor-pointer"
            >
              <span>Export All Students & Projects (Excel)</span>
              <Download className="w-4 h-4 text-emerald-600" />
            </button>

            <button
              onClick={() => handleExportCsv('payments')}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-800 transition-all cursor-pointer"
            >
              <span>Export Payment Transactions & Fees (Excel)</span>
              <Download className="w-4 h-4 text-emerald-600" />
            </button>

            <button
              onClick={() => handleExportCsv('submissions')}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-800 transition-all cursor-pointer"
            >
              <span>Export Document Submissions & URLs (Excel)</span>
              <Download className="w-4 h-4 text-cyan-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Mentor Performance Report Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-soft space-y-4">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Mentor Guidance Compliance & Workload Audit
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Mentor Name</th>
                <th className="py-2.5 px-3">Assigned Students</th>
                <th className="py-2.5 px-3">Active Projects</th>
                <th className="py-2.5 px-3">Task Completion Rate</th>
                <th className="py-2.5 px-3">Open Corrections</th>
                <th className="py-2.5 px-3">Weekly Update Compliance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mentorReports.map((m) => (
                <tr key={m.mentorId} className="hover:bg-slate-50">
                  <td className="py-3 px-3 font-bold text-slate-900">{m.mentorName}</td>
                  <td className="py-3 px-3">{m.totalAssigned}</td>
                  <td className="py-3 px-3">{m.activeProjects}</td>
                  <td className="py-3 px-3 font-mono font-bold text-cyan-600">{m.taskCompletionRate}%</td>
                  <td className="py-3 px-3">
                    {m.openCorrections > 0 ? (
                      <Badge variant="warning">{m.openCorrections} Pending</Badge>
                    ) : (
                      <Badge variant="success">All Resolved</Badge>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-emerald-700">
                    {m.recentUpdateComplianceRate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Documentation Status Report */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-soft space-y-4">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Student Deliverables & Documentation Progress Audit
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Student Name</th>
                <th className="py-2.5 px-3">Reg Number</th>
                <th className="py-2.5 px-3">Primary Mentor</th>
                <th className="py-2.5 px-3">Total Requirements</th>
                <th className="py-2.5 px-3">Approved</th>
                <th className="py-2.5 px-3">Submitted</th>
                <th className="py-2.5 px-3">Pending</th>
                <th className="py-2.5 px-3 text-right">Completion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {docAudit.map((s) => (
                <tr key={s.studentId} className="hover:bg-slate-50">
                  <td className="py-3 px-3 font-bold text-slate-900">{s.studentName}</td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-600">{s.registrationNumber}</td>
                  <td className="py-3 px-3 text-slate-700">{s.mentor}</td>
                  <td className="py-3 px-3 font-mono">{s.totalDocs}</td>
                  <td className="py-3 px-3 font-mono text-emerald-600 font-bold">{s.approvedDocs}</td>
                  <td className="py-3 px-3 font-mono text-cyan-600">{s.submittedDocs}</td>
                  <td className="py-3 px-3 font-mono text-amber-600">{s.pendingDocs}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-cyan-700">
                    {s.completionRate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
