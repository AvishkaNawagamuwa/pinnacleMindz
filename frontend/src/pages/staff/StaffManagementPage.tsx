import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import { UserCheck, PlusCircle, Key, Shield } from 'lucide-react';

export const StaffManagementPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add staff modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'SUPERVISOR' | 'MENTOR'>('MENTOR');
  const [password, setPassword] = useState('Mentor@123');
  const [phone, setPhone] = useState('');

  // Reset password modal
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const { success, error } = useToast();

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/users');
      setUsers(res.data.users || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users', { email, password, fullName, role, phone });
      success('Staff member added successfully');
      setIsAddOpen(false);
      setEmail('');
      setFullName('');
      setPhone('');
      fetchUsers();
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to create staff member');
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser || !newPassword) return;

    try {
      await api.put(`/users/${targetUser.id}/reset-password`, { newPassword });
      success(`Password reset for ${targetUser.fullName}`);
      setIsResetOpen(false);
      setTargetUser(null);
      setNewPassword('');
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to reset password');
    }
  };

  const handleToggleActive = async (user: any) => {
    try {
      await api.put(`/users/${user.id}`, { isActive: !user.isActive });
      success(`User ${!user.isActive ? 'activated' : 'deactivated'}`);
      fetchUsers();
    } catch (err) {
      error('Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Staff & Access Permissions</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage institute supervisors and mentoring staff accounts, credentials, and active permissions.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-md cursor-pointer transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Add Staff Member
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Staff Name</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Assigned Students</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="py-3.5 px-4 font-bold text-slate-900">{u.fullName}</td>
                <td className="py-3.5 px-4 font-mono text-slate-600">{u.email}</td>
                <td className="py-3.5 px-4">
                  <Badge
                    variant={u.role === 'ADMIN' ? 'danger' : u.role === 'SUPERVISOR' ? 'info' : 'cyan'}
                  >
                    {u.role}
                  </Badge>
                </td>
                <td className="py-3.5 px-4 font-mono">
                  {u.role === 'MENTOR'
                    ? `${u._count?.mentoredStudents || 0} Mentored`
                    : u.role === 'SUPERVISOR'
                    ? `${u._count?.supervisedStudents || 0} Supervised`
                    : 'All'}
                </td>
                <td className="py-3.5 px-4">
                  <Badge variant={u.isActive ? 'success' : 'default'}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="py-3.5 px-4 text-right space-x-2">
                  <button
                    onClick={() => {
                      setTargetUser(u);
                      setIsResetOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                    title="Reset Password"
                  >
                    <Key className="w-3.5 h-3.5" />
                  </button>
                  {u.role !== 'ADMIN' && (
                    <button
                      onClick={() => handleToggleActive(u)}
                      className={`text-[10px] font-bold px-2 py-1 rounded ${
                        u.isActive
                          ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Staff Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Staff Member"
        subtitle="Create login account for an academic supervisor or mentor"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-600 font-medium mb-1">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Nuwan Bandara (Demo 07)"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-200"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Email</label>
            <input
              type="email"
              required
              placeholder="mentor7@pinnaclemindz.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full p-2 rounded-lg border border-slate-200 bg-white"
              >
                <option value="MENTOR">Mentor (Demo Staff)</option>
                <option value="SUPERVISOR">Supervisor</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Temporary Password</label>
              <input
                type="text"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500"
            >
              Create Staff Account
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        title="Reset Staff Password"
        subtitle={`Set new password for ${targetUser?.fullName}`}
      >
        <form onSubmit={handleResetSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-600 font-medium mb-1">New Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-200 font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setIsResetOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500"
            >
              Reset Password
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
