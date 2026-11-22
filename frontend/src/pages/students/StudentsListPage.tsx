import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { Student } from '../../types';
import { Badge } from '../../components/common/Badge';
import { RegisterStudentModal } from './RegisterStudentModal';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  PlusCircle,
  FolderGit2,
  ExternalLink,
  UserCheck,
  CreditCard,
  FileText,
} from 'lucide-react';

export const StudentsListPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [mentorFilter, setMentorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [mentorsList, setMentorsList] = useState<any[]>([]);

  const role = user?.role || 'ADMIN';
  const isMyStudentsView = window.location.pathname.includes('my-students');

  useEffect(() => {
    if (searchParams.get('register') === 'true' && role === 'ADMIN') {
      setIsRegisterOpen(true);
    }
  }, [searchParams, role]);

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const params: any = {
        search,
        status: statusFilter || undefined,
        stage: stageFilter || undefined,
        batch: batchFilter || undefined,
        mode: isMyStudentsView ? 'my' : 'all',
      };
      if (mentorFilter) params.mentorId = mentorFilter;

      const res = await api.get('/students', { params });
      setStudents(res.data.students || []);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchMentors = async () => {
      try {
        const res = await api.get('/users?role=MENTOR');
        setMentorsList(res.data.users || []);
      } catch {}
    };
    fetchMentors();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [search, mentorFilter, statusFilter, stageFilter, batchFilter, isMyStudentsView]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {isMyStudentsView ? 'My Assigned Students' : 'Student & Project Directory'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isMyStudentsView
              ? 'Comprehensive project workspace for students allocated under your mentoring guidance.'
              : 'Central registry of BIT/BTech undergraduate candidates, academic stages, and mentor workloads.'}
          </p>
        </div>

        {role === 'ADMIN' && (
          <button
            onClick={() => setIsRegisterOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-md cursor-pointer transition-all self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            Register Student
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, reg number, or project title..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-cyan-500 focus:outline-hidden"
          />
        </div>

        {!isMyStudentsView && (
          <select
            value={mentorFilter}
            onChange={(e) => setMentorFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
          >
            <option value="">All Mentors</option>
            {mentorsList.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName}
              </option>
            ))}
          </select>
        )}

        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
        >
          <option value="">All Stages</option>
          <option value="PROPOSAL">Proposal</option>
          <option value="SRS_DESIGN">SRS & Design</option>
          <option value="IMPLEMENTATION">Implementation</option>
          <option value="TESTING">Testing</option>
          <option value="DOCUMENTATION">Documentation</option>
          <option value="VIVA_PREPARATION">Viva Prep</option>
          <option value="COMPLETED">Completed</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="ON_HOLD">On Hold</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      {/* Main Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Student ID & Reg No</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Project Title</th>
                <th className="py-3 px-4">Stage</th>
                <th className="py-3 px-4">Progress</th>
                <th className="py-3 px-4">Assigned Mentor</th>
                {role === 'ADMIN' && <th className="py-3 px-4">Fee Status</th>}
                <th className="py-3 px-4 text-right">Workspace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading student records...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No students matching your search criteria.
                  </td>
                </tr>
              ) : (
                students.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-slate-900">{st.studentId}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{st.registrationNumber}</div>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div>{st.fullName}</div>
                      <div className="text-[10px] font-normal text-slate-400">{st.degreeProgramme}</div>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs truncate font-medium text-slate-700">
                      {st.project?.title || 'No project title defined'}
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge variant="cyan">{st.project?.currentStage?.replace(/_/g, ' ') || 'PROPOSAL'}</Badge>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-600">
                      {st.project?.completionPercentage?.toFixed(0)}%
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">
                        {st.assignedMentor?.fullName || (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </div>
                    </td>

                    {role === 'ADMIN' && (
                      <td className="py-3.5 px-4">
                        {st.paymentSummary?.status === 'PAID' ? (
                          <Badge variant="success">Paid</Badge>
                        ) : st.paymentSummary?.status === 'PARTIAL' ? (
                          <Badge variant="warning">
                            Bal: LKR {st.paymentSummary?.balance?.toLocaleString()}
                          </Badge>
                        ) : (
                          <Badge variant="danger">Unpaid</Badge>
                        )}
                      </td>
                    )}

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => navigate(`/students/${st.id}`)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 transition-colors shadow-xs cursor-pointer inline-flex items-center gap-1"
                      >
                        Open Workspace <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registration Modal */}
      <RegisterStudentModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSuccess={fetchStudents}
      />
    </div>
  );
};
