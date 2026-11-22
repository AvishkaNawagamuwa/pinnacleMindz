import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { DocumentTypeRequirement, DevelopmentStage } from '../../types';
import {
  Layers,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Link,
  Edit2,
  Users,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

export const DocumentRequirementsPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [requirements, setRequirements] = useState<DocumentTypeRequirement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');

  // Create Requirement Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    code: '',
    name: '',
    description: '',
    category: 'Proposal & Scope',
    academicStage: 'PROPOSAL' as DevelopmentStage,
    submissionInstructions: 'Submit a shared Google Drive or GitHub repository URL. Ensure view permissions are granted.',
    defaultDeadlineDays: 30,
    allowedUrlTypes: 'Google Drive, GitHub Repository',
    targetBatch: '2026',
    autoAssignAllActive: true,
  });

  // Edit Modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingReq, setEditingReq] = useState<DocumentTypeRequirement | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    category: '',
    academicStage: 'PROPOSAL' as DevelopmentStage,
    submissionInstructions: '',
    defaultDeadlineDays: 30,
    allowedUrlTypes: '',
    orderIndex: 1,
    isActive: true,
  });

  const fetchRequirements = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/documents/requirements');
      setRequirements(res.data.requirements || []);
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to load master document requirements');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/documents/requirements', createForm);
      success('Master document requirement created and assigned.');
      setIsCreateOpen(false);
      setCreateForm({
        code: '',
        name: '',
        description: '',
        category: 'Proposal & Scope',
        academicStage: 'PROPOSAL',
        submissionInstructions: 'Submit a shared Google Drive or GitHub repository URL. Ensure view permissions are granted.',
        defaultDeadlineDays: 30,
        allowedUrlTypes: 'Google Drive, GitHub Repository',
        targetBatch: '2026',
        autoAssignAllActive: true,
      });
      fetchRequirements();
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to create document requirement.');
    }
  };

  const handleOpenEdit = (req: DocumentTypeRequirement) => {
    setEditingReq(req);
    setEditForm({
      name: req.name,
      description: req.description || '',
      category: req.category,
      academicStage: req.academicStage,
      submissionInstructions: req.submissionInstructions || '',
      defaultDeadlineDays: req.defaultDeadlineDays,
      allowedUrlTypes: req.allowedUrlTypes,
      orderIndex: req.orderIndex,
      isActive: req.isActive,
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReq) return;
    try {
      await api.put(`/documents/requirements/${editingReq.id}`, editForm);
      success('Document requirement updated successfully.');
      setIsEditOpen(false);
      setEditingReq(null);
      fetchRequirements();
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to update requirement.');
    }
  };

  const handleToggleStatus = async (req: DocumentTypeRequirement) => {
    try {
      await api.put(`/documents/requirements/${req.id}/status`, { isActive: !req.isActive });
      success(`Requirement "${req.name}" ${!req.isActive ? 'activated' : 'deactivated'}.`);
      fetchRequirements();
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to toggle status.');
    }
  };

  const filtered = requirements.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.code.toLowerCase().includes(search.toLowerCase()) ||
      r.category.toLowerCase().includes(search.toLowerCase());
    const matchesStage = stageFilter ? r.academicStage === stageFilter : true;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Master Document Requirements</h1>
            <Badge variant="cyan" className="font-mono text-[10px]">
              SUPER ADMIN / ADMIN
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Standardized academic deliverable requirements automatically populated to student portfolios.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Requirement</span>
        </button>
      </div>

      {/* Filter and Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono text-slate-500 uppercase">Total Requirements</span>
            <p className="text-xl font-black text-slate-900 mt-0.5">{requirements.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono text-slate-500 uppercase">Active Requirements</span>
            <p className="text-xl font-black text-emerald-600 mt-0.5">
              {requirements.filter((r) => r.isActive).length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono text-slate-500 uppercase">Proposal & Scope</span>
            <p className="text-xl font-black text-blue-600 mt-0.5">
              {requirements.filter((r) => r.academicStage === 'PROPOSAL' || r.academicStage === 'SRS_DESIGN').length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono text-slate-500 uppercase">Dissertation & Viva</span>
            <p className="text-xl font-black text-indigo-600 mt-0.5">
              {requirements.filter((r) => r.academicStage === 'DOCUMENTATION' || r.academicStage === 'VIVA_PREPARATION').length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search requirement name, code, or category..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-cyan-500 focus:outline-hidden"
          />
        </div>

        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
        >
          <option value="">All Academic Stages</option>
          <option value="PROPOSAL">Proposal</option>
          <option value="SRS_DESIGN">SRS & Design</option>
          <option value="IMPLEMENTATION">Implementation</option>
          <option value="TESTING">Testing</option>
          <option value="DOCUMENTATION">Final Documentation</option>
          <option value="VIVA_PREPARATION">Viva Preparation</option>
        </select>
      </div>

      {/* Requirements Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Document Title & Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Academic Stage</th>
                <th className="py-3 px-4">Allowed URL Types</th>
                <th className="py-3 px-4">Default Deadline</th>
                <th className="py-3 px-4 text-center">Assigned Students</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Loading requirements catalog...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    No document requirements found matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-400">#{req.orderIndex}</td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px]">
                        {req.code}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <span className="font-bold text-slate-900 block">{req.name}</span>
                      {req.description && (
                        <span className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{req.description}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{req.category}</td>
                    <td className="py-3 px-4">
                      <Badge variant="cyan">{req.academicStage.replace(/_/g, ' ')}</Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      <span className="flex items-center gap-1">
                        <Link className="w-3 h-3 text-cyan-500" />
                        {req.allowedUrlTypes || 'Google Drive, GitHub'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{req.defaultDeadlineDays} days</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px]">
                        <Users className="w-3 h-3 text-slate-400" />
                        {req._count?.studentDocuments || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(req)}
                        className="cursor-pointer inline-flex items-center gap-1 transition-colors"
                        title={req.isActive ? 'Deactivate Requirement' : 'Activate Requirement'}
                      >
                        {req.isActive ? (
                          <ToggleRight className="w-6 h-6 text-emerald-500 hover:text-emerald-600" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-slate-300 hover:text-slate-400" />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(req)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 transition-colors cursor-pointer"
                        title="Edit Requirement"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Master Document Requirement">
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Requirement Code *</label>
              <input
                type="text"
                required
                value={createForm.code}
                onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                placeholder="e.g. SCOPE_AGREE"
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono focus:bg-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Document Title *</label>
              <input
                type="text"
                required
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g. Project Scope Agreement"
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Category</label>
              <input
                type="text"
                value={createForm.category}
                onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                placeholder="e.g. Scope & Requirements"
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Academic Stage</label>
              <select
                value={createForm.academicStage}
                onChange={(e) => setCreateForm({ ...createForm, academicStage: e.target.value as DevelopmentStage })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
              >
                <option value="PROPOSAL">Proposal</option>
                <option value="SRS_DESIGN">SRS & Design</option>
                <option value="IMPLEMENTATION">Implementation</option>
                <option value="TESTING">Testing</option>
                <option value="DOCUMENTATION">Final Documentation</option>
                <option value="VIVA_PREPARATION">Viva Preparation</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Description / Academic Purpose</label>
            <textarea
              rows={2}
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              placeholder="Outline the purpose and required contents of this document..."
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Submission Instructions for Students</label>
            <textarea
              rows={2}
              value={createForm.submissionInstructions}
              onChange={(e) => setCreateForm({ ...createForm, submissionInstructions: e.target.value })}
              placeholder="Provide clear URL sharing instructions (e.g. Google Drive viewing permissions)..."
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Allowed URL Types</label>
              <input
                type="text"
                value={createForm.allowedUrlTypes}
                onChange={(e) => setCreateForm({ ...createForm, allowedUrlTypes: e.target.value })}
                placeholder="Google Drive, GitHub, Web URL"
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Default Deadline (Days)</label>
              <input
                type="number"
                min={1}
                value={createForm.defaultDeadlineDays}
                onChange={(e) => setCreateForm({ ...createForm, defaultDeadlineDays: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          <div className="p-3 bg-cyan-50/60 rounded-xl border border-cyan-100 flex items-center justify-between">
            <div>
              <span className="font-bold text-cyan-900 block">Auto-Assign to Active Students</span>
              <p className="text-[11px] text-cyan-700">
                Automatically add this requirement checklist item to all currently active students.
              </p>
            </div>
            <input
              type="checkbox"
              checked={createForm.autoAssignAllActive}
              onChange={(e) => setCreateForm({ ...createForm, autoAssignAllActive: e.target.checked })}
              className="w-4 h-4 text-cyan-600 rounded cursor-pointer"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-md cursor-pointer"
            >
              Create Requirement
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={`Edit: ${editingReq?.code}`}>
        <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Document Title *</label>
            <input
              type="text"
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Category</label>
              <input
                type="text"
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Academic Stage</label>
              <select
                value={editForm.academicStage}
                onChange={(e) => setEditForm({ ...editForm, academicStage: e.target.value as DevelopmentStage })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
              >
                <option value="PROPOSAL">Proposal</option>
                <option value="SRS_DESIGN">SRS & Design</option>
                <option value="IMPLEMENTATION">Implementation</option>
                <option value="TESTING">Testing</option>
                <option value="DOCUMENTATION">Final Documentation</option>
                <option value="VIVA_PREPARATION">Viva Preparation</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Description</label>
            <textarea
              rows={2}
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Submission Instructions</label>
            <textarea
              rows={2}
              value={editForm.submissionInstructions}
              onChange={(e) => setEditForm({ ...editForm, submissionInstructions: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Allowed URL Types</label>
              <input
                type="text"
                value={editForm.allowedUrlTypes}
                onChange={(e) => setEditForm({ ...editForm, allowedUrlTypes: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Display Order</label>
              <input
                type="number"
                min={1}
                value={editForm.orderIndex}
                onChange={(e) => setEditForm({ ...editForm, orderIndex: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-md cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
