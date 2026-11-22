import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';

interface RegisterStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RegisterStudentModal: React.FC<RegisterStudentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { success, error } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mentors, setMentors] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);

  // Form fields
  const [formData, setFormData] = useState({
    fullName: '',
    registrationNumber: '',
    email: '',
    contactNumber: '',
    whatsappNumber: '',
    university: 'University of Colombo School of Computing (UCSC)',
    degreeProgramme: 'Bachelor of Information Technology (BIT)',
    batch: '2026',
    currentAddress: '',
    assignedMentorId: '',
    assignedSupervisorId: '',
    projectTitle: '',
    projectIdea: '',
    problemStatement: '',
    proposedSolution: '',
    techStack: 'Spring Boot, React, Tailwind CSS, PostgreSQL',
    totalAgreedFee: 65000,
    discount: 0,
    initialPayment: 20000,
    numberOfInstallments: 3,
    paymentMethod: 'BANK_TRANSFER',
    referenceNumber: '',
  });

  useEffect(() => {
    if (isOpen) {
      const fetchStaff = async () => {
        try {
          const res = await api.get('/users');
          const users = res.data.users || [];
          setMentors(users.filter((u: any) => u.role === 'MENTOR'));
          setSupervisors(users.filter((u: any) => u.role === 'SUPERVISOR'));
        } catch {}
      };
      fetchStaff();
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.registrationNumber || !formData.email || !formData.projectTitle) {
      error('Please fill in student full name, registration number, email, and project title.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/students', formData);
      success('Student registered and project workspace initiated successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to register student.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Register New Student & Initialize Project"
      subtitle="Creates official registration record, student login, project workspace, document checklist, and fee structure."
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* Section 1: Personal Details */}
        <div>
          <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-3 text-[11px] flex items-center gap-1.5 border-b pb-1.5">
            1. Student Bio & Contact Info
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Full Name *</label>
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                placeholder="e.g. Kasun Chamara"
                className="w-full p-2 rounded-lg border border-slate-200 focus:border-cyan-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">BIT/BTech Reg Number *</label>
              <input
                type="text"
                name="registrationNumber"
                required
                value={formData.registrationNumber}
                onChange={handleChange}
                placeholder="e.g. 2300891"
                className="w-full p-2 rounded-lg border border-slate-200 focus:border-cyan-500 focus:outline-hidden font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Email Address *</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="student@example.com"
                className="w-full p-2 rounded-lg border border-slate-200 focus:border-cyan-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Contact Phone *</label>
              <input
                type="text"
                name="contactNumber"
                required
                value={formData.contactNumber}
                onChange={handleChange}
                placeholder="+94 77 123 4567"
                className="w-full p-2 rounded-lg border border-slate-200 focus:border-cyan-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">WhatsApp Number</label>
              <input
                type="text"
                name="whatsappNumber"
                value={formData.whatsappNumber}
                onChange={handleChange}
                placeholder="+94 77 123 4567"
                className="w-full p-2 rounded-lg border border-slate-200 focus:border-cyan-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Batch Year</label>
              <input
                type="text"
                name="batch"
                value={formData.batch}
                onChange={handleChange}
                className="w-full p-2 rounded-lg border border-slate-200 focus:border-cyan-500 focus:outline-hidden font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-600 font-medium mb-1">University / Institute</label>
              <input
                type="text"
                name="university"
                value={formData.university}
                onChange={handleChange}
                className="w-full p-2 rounded-lg border border-slate-200 focus:border-cyan-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Degree Programme</label>
              <input
                type="text"
                name="degreeProgramme"
                value={formData.degreeProgramme}
                onChange={handleChange}
                className="w-full p-2 rounded-lg border border-slate-200 focus:border-cyan-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Mentoring & Staff Assignment */}
        <div>
          <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-3 text-[11px] flex items-center gap-1.5 border-b pb-1.5">
            2. Mentor & Academic Supervision Allocation
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Primary Mentor (Demo Staff)</label>
              <select
                name="assignedMentorId"
                value={formData.assignedMentorId}
                onChange={handleChange}
                className="w-full p-2 rounded-lg border border-slate-200 focus:border-cyan-500 focus:outline-hidden bg-white"
              >
                <option value="">-- Select Mentor Staff --</option>
                {mentors.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Academic Supervisor</label>
              <select
                name="assignedSupervisorId"
                value={formData.assignedSupervisorId}
                onChange={handleChange}
                className="w-full p-2 rounded-lg border border-slate-200 focus:border-cyan-500 focus:outline-hidden bg-white"
              >
                <option value="">-- Select Academic Supervisor --</option>
                {supervisors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Project Definition */}
        <div>
          <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-3 text-[11px] flex items-center gap-1.5 border-b pb-1.5">
            3. Project Specification & Technology Stack
          </h4>
          <div className="space-y-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Project Title *</label>
              <input
                type="text"
                name="projectTitle"
                required
                value={formData.projectTitle}
                onChange={handleChange}
                placeholder="e.g. Omnichannel Supermarket Inventory & Batch POS System"
                className="w-full p-2 rounded-lg border border-slate-200 focus:border-cyan-500 focus:outline-hidden font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Problem Statement</label>
                <textarea
                  name="problemStatement"
                  rows={2}
                  value={formData.problemStatement}
                  onChange={handleChange}
                  placeholder="Identify core operational pain points..."
                  className="w-full p-2 rounded-lg border border-slate-200 focus:border-cyan-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Proposed Solution</label>
                <textarea
                  name="proposedSolution"
                  rows={2}
                  value={formData.proposedSolution}
                  onChange={handleChange}
                  placeholder="High-level architecture solution..."
                  className="w-full p-2 rounded-lg border border-slate-200 focus:border-cyan-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Technology Stack</label>
              <input
                type="text"
                name="techStack"
                value={formData.techStack}
                onChange={handleChange}
                placeholder="e.g. Spring Boot 3, React, Tailwind CSS, PostgreSQL"
                className="w-full p-2 rounded-lg border border-slate-200 focus:border-cyan-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Course Fee Agreement & Initial Payment */}
        <div>
          <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-3 text-[11px] flex items-center gap-1.5 border-b pb-1.5">
            4. Fee Agreement & Registration Payment (LKR)
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Agreed Fee (LKR)</label>
              <input
                type="number"
                name="totalAgreedFee"
                value={formData.totalAgreedFee}
                onChange={handleChange}
                className="w-full p-2 rounded-lg border border-slate-200 focus:border-cyan-500 focus:outline-hidden font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Discount (LKR)</label>
              <input
                type="number"
                name="discount"
                value={formData.discount}
                onChange={handleChange}
                className="w-full p-2 rounded-lg border border-slate-200 focus:border-cyan-500 focus:outline-hidden font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Initial Deposit (LKR)</label>
              <input
                type="number"
                name="initialPayment"
                value={formData.initialPayment}
                onChange={handleChange}
                className="w-full p-2 rounded-lg border border-slate-200 focus:border-cyan-500 focus:outline-hidden font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Installments Plan</label>
              <select
                name="numberOfInstallments"
                value={formData.numberOfInstallments}
                onChange={handleChange}
                className="w-full p-2 rounded-lg border border-slate-200 focus:border-cyan-500 focus:outline-hidden bg-white"
              >
                <option value={1}>1 (Full Settlement)</option>
                <option value={2}>2 Installments</option>
                <option value={3}>3 Installments</option>
                <option value={4}>4 Installments</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-md cursor-pointer disabled:opacity-50 transition-all"
          >
            {isSubmitting ? 'Registering...' : 'Register Student & Create Project'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
