import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { Notification } from '../../types';
import { Search, Bell, Check, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const TopNavbar: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Polling every 30s
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id: string, linkUrl?: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      fetchNotifications();
      if (linkUrl) {
        setShowNotifications(false);
        navigate(linkUrl);
      }
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      fetchNotifications();
    } catch {}
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/students?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 flex items-center justify-between shadow-xs">
      {/* Global Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative w-80 max-w-full">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search student name, registration no, project..."
          className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-100/80 border border-slate-200/80 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-hidden transition-all text-slate-800 placeholder:text-slate-400"
        />
      </form>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-200 py-3 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Notifications ({unreadCount})
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-cyan-600 hover:text-cyan-700 font-semibold flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">No notifications</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkAsRead(n.id, n.linkUrl)}
                      className={`p-3 text-xs hover:bg-slate-50 cursor-pointer transition-colors flex items-start gap-2.5 ${
                        !n.isRead ? 'bg-cyan-50/40' : ''
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          !n.isRead ? 'bg-cyan-500' : 'bg-transparent'
                        }`}
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-slate-800 flex items-center justify-between">
                          <span>{n.title}</span>
                          {n.linkUrl && <ExternalLink className="w-3 h-3 text-slate-400" />}
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">{n.message}</div>
                        <div className="text-[10px] text-slate-400 mt-1 font-mono">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Avatar Pill */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
            {user?.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-bold text-slate-900 leading-tight">{user?.fullName}</span>
            <span className="text-[10px] font-mono text-cyan-600 font-semibold">{user?.role}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
