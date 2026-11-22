import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Payment } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import { CreditCard, DollarSign, TrendingUp, AlertOctagon, PlusCircle, Download, FileText } from 'lucide-react';

export const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Record payment modal
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [studentId, setStudentId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [remarks, setRemarks] = useState('');

  const { success, error } = useToast();

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      const [pRes, dRes] = await Promise.all([
        api.get('/payments'),
        api.get('/payments/dashboard'),
      ]);
      setPayments(pRes.data.payments || []);
      setDashboard(dRes.data);
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    const fetchStudents = async () => {
      try {
        const res = await api.get('/students');
        setStudentsList(res.data.students || []);
      } catch {}
    };
    fetchStudents();
  }, []);

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !amount) {
      error('Please select student and amount');
      return;
    }

    try {
      await api.post('/payments', {
        studentId,
        amount: Number(amount),
        paymentMethod,
        referenceNumber,
        remarks,
      });
      success('Payment recorded and receipt generated');
      setIsRecordOpen(false);
      setStudentId('');
      setAmount('');
      setReferenceNumber('');
      setRemarks('');
      fetchPayments();
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to record payment');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Student Payments & Revenue Ledger</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track student fee agreements, installment schedules, cash/bank transfers, and authorized PDF receipts.
          </p>
        </div>

        <button
          onClick={() => setIsRecordOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-md cursor-pointer transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Record Payment
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Expected Fees"
          value={`LKR ${(dashboard?.totalExpectedRevenue || 0).toLocaleString()}`}
          icon={TrendingUp}
          variant="blue"
        />
        <StatCard
          title="Total Collected"
          value={`LKR ${(dashboard?.totalCollectedRevenue || 0).toLocaleString()}`}
          icon={DollarSign}
          variant="emerald"
        />
        <StatCard
          title="Outstanding Balance"
          value={`LKR ${(dashboard?.outstandingBalance || 0).toLocaleString()}`}
          icon={AlertOctagon}
          variant="rose"
        />
        <StatCard
          title="Collection Rate"
          value={`${(dashboard?.collectionRate || 0).toFixed(1)}%`}
          icon={CreditCard}
          variant="cyan"
        />
      </div>

      {/* Payments Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Validated Payment Transactions ({payments.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Receipt Number</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Payment Date</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Method & Reference</th>
                <th className="py-3 px-4">Recorded By</th>
                <th className="py-3 px-4 text-right">PDF Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading payments ledger...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No payments recorded.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{p.receiptNumber}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      <div>{p.student?.fullName}</div>
                      <div className="text-[10px] text-slate-400 font-mono font-normal">
                        {p.student?.studentId}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono">{new Date(p.paymentDate).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                      LKR {p.amount.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <div>{p.paymentMethod.replace(/_/g, ' ')}</div>
                      {p.referenceNumber && (
                        <div className="text-[10px] text-slate-400 font-mono">{p.referenceNumber}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{p.recordedBy?.fullName}</td>
                    <td className="py-3.5 px-4 text-right">
                      <a
                        href={`/api/payments/${p.id}/receipt-pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold cursor-pointer"
                      >
                        <Download className="w-3 h-3" /> Download Receipt
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        title="Record Student Fee Payment"
        subtitle="Generates unique receipt number, updates installment ledger, and creates audit trail"
      >
        <form onSubmit={handleRecordSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-600 font-medium mb-1">Student</label>
            <select
              required
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-200 bg-white"
            >
              <option value="">-- Choose Student --</option>
              {studentsList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.studentId})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Amount (LKR)</label>
              <input
                type="number"
                required
                placeholder="20000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 bg-white"
              >
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CASH">Cash</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Transaction Ref / Cheque No</label>
            <input
              type="text"
              placeholder="e.g. TXN-BOC-88912"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-200"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Remarks</label>
            <input
              type="text"
              placeholder="e.g. Second installment fee payment"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-200"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setIsRecordOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500"
            >
              Record Payment & Issue Receipt
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
