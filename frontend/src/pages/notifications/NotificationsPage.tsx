import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Notification } from '../../types';
import { Badge } from '../../components/common/Badge';
import { useToast } from '../../context/ToastContext';
import { Bell, Check, Clock, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { success } = useToast();
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      success('All notifications marked as read');
      fetchNotifications();
    } catch {}
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Notification Centre</h1>
          <p className="text-xs text-slate-500 mt-1">
            System reminders for document submission deadlines, overdue milestones, and supervisor corrections.
          </p>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" /> Mark All as Read
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden divide-y divide-slate-100">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No notifications in your inbox.</div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => n.linkUrl && navigate(n.linkUrl)}
              className={`p-4 flex items-start justify-between gap-4 hover:bg-slate-50 transition-colors cursor-pointer ${
                !n.isRead ? 'bg-cyan-50/30' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                    !n.isRead ? 'bg-cyan-500' : 'bg-slate-300'
                  }`}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">{n.title}</span>
                    <Badge variant="cyan" size="sm">{n.type}</Badge>
                  </div>
                  <p className="text-slate-600 text-xs mt-1 leading-relaxed">{n.message}</p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] text-slate-400 font-mono block">
                  {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
                {n.linkUrl && (
                  <span className="text-[10px] text-cyan-600 font-semibold hover:underline mt-1 block">
                    View Record →
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
