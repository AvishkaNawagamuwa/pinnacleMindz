import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Settings, Save, Clock, ShieldCheck, Mail, Phone, MapPin } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { success, error } = useToast();
  const [settings, setSettings] = useState<any>({
    instituteName: 'Pinnacle Mindz',
    subtitle: 'Project Guidance & Progress Management',
    contactEmail: 'contact@pinnaclemindz.com',
    contactPhone: '+94 77 890 1234',
    address: 'Colombo, Sri Lanka',
    expectedReportingFrequencyDays: 7,
    supervisorCanEditPayments: false,
    mentorsCanViewPaymentIndicator: true,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/settings');
        if (res.data.settings) setSettings(res.data.settings);
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await api.put('/settings', settings);
      success('Institute configuration saved successfully');
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Institute Settings & Governance</h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure progress tracking rules, reporting frequency thresholds, access permissions, and branding parameters.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-soft space-y-6 text-xs">
        {/* Section 1: Core Branding */}
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 border-b pb-2">
            1. Institute Identity & Profile
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Product / Institute Name</label>
              <input
                type="text"
                value={settings.instituteName}
                onChange={(e) => setSettings({ ...settings, instituteName: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">System Subtitle</label>
              <input
                type="text"
                value={settings.subtitle}
                onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Contact Email</label>
              <input
                type="email"
                value={settings.contactEmail}
                onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Contact Phone</label>
              <input
                type="text"
                value={settings.contactPhone}
                onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-600 font-medium mb-1">Official Address</label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Progress & Reporting Thresholds */}
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-cyan-600" />
            2. Progress Monitoring & Missing Update Thresholds
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Expected Reporting Frequency (Days)
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                If no daily or weekly update is submitted within this interval, the student project will be automatically flagged as <strong className="text-amber-700">"Update Missing"</strong> and alert the assigned mentor.
              </p>
              <input
                type="number"
                min={1}
                max={30}
                value={settings.expectedReportingFrequencyDays}
                onChange={(e) =>
                  setSettings({ ...settings, expectedReportingFrequencyDays: Number(e.target.value) })
                }
                className="w-40 p-2.5 rounded-xl border border-slate-200 font-mono font-bold"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Financial & Role Access Rules */}
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            3. Financial Access & Permissions Control
          </h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.supervisorCanEditPayments}
                onChange={(e) =>
                  setSettings({ ...settings, supervisorCanEditPayments: e.target.checked })
                }
                className="w-4 h-4 text-cyan-600 rounded"
              />
              <div>
                <span className="font-bold text-slate-800 block">Allow Supervisors to Record & Edit Payments</span>
                <span className="text-[11px] text-slate-500">
                  By default, financial editing is restricted strictly to Institute Admin/Owner.
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.mentorsCanViewPaymentIndicator}
                onChange={(e) =>
                  setSettings({ ...settings, mentorsCanViewPaymentIndicator: e.target.checked })
                }
                className="w-4 h-4 text-cyan-600 rounded"
              />
              <div>
                <span className="font-bold text-slate-800 block">
                  Show Simple Fee Status Indicator to Assigned Mentors
                </span>
                <span className="text-[11px] text-slate-500">
                  Displays whether candidate is Paid or Pending without revealing monetary amounts or transaction details.
                </span>
              </div>
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-md cursor-pointer disabled:opacity-50 transition-all"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving Changes...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};
