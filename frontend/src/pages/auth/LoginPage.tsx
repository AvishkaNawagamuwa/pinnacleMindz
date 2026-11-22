import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import {
  ArrowRight,
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  X,
  KeyRound,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const { error, success } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = identifier.trim();
    if (!cleanId || !password) {
      error('Please enter both your username/email and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      await login(cleanId, password);
      success('Authentication successful. Welcome to Pinnacle Mindz.');
      navigate('/dashboard');
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'Authentication failed. Please verify your username and password.';
      error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070d1e] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Neon Ambient Glows */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center">
        <div className="inline-flex p-3 rounded-full bg-slate-900/90 border border-cyan-500/40 shadow-glow-cyan mb-4">
          <img
            src="/logo.png"
            alt="Pinnacle Mindz Logo"
            className="w-20 h-20 object-contain rounded-full drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]"
          />
        </div>

        <h1 className="text-2xl font-black text-white tracking-wider">
          PINNACLE <span className="text-cyan-400">MINDZ</span>
        </h1>
        <p className="mt-1 text-xs font-mono text-cyan-200/70 tracking-widest uppercase">
          Project Guidance & Progress Management System
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="bg-[#0b1329]/95 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-800 backdrop-blur-md">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white tracking-tight">Sign In to Workspace</h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter your authorized credentials to access project supervision, tasks, and documentation.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Username / Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Username or Email Address
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  placeholder="e.g. 2300839 or admin@pinnaclemindz.com"
                  className="block w-full pl-10 pr-3 py-2.5 text-xs rounded-xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Students can sign in with their registration number (e.g., 2300839).
              </p>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => setShowHelpModal(true)}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="w-3 h-3" />
                  Forgot Password?
                </button>
              </div>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-10 py-2.5 text-xs rounded-xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded-sm border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-400 h-3.5 w-3.5"
                />
                <span>Keep session active on this device</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl shadow-lg text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-cyan-400 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security & Compliance Footer */}
          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              Security Protocol & Access Control
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>256-Bit SSL Encrypted Session</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Brute-Force Rate Limiting Active</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 text-center mt-4">
              Authorized personnel and registered candidates only. Unauthorized access is monitored and audited.
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password / Credential Reset Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-[#0e172f] border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl relative text-left">
            <button
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4">
              <KeyRound className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-white mb-2">Password Reset & Account Assistance</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              For security and academic record compliance, Pinnacle Mindz user accounts are managed through institutional access control.
            </p>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 space-y-2 mb-4">
              <div>
                <strong className="text-slate-200 block">Students / Candidates:</strong>
                Contact your assigned project mentor or the institute administrative desk with your student registration number.
              </div>
              <div>
                <strong className="text-slate-200 block">Faculty / Supervisors / Mentors:</strong>
                Reach out to the system Super Admin to issue an authenticated password reset link or update credentials.
              </div>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
