import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { ProjectTask, TaskStatus, Priority } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import { CheckSquare, PlusCircle, Clock, AlertTriangle, MessageSquare } from 'lucide-react';

export const TasksKanbanPage: React.FC = () => {
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  // New task modal
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [newTaskStudentId, setNewTaskStudentId] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('MEDIUM');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  const { success, error } = useToast();

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/tasks');
      setTasks(res.data.tasks || []);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const fetchStudents = async () => {
      try {
        const res = await api.get('/students');
        setStudentsList(res.data.students || []);
      } catch {}
    };
    fetchStudents();
  }, []);

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
      success('Task status updated');
      fetchTasks();
    } catch (err) {
      error('Failed to update task status');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle || !newTaskStudentId) {
      error('Please specify both student and task title');
      return;
    }

    try {
      await api.post('/tasks', {
        studentId: newTaskStudentId,
        title: newTaskTitle,
        description: newTaskDesc,
        priority: newTaskPriority,
        dueDate: newTaskDueDate || undefined,
      });
      success('Task created successfully');
      setIsNewTaskOpen(false);
      setNewTaskTitle('');
      setNewTaskDesc('');
      fetchTasks();
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to create task');
    }
  };

  const columns: { id: TaskStatus; label: string; color: string }[] = [
    { id: 'TO_DO', label: 'To Do', color: 'border-slate-300' },
    { id: 'IN_PROGRESS', label: 'In Progress', color: 'border-cyan-400' },
    { id: 'UNDER_REVIEW', label: 'Under Review', color: 'border-amber-400' },
    { id: 'COMPLETED', label: 'Completed', color: 'border-emerald-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Project Tasks & Sprints</h1>
          <p className="text-xs text-slate-500 mt-1">
            Visual milestone breakdown and task status flow across candidate development teams.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-200/80 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Kanban Board
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Table View
            </button>
          </div>

          <button
            onClick={() => setIsNewTaskOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-md cursor-pointer transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Add Task
          </button>
        </div>
      </div>

      {/* Kanban Board View */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                className={`bg-slate-100/70 rounded-2xl border-t-4 ${col.color} border border-slate-200/80 p-4 space-y-3 min-h-[500px] flex flex-col`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {col.label}
                  </span>
                  <Badge variant="neutral">{colTasks.length}</Badge>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">No tasks</div>
                  ) : (
                    colTasks.map((t) => (
                      <div
                        key={t.id}
                        className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-soft hover:shadow-md transition-all space-y-2 text-xs"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-bold text-slate-900 leading-tight">{t.title}</span>
                          <Badge
                            variant={
                              t.priority === 'URGENT'
                                ? 'danger'
                                : t.priority === 'HIGH'
                                ? 'warning'
                                : 'cyan'
                            }
                            size="sm"
                          >
                            {t.priority}
                          </Badge>
                        </div>

                        {t.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-2">{t.description}</p>
                        )}

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>{t.project?.student?.fullName}</span>
                          {t.dueDate && (
                            <span className="flex items-center gap-1 text-slate-600">
                              <Clock className="w-3 h-3" />
                              {new Date(t.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>

                        {/* Status switcher pills */}
                        <div className="pt-1 flex items-center gap-1 justify-end">
                          {col.id !== 'TO_DO' && (
                            <button
                              onClick={() => handleStatusChange(t.id, 'TO_DO')}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
                            >
                              ← To Do
                            </button>
                          )}
                          {col.id !== 'IN_PROGRESS' && (
                            <button
                              onClick={() => handleStatusChange(t.id, 'IN_PROGRESS')}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800 hover:bg-cyan-200"
                            >
                              Progress
                            </button>
                          )}
                          {col.id !== 'COMPLETED' && (
                            <button
                              onClick={() => handleStatusChange(t.id, 'COMPLETED')}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            >
                              Done ✓
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Task Title</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Quick Transition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    <div>{t.title}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{t.description}</div>
                  </td>
                  <td className="py-3.5 px-4">{t.project?.student?.fullName}</td>
                  <td className="py-3.5 px-4">
                    <Badge variant={t.priority === 'URGENT' ? 'danger' : 'warning'}>{t.priority}</Badge>
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant={t.status === 'COMPLETED' ? 'success' : 'cyan'}>{t.status}</Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-1.5">
                    {t.status !== 'COMPLETED' ? (
                      <button
                        onClick={() => handleStatusChange(t.id, 'COMPLETED')}
                        className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold"
                      >
                        Mark Done ✓
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatusChange(t.id, 'IN_PROGRESS')}
                        className="px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
                      >
                        Reopen
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Task Modal */}
      <Modal
        isOpen={isNewTaskOpen}
        onClose={() => setIsNewTaskOpen(false)}
        title="Create Student Project Task"
        subtitle="Assign sprint item with deadline and priority"
      >
        <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-600 font-medium mb-1">Student</label>
            <select
              required
              value={newTaskStudentId}
              onChange={(e) => setNewTaskStudentId(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-200 bg-white"
            >
              <option value="">-- Select Student --</option>
              {studentsList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.studentId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Task Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Implement Barcode Reader & Stock FIFO Batch logic"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-200"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Description / Acceptance Criteria</label>
            <textarea
              rows={2}
              placeholder="Details on requirements..."
              value={newTaskDesc}
              onChange={(e) => setNewTaskDesc(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Priority</label>
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                className="w-full p-2 rounded-lg border border-slate-200 bg-white"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Due Date</label>
              <input
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setIsNewTaskOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500"
            >
              Create Task
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
