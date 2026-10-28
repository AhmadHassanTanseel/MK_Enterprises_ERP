import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import toast from 'react-hot-toast';
import { 
  Plus, History, Users, Calendar, DollarSign, CheckCircle2, 
  XCircle, Clock, FileText, Printer, Edit2, Trash2, CheckSquare,
  ChevronLeft, ChevronRight, Check, X, CreditCard, Building2, BookOpen
} from 'lucide-react';
import { useAppContext } from '../../app/context/AppContext';
import { BankAccountSelect } from '../../shared/components/BankAccountSelect';

interface WorkerItem {
  id: number;
  name: string;
  designation?: string | null;
  contact?: string | null;
  wage_type?: 'MONTHLY' | 'DAILY' | string;
  salary_rate?: number;
}

interface AttendanceRow {
  account_id: number;
  name: string;
  designation?: string | null;
  contact?: string | null;
  wage_type?: string;
  salary_rate?: number;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE' | string;
  remarks: string;
}

interface SalarySummaryRow {
  account_id: number;
  name: string;
  designation?: string | null;
  contact?: string | null;
  wage_type: string;
  salary_rate: number;
  total_days: number;
  present_days: number;
  absent_days: number;
  half_days: number;
  leave_days: number;
  per_day_rate: number;
  total_earned?: number;
  deductions: number;
  advance_paid: number;
  salary_already_paid: number;
  net_payable: number;
}

export const AttendanceComponent: React.FC = () => {
  const { postPayment } = useAppContext();
  const [activeTab, setActiveTab] = useState<'attendance' | 'salary'>('attendance');

  // Daily Attendance state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [workers, setWorkers] = useState<WorkerItem[]>([]);
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Salary Sheet state
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [salaryRows, setSalaryRows] = useState<SalarySummaryRow[]>([]);
  const [salaryLoading, setSalaryLoading] = useState(false);

  // Add/Edit Worker Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingWorkerId, setEditingWorkerId] = useState<number | null>(null);
  const [workerName, setWorkerName] = useState('');
  const [workerDesig, setWorkerDesig] = useState('');
  const [workerContact, setWorkerContact] = useState('');
  const [workerWageType, setWorkerWageType] = useState<'MONTHLY' | 'DAILY'>('MONTHLY');
  const [workerSalaryRate, setWorkerSalaryRate] = useState<number | ''>('');

  // History Modal & Calendar State
  const [historyWorker, setHistoryWorker] = useState<WorkerItem | null>(null);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [historyViewMode, setHistoryViewMode] = useState<'calendar' | 'list'>('calendar');
  const [calendarMonthDate, setCalendarMonthDate] = useState(new Date());

  // Pay Salary Modal State
  const [paySalaryModalOpen, setPaySalaryModalOpen] = useState(false);
  const [payingSalaryWorker, setPayingSalaryWorker] = useState<SalarySummaryRow | null>(null);
  const [salaryPayAmount, setSalaryPayAmount] = useState<number | ''>('');
  const [salaryPaymentMethod, setSalaryPaymentMethod] = useState<'CASH' | 'BANK'>('CASH');
  const [salarySelectedBankId, setSalarySelectedBankId] = useState<number | null>(null);
  const [salaryPayDate, setSalaryPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [salaryPayNotes, setSalaryPayNotes] = useState('');
  const [isPayingSalary, setIsPayingSalary] = useState(false);

  // Give Advance Modal State
  const [giveAdvanceModalOpen, setGiveAdvanceModalOpen] = useState(false);
  const [advanceWorker, setAdvanceWorker] = useState<WorkerItem | SalarySummaryRow | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState<number | ''>('');
  const [advancePaymentMethod, setAdvancePaymentMethod] = useState<'CASH' | 'BANK'>('CASH');
  const [advanceSelectedBankId, setAdvanceSelectedBankId] = useState<number | null>(null);
  const [advanceDate, setAdvanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [advanceNotes, setAdvanceNotes] = useState('');
  const [isGivingAdvance, setIsGivingAdvance] = useState(false);

  // Worker Khata / Ledger Modal State
  const [workerKhataModalOpen, setWorkerKhataModalOpen] = useState(false);
  const [khataWorker, setKhataWorker] = useState<WorkerItem | SalarySummaryRow | null>(null);
  const [workerKhataEntries, setWorkerKhataEntries] = useState<any[]>([]);
  const [loadingWorkerKhata, setLoadingWorkerKhata] = useState(false);

  useEffect(() => {
    loadAttendanceData();
  }, [date]);

  useEffect(() => {
    if (activeTab === 'salary') {
      loadSalaryData();
    }
  }, [activeTab, startDate, endDate]);

  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      const w: WorkerItem[] = await invoke('get_workers');
      const att: any[] = await invoke('get_attendance', { date });
      
      setWorkers(w);
      setRecords(w.map(worker => {
        const existing = att.find(a => a.account_id === worker.id);
        return {
          account_id: worker.id,
          name: worker.name,
          designation: worker.designation,
          contact: worker.contact,
          wage_type: worker.wage_type || 'MONTHLY',
          salary_rate: worker.salary_rate || 0,
          status: existing ? existing.status : 'PRESENT',
          remarks: existing ? (existing.remarks || '') : ''
        };
      }));
    } catch (e: any) {
      toast.error(e.toString());
    } finally {
      setLoading(false);
    }
  };

  const loadSalaryData = async () => {
    try {
      setSalaryLoading(true);
      const res: SalarySummaryRow[] = await invoke('get_salary_summary', {
        startDate,
        endDate
      });
      setSalaryRows(res);
    } catch (e: any) {
      toast.error('Failed to load salary calculations: ' + e.toString());
    } finally {
      setSalaryLoading(false);
    }
  };

  const updateRecord = (id: number, field: string, value: string) => {
    setRecords(records.map(r => r.account_id === id ? { ...r, [field]: value } : r));
  };

  const markAllPresent = () => {
    setRecords(records.map(r => ({ ...r, status: 'PRESENT' })));
    toast.success('All workers set to Present');
  };

  const handleSaveAttendance = async () => {
    try {
      setLoading(true);
      const payload = records.map(r => ({
        account_id: r.account_id,
        status: r.status,
        remarks: r.remarks || null
      }));
      await invoke('mark_attendance', { date, records: payload });
      toast.success('حاضری محفوظ ہو گئی / Attendance Saved Successfully');
      loadAttendanceData();
    } catch (e: any) {
      toast.error(e.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingWorkerId(null);
    setWorkerName('');
    setWorkerDesig('');
    setWorkerContact('');
    setWorkerWageType('MONTHLY');
    setWorkerSalaryRate('');
    setIsAddOpen(true);
  };

  const handleOpenEdit = (w: WorkerItem) => {
    setEditingWorkerId(w.id);
    setWorkerName(w.name);
    setWorkerDesig(w.designation || '');
    setWorkerContact(w.contact || '');
    setWorkerWageType((w.wage_type as any) === 'DAILY' ? 'DAILY' : 'MONTHLY');
    setWorkerSalaryRate(w.salary_rate || '');
    setIsAddOpen(true);
  };

  const handleSaveWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerName.trim()) {
      toast.error("Worker Name is required");
      return;
    }

    try {
      setLoading(true);
      if (editingWorkerId) {
        await invoke('update_worker', {
          id: editingWorkerId,
          name: workerName.trim(),
          designation: workerDesig.trim() || null,
          contact: workerContact.trim() || null,
          wageType: workerWageType,
          salaryRate: Number(workerSalaryRate) || 0
        });
        toast.success("Worker updated successfully");
      } else {
        await invoke('quick_add_worker', {
          name: workerName.trim(),
          designation: workerDesig.trim() || null,
          contact: workerContact.trim() || null,
          wageType: workerWageType,
          salaryRate: Number(workerSalaryRate) || 0
        });
        toast.success("New worker registered successfully");
      }
      setIsAddOpen(false);
      loadAttendanceData();
    } catch (err: any) {
      toast.error(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorker = async (workerId: number) => {
    if (!window.confirm("Are you sure you want to remove this worker?")) return;
    try {
      await invoke('delete_worker', { id: workerId });
      toast.success("Worker deactivated");
      loadAttendanceData();
    } catch (e: any) {
      toast.error(e.toString());
    }
  };

  const openHistory = async (worker: WorkerItem) => {
    setHistoryWorker(worker);
    try {
      const hist: any[] = await invoke('get_worker_attendance_history', { accountId: worker.id });
      setHistoryRecords(hist);
    } catch (e: any) {
      toast.error(e.toString());
    }
  };

  const handleOpenPaySalaryModal = (worker: SalarySummaryRow) => {
    if (worker.net_payable <= 0) {
      toast.error('اس مدت کے لیے کوئی رقم واجب الادا نہیں ہے (Already paid or zero payable)');
      return;
    }
    setPayingSalaryWorker(worker);
    setSalaryPayAmount(worker.net_payable);
    setSalaryPaymentMethod('CASH');
    setSalarySelectedBankId(null);
    setSalaryPayDate(new Date().toISOString().split('T')[0]);
    setSalaryPayNotes(`Salary/Wages for period ${startDate} to ${endDate}`);
    setPaySalaryModalOpen(true);
  };

  const handleConfirmPaySalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingSalaryWorker || !salaryPayAmount || Number(salaryPayAmount) <= 0) {
      toast.error('درست رقم درج کریں');
      return;
    }
    if (salaryPaymentMethod === 'BANK' && !salarySelectedBankId) {
      toast.error('بینک اکاؤنٹ منتخب کریں (Select Bank Account)');
      return;
    }

    setIsPayingSalary(true);
    try {
      const refNo = `SAL-${Date.now().toString().slice(-6)}`;
      await postPayment(
        salaryPayDate,
        payingSalaryWorker.account_id,
        'PAY',
        Number(salaryPayAmount),
        salaryPayNotes || `Salary/Wages (${startDate} to ${endDate})`,
        refNo,
        salaryPaymentMethod,
        salaryPaymentMethod === 'BANK' ? (salarySelectedBankId || undefined) : undefined
      );
      toast.success(`تنخواہ کی ادائیگی برائے ${payingSalaryWorker.name} (Rs. ${Number(salaryPayAmount).toLocaleString()}) محفوظ ہو گئی!`);
      setPaySalaryModalOpen(false);
      setPayingSalaryWorker(null);
      await loadSalaryData();
    } catch (err: any) {
      toast.error(`ادائیگی ناکام: ${err.toString()}`);
    } finally {
      setIsPayingSalary(false);
    }
  };

  const handleOpenGiveAdvance = (worker: WorkerItem | SalarySummaryRow) => {
    setAdvanceWorker(worker);
    setAdvanceAmount('');
    setAdvancePaymentMethod('CASH');
    setAdvanceSelectedBankId(null);
    setAdvanceDate(new Date().toISOString().split('T')[0]);
    setAdvanceNotes(`Advance Salary (پیشگی تنخواہ) - ${worker.name}`);
    setGiveAdvanceModalOpen(true);
  };

  const handleConfirmGiveAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advanceWorker || !advanceAmount || Number(advanceAmount) <= 0) {
      toast.error('درست ایڈوانس رقم درج کریں');
      return;
    }
    if (advancePaymentMethod === 'BANK' && !advanceSelectedBankId) {
      toast.error('بینک اکاؤنٹ منتخب کریں');
      return;
    }

    setIsGivingAdvance(true);
    try {
      const refNo = `ADV-${Date.now().toString().slice(-6)}`;
      const workerId = 'account_id' in advanceWorker ? advanceWorker.account_id : advanceWorker.id;
      await postPayment(
        advanceDate,
        workerId,
        'PAY',
        Number(advanceAmount),
        advanceNotes || `Advance Salary (پیشگی تنخواہ) - ${advanceWorker.name}`,
        refNo,
        advancePaymentMethod,
        advancePaymentMethod === 'BANK' ? (advanceSelectedBankId || undefined) : undefined
      );
      toast.success(`ایڈوانس رقم برائے ${advanceWorker.name} (Rs. ${Number(advanceAmount).toLocaleString()}) ادا ہو گئی!`);
      setGiveAdvanceModalOpen(false);
      setAdvanceWorker(null);
      await loadSalaryData();
    } catch (err: any) {
      toast.error(`ایڈوانس ادائیگی ناکام: ${err.toString()}`);
    } finally {
      setIsGivingAdvance(false);
    }
  };

  const handleOpenWorkerKhata = async (worker: WorkerItem | SalarySummaryRow) => {
    const workerId = 'account_id' in worker ? worker.account_id : worker.id;
    setKhataWorker(worker);
    setLoadingWorkerKhata(true);
    setWorkerKhataModalOpen(true);
    try {
      const res: any = await invoke('get_account_ledger', {
        accountId: workerId,
        fromDate: null,
        toDate: null
      });
      setWorkerKhataEntries(res?.entries || res || []);
    } catch (err: any) {
      toast.error(`کھاتہ لوڈ کرنے میں غلطی: ${err.toString()}`);
    } finally {
      setLoadingWorkerKhata(false);
    }
  };

  const handlePrintSalarySheet = () => {
    window.print();
  };

  // Daily statistics
  const presentCount = records.filter(r => r.status === 'PRESENT').length;
  const halfDayCount = records.filter(r => r.status === 'HALF_DAY').length;
  const absentCount = records.filter(r => r.status === 'ABSENT').length;
  const leaveCount = records.filter(r => r.status === 'LEAVE').length;

  // Salary calculations
  const totalPayrollPayable = salaryRows.reduce((sum, r) => sum + r.net_payable, 0);
  const totalPayrollDeductions = salaryRows.reduce((sum, r) => sum + r.deductions, 0);

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            ملازمین اور حاضری / Workers & Attendance
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Zawar Traders - Daily Attendance, Monthly Salary & Wages Calculation
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold text-sm transition-all ${
              activeTab === 'attendance'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="h-4 w-4" />
            روزانہ حاضری (Daily Attendance)
          </button>
          <button
            onClick={() => setActiveTab('salary')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold text-sm transition-all ${
              activeTab === 'salary'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="h-4 w-4" />
            تنخواہ شیٹ (Salary & Wages Sheet)
          </button>
        </div>
      </div>

      {/* TAB 1: DAILY ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <label className="text-sm font-bold text-slate-700">تاریخ / Date:</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              />
            </div>

            {/* Attendance stat badges */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-700">
                کل ملازمین: {records.length}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> حاضر: {presentCount}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> آدھا دن: {halfDayCount}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 flex items-center gap-1">
                <XCircle className="h-3.5 w-3.5" /> غیر حاضر: {absentCount}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                چھٹی: {leaveCount}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={markAllPresent}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 rounded-lg font-bold text-xs transition-colors"
                title="سب کو حاضر کریں"
              >
                <CheckSquare className="h-4 w-4" /> Mark All Present
              </button>
              <button
                type="button"
                onClick={handleOpenAdd}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-bold text-xs transition-colors shadow-sm"
              >
                <Plus className="h-4 w-4" /> Add Worker (نیا ملازم)
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider">
                  <th className="p-3">Worker Name (نام)</th>
                  <th className="p-3">Designation (عہدہ)</th>
                  <th className="p-3">Contact (رابطہ)</th>
                  <th className="p-3 text-center">Wage Type (قسم)</th>
                  <th className="p-3 text-right">Rate (تنخواہ/اجرت)</th>
                  <th className="p-3 text-center">Status (حاضری)</th>
                  <th className="p-3">Remarks (نوٹ)</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map(r => (
                  <tr key={r.account_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-bold text-slate-800">{r.name}</td>
                    <td className="p-3 text-slate-600 font-medium">{r.designation || '—'}</td>
                    <td className="p-3 font-mono text-xs text-slate-500">{r.contact || '—'}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        r.wage_type === 'DAILY' 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {r.wage_type === 'DAILY' ? 'روزانہ (Daily)' : 'ماہانہ (Monthly)'}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-slate-700">
                      Rs. {(r.salary_rate || 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <select
                        value={r.status}
                        onChange={e => updateRecord(r.account_id, 'status', e.target.value)}
                        className={`text-xs font-bold rounded-lg px-2.5 py-1.5 border outline-none ${
                          r.status === 'PRESENT'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : r.status === 'HALF_DAY'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : r.status === 'ABSENT'
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : 'bg-blue-50 text-blue-800 border-blue-300'
                        }`}
                      >
                        <option value="PRESENT">حاضر (Present)</option>
                        <option value="HALF_DAY">آدھا دن (Half Day)</option>
                        <option value="ABSENT">غیر حاضر (Absent)</option>
                        <option value="LEAVE">چھٹی (Leave)</option>
                      </select>
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        placeholder="اختیاری تفصیل..."
                        value={r.remarks}
                        onChange={e => updateRecord(r.account_id, 'remarks', e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openHistory({ id: r.account_id, name: r.name })}
                          className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition-colors border border-blue-200"
                          title="حاضری ہسٹری کیلنڈر دیکھیں"
                        >
                          <Calendar className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenGiveAdvance({ id: r.account_id, name: r.name })}
                          className="p-1.5 rounded text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors border border-amber-200 text-xs font-bold"
                          title="پیشگی ایڈوانس دیں"
                        >
                          <DollarSign className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenWorkerKhata({ id: r.account_id, name: r.name })}
                          className="p-1.5 rounded text-slate-700 hover:bg-slate-100 transition-colors border border-slate-200 text-xs font-bold"
                          title="کھاتہ / لیجر دیکھیں"
                        >
                          <BookOpen className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit({
                            id: r.account_id,
                            name: r.name,
                            designation: r.designation,
                            contact: r.contact,
                            wage_type: r.wage_type,
                            salary_rate: r.salary_rate
                          })}
                          className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          title="تبدیل کریں"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteWorker(r.account_id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="حذف کریں"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      کوئی ملازم درج نہیں۔ نیا ملازم شامل کرنے کے لیے "Add Worker" دبائیں۔
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveAttendance}
              disabled={loading || records.length === 0}
              className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <CheckCircle2 className="h-5 w-5" />
              {loading ? 'محفوظ ہو رہا ہے...' : 'حاضری محفوظ کریں / Save Attendance'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: SALARY & WAGES CALCULATION SHEET */}
      {activeTab === 'salary' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-slate-700">مدت / Date Range:</span>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-slate-800 bg-white"
              />
              <span className="text-xs text-slate-400">تا</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-slate-800 bg-white"
              />
              <button
                type="button"
                onClick={loadSalaryData}
                disabled={salaryLoading}
                className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 transition-colors"
              >
                {salaryLoading ? 'حساب جاری ہے...' : 'حساب دوبارہ کریں'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrintSalarySheet}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg font-bold text-xs text-slate-700 shadow-sm"
              >
                <Printer className="h-4 w-4" /> Print Sheet
              </button>
            </div>
          </div>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <span className="text-xs font-bold text-emerald-800">کل واجب الادا رقم (Net Payable)</span>
              <p className="text-xl font-black text-emerald-700 mt-1">Rs. {totalPayrollPayable.toLocaleString()}</p>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
              <span className="text-xs font-bold text-rose-800">کل کٹوتیاں (Deductions)</span>
              <p className="text-xl font-black text-rose-700 mt-1">Rs. {totalPayrollDeductions.toLocaleString()}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <span className="text-xs font-bold text-blue-800">حاضر ملازمین</span>
              <p className="text-xl font-black text-blue-700 mt-1">{salaryRows.length} ملازمین</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="text-xs font-bold text-slate-700">کل دن (Period Days)</span>
              <p className="text-xl font-black text-slate-800 mt-1">{salaryRows[0]?.total_days || 30} دن</p>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider">
                  <th className="p-3">Worker (ملازم)</th>
                  <th className="p-3">Type</th>
                  <th className="p-3 text-right">Base Rate</th>
                  <th className="p-3 text-center">حاضر (P)</th>
                  <th className="p-3 text-center">آدھا دن (HD)</th>
                  <th className="p-3 text-center">غیر حاضر (A)</th>
                  <th className="p-3 text-center">چھٹی (L)</th>
                  <th className="p-3 text-right text-rose-600">کٹوتیاں (Deduct)</th>
                  <th className="p-3 text-right text-amber-700 font-bold">ایڈوانس (Advance)</th>
                  <th className="p-3 text-right text-blue-700 font-bold">ادا شدہ (Paid)</th>
                  <th className="p-3 text-right text-emerald-700 font-black">خالص واجب الادا (Net)</th>
                  <th className="p-3 text-center">Actions (ادائیگی و کھاتہ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salaryRows.map(row => (
                  <tr key={row.account_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-slate-800">{row.name}</div>
                      <div className="text-xs text-slate-500">{row.designation || 'Staff'}</div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        row.wage_type === 'DAILY' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {row.wage_type === 'DAILY' ? 'روزانہ' : 'ماہانہ'}
                      </span>
                    </td>
                    <td className="p-3 text-right font-semibold text-slate-700">
                      Rs. {row.salary_rate.toLocaleString()}
                    </td>
                    <td className="p-3 text-center font-bold text-emerald-700">{row.present_days}</td>
                    <td className="p-3 text-center font-semibold text-amber-600">{row.half_days}</td>
                    <td className="p-3 text-center font-semibold text-rose-600">{row.absent_days}</td>
                    <td className="p-3 text-center font-semibold text-blue-600">{row.leave_days}</td>
                    <td className="p-3 text-right font-bold text-rose-600">
                      Rs. {row.deductions.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-bold text-amber-700">
                      {row.advance_paid > 0 ? `Rs. ${row.advance_paid.toLocaleString()}` : '—'}
                    </td>
                    <td className="p-3 text-right font-bold text-blue-700">
                      {row.salary_already_paid > 0 ? `Rs. ${row.salary_already_paid.toLocaleString()}` : '—'}
                    </td>
                    <td className="p-3 text-right font-black text-emerald-700 text-base">
                      Rs. {row.net_payable.toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {row.net_payable > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleOpenPaySalaryModal(row)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-colors shadow-xs"
                          >
                            ادائیگی کریں
                          </button>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[11px] font-bold border border-emerald-200">
                            ✅ ادا شدہ
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenGiveAdvance(row)}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded text-xs font-bold transition-colors border border-amber-200"
                          title="پیشگی ایڈوانس دیں"
                        >
                          + ایڈوانس
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenWorkerKhata(row)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold transition-colors border border-slate-200"
                          title="کھاتہ دیکھیں"
                        >
                          کھاتہ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {salaryRows.length === 0 && (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-slate-500">
                      کوئی ریکارڈ دستیاب نہیں۔
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Worker Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">
              {editingWorkerId ? 'Edit Worker (ملازم کی معلومات تبدیل کریں)' : 'Add New Worker (نیا ملازم شامل کریں)'}
            </h3>
            <form onSubmit={handleSaveWorker} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Worker Name (ملازم کا نام) *</label>
                <input
                  type="text"
                  required
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. محمد احمد"
                  value={workerName}
                  onChange={e => setWorkerName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Designation (عہدہ)</label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. سیلزمین، ہیلپر، لوڈر، منیجر"
                  value={workerDesig}
                  onChange={e => setWorkerDesig(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contact / Phone (موبائل نمبر)</label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="0300-1234567"
                  value={workerContact}
                  onChange={e => setWorkerContact(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Wage Type (اجرت کی قسم)</label>
                  <select
                    value={workerWageType}
                    onChange={e => setWorkerWageType(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="MONTHLY">ماہانہ تنخواہ (Monthly)</option>
                    <option value="DAILY">روزانہ دہاڑی (Daily)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {workerWageType === 'DAILY' ? 'Daily Wage (دہاڑی)' : 'Salary (ماہانہ تنخواہ)'} (Rs.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm font-bold text-emerald-700 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0"
                    value={workerSalaryRate}
                    onChange={e => setWorkerSalaryRate(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 hover:bg-slate-100 rounded-lg text-sm text-slate-600 font-medium"
                >
                  منسوخ (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-md transition-colors disabled:opacity-50"
                >
                  {loading ? 'محفوظ ہو رہا ہے...' : 'محفوظ کریں (Save Worker)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal: Monthly Calendar View & List View */}
      {historyWorker && (() => {
        const calYear = calendarMonthDate.getFullYear();
        const calMonth = calendarMonthDate.getMonth();
        const monthName = calendarMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
        const firstDayIndex = new Date(calYear, calMonth, 1).getDay(); // 0: Sunday

        // Monthly counts
        const monthPrefix = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;
        const monthRecords = historyRecords.filter(r => r.date && r.date.startsWith(monthPrefix));
        const monthPresent = monthRecords.filter(r => r.status === 'PRESENT').length;
        const monthAbsent = monthRecords.filter(r => r.status === 'ABSENT').length;
        const monthHalf = monthRecords.filter(r => r.status === 'HALF_DAY').length;
        const monthLeave = monthRecords.filter(r => r.status === 'LEAVE').length;

        const dayNames = ['اتوار (Sun)', 'پیر (Mon)', 'منگل (Tue)', 'بدھ (Wed)', 'جمعرات (Thu)', 'جمعہ (Fri)', 'ہفتہ (Sat)'];

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-100">
              {/* Header */}
              <div className="p-4 px-6 border-b flex justify-between items-center bg-slate-50/80">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      حاضری کیلنڈر: {historyWorker.name}
                    </h3>
                    <p className="text-xs text-slate-500">حاضر دن سبز (Green) اور غیر حاضر دن سرخ (Red)</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* View Mode Toggle */}
                  <div className="flex bg-slate-200/80 p-0.5 rounded-lg text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setHistoryViewMode('calendar')}
                      className={`px-3 py-1.5 rounded-md transition-all ${
                        historyViewMode === 'calendar' ? 'bg-white shadow-xs text-blue-700' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      📅 کیلنڈر (Calendar)
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryViewMode('list')}
                      className={`px-3 py-1.5 rounded-md transition-all ${
                        historyViewMode === 'list' ? 'bg-white shadow-xs text-blue-700' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      📋 لسٹ (List)
                    </button>
                  </div>

                  <button
                    onClick={() => setHistoryWorker(null)}
                    className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600 text-lg font-bold"
                  >
                    &times;
                  </button>
                </div>
              </div>

              {/* Month Navigation & Summary */}
              {historyViewMode === 'calendar' && (
                <div className="p-4 border-b border-slate-100 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      type="button"
                      onClick={() => setCalendarMonthDate(new Date(calYear, calMonth - 1, 1))}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" /> پچھلا مہینہ
                    </button>

                    <h4 className="text-base font-black text-slate-800 tracking-wide">
                      {monthName}
                    </h4>

                    <button
                      type="button"
                      onClick={() => setCalendarMonthDate(new Date(calYear, calMonth + 1, 1))}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                    >
                      اگلا مہینہ <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Monthly Summary Badges */}
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-lg text-emerald-800">
                      <span className="block text-[11px] font-medium">حاضر (Present)</span>
                      <span className="text-base font-black text-emerald-600">{monthPresent} دن</span>
                    </div>
                    <div className="bg-rose-50 border border-rose-200 p-2 rounded-lg text-rose-800">
                      <span className="block text-[11px] font-medium">غیر حاضر (Absent)</span>
                      <span className="text-base font-black text-rose-600">{monthAbsent} دن</span>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg text-amber-800">
                      <span className="block text-[11px] font-medium">آدھا دن (Half Day)</span>
                      <span className="text-base font-black text-amber-600">{monthHalf} دن</span>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 p-2 rounded-lg text-blue-800">
                      <span className="block text-[11px] font-medium">چھٹی (Leave)</span>
                      <span className="text-base font-black text-blue-600">{monthLeave} دن</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Body: Calendar or List */}
              <div className="p-4 overflow-y-auto flex-1">
                {historyViewMode === 'calendar' ? (
                  <div>
                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-slate-500 mb-2">
                      {dayNames.map(d => (
                        <div key={d} className="p-1.5 bg-slate-100 rounded-md truncate">{d}</div>
                      ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1.5">
                      {/* Empty padding cells for first week */}
                      {Array.from({ length: firstDayIndex }).map((_, i) => (
                        <div key={`empty-${i}`} className="h-16 rounded-lg bg-slate-50/40 border border-dashed border-slate-100" />
                      ))}

                      {/* Day Cells */}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const dayNum = i + 1;
                        const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                        const rec = historyRecords.find(r => r.date === dateStr);

                        const isPresent = rec?.status === 'PRESENT';
                        const isAbsent = rec?.status === 'ABSENT';
                        const isHalfDay = rec?.status === 'HALF_DAY';
                        const isLeave = rec?.status === 'LEAVE';

                        let cellClass = "border-slate-200 bg-white hover:bg-slate-50 text-slate-600";
                        if (isPresent) cellClass = "border-emerald-300 bg-emerald-50/80 text-emerald-900 shadow-xs";
                        else if (isAbsent) cellClass = "border-rose-300 bg-rose-50/80 text-rose-900 shadow-xs";
                        else if (isHalfDay) cellClass = "border-amber-300 bg-amber-50/80 text-amber-900 shadow-xs";
                        else if (isLeave) cellClass = "border-blue-300 bg-blue-50/80 text-blue-900 shadow-xs";

                        return (
                          <div
                            key={dayNum}
                            className={`h-16 border rounded-xl p-1.5 flex flex-col justify-between transition-all ${cellClass}`}
                            title={rec ? `${dateStr}: ${rec.status} ${rec.remarks ? '(' + rec.remarks + ')' : ''}` : dateStr}
                          >
                            <span className="text-xs font-black self-start">
                              {dayNum}
                            </span>

                            {isPresent && (
                              <div className="w-full text-center py-0.5 rounded-md bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center gap-0.5 shadow-2xs">
                                <Check className="h-3 w-3 stroke-[3]" /> حاضر
                              </div>
                            )}

                            {isAbsent && (
                              <div className="w-full text-center py-0.5 rounded-md bg-rose-600 text-white font-bold text-[10px] flex items-center justify-center gap-0.5 shadow-2xs">
                                <X className="h-3 w-3 stroke-[3]" /> غیر حاضر
                              </div>
                            )}

                            {isHalfDay && (
                              <div className="w-full text-center py-0.5 rounded-md bg-amber-500 text-white font-bold text-[10px] shadow-2xs">
                                ½ آدھا دن
                              </div>
                            )}

                            {isLeave && (
                              <div className="w-full text-center py-0.5 rounded-md bg-blue-500 text-white font-bold text-[10px] shadow-2xs">
                                چھٹی
                              </div>
                            )}

                            {!rec && (
                              <span className="text-[10px] text-slate-300 self-center">—</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b text-slate-600">
                        <th className="p-2.5">تاریخ (Date)</th>
                        <th className="p-2.5">حاضری (Status)</th>
                        <th className="p-2.5">تفصیل (Remarks)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historyRecords.map(h => (
                        <tr key={h.id}>
                          <td className="p-2.5 font-mono">{h.date}</td>
                          <td className="p-2.5 font-bold">
                            <span className={`px-2 py-0.5 rounded text-[11px] ${
                              h.status === 'PRESENT'
                                ? 'bg-emerald-100 text-emerald-800'
                                : h.status === 'HALF_DAY'
                                ? 'bg-amber-100 text-amber-800'
                                : h.status === 'ABSENT'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {h.status}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-500">{h.remarks || '—'}</td>
                        </tr>
                      ))}
                      {historyRecords.length === 0 && (
                        <tr>
                          <td colSpan={3} className="p-6 text-center text-slate-400">
                            کوئی حاضری ریکارڈ نہیں ملا۔
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Pay Salary Modal: Cash vs Bank & Double-Pay Prevention */}
      {paySalaryModalOpen && payingSalaryWorker && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              تنخواہ ادائیگی (Pay Salary): {payingSalaryWorker.name}
            </h3>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>بنیادی ریٹ (Rate):</span>
                <span className="font-bold">Rs. {payingSalaryWorker.salary_rate.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>حاضر دن (Present / Half):</span>
                <span>{payingSalaryWorker.present_days} P | {payingSalaryWorker.half_days} HD</span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>غیر حاضر کٹوتیاں (Deductions):</span>
                <span>-Rs. {payingSalaryWorker.deductions.toLocaleString()}</span>
              </div>
              {payingSalaryWorker.advance_paid > 0 && (
                <div className="flex justify-between text-amber-700 font-bold">
                  <span>منہا شدہ ایڈوانس (Advance Deducted):</span>
                  <span>-Rs. {payingSalaryWorker.advance_paid.toLocaleString()}</span>
                </div>
              )}
              {payingSalaryWorker.salary_already_paid > 0 && (
                <div className="flex justify-between text-blue-700 font-bold">
                  <span>پہلے ادا شدہ (Already Paid):</span>
                  <span>-Rs. {payingSalaryWorker.salary_already_paid.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-emerald-700 font-black text-sm border-t border-slate-200 pt-1 mt-1">
                <span>خالص واجب الادا (Net Payable):</span>
                <span>Rs. {payingSalaryWorker.net_payable.toLocaleString()}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmPaySalary} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ادائیگی کی رقم (Amount to Pay Rs.) *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  max={payingSalaryWorker.net_payable}
                  value={salaryPayAmount}
                  onChange={e => setSalaryPayAmount(Number(e.target.value) || '')}
                  className="w-full border border-slate-300 rounded-lg p-2 text-base font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ادائیگی کا طریقہ (Payment Method) *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSalaryPaymentMethod('CASH')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                      salaryPaymentMethod === 'CASH'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    💵 کیش دراز (Cash)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalaryPaymentMethod('BANK')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                      salaryPaymentMethod === 'BANK'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🏦 بینک اکاؤنٹ (Bank)
                  </button>
                </div>
              </div>

              {salaryPaymentMethod === 'BANK' && (
                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200">
                  <label className="block text-xs font-bold text-slate-700 mb-1">بینک اکاؤنٹ منتخب کریں:</label>
                  <BankAccountSelect
                    value={salarySelectedBankId}
                    onChange={setSalarySelectedBankId}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تاریخ (Date)</label>
                <input
                  type="date"
                  value={salaryPayDate}
                  onChange={e => setSalaryPayDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تفصیل / نوٹس (Narration)</label>
                <input
                  type="text"
                  value={salaryPayNotes}
                  onChange={e => setSalaryPayNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="e.g. Salary October 2026"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setPaySalaryModalOpen(false);
                    setPayingSalaryWorker(null);
                  }}
                  className="flex-1 py-2 px-4 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPayingSalary}
                  className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                >
                  {isPayingSalary ? 'ادائیگی ہو رہی ہے...' : 'تنخواہ ادا کریں (Confirm Pay)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Give Advance Modal: Cash vs Bank */}
      {giveAdvanceModalOpen && advanceWorker && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-amber-600" />
              پیشگی ایڈوانس دیں: {advanceWorker.name}
            </h3>

            <p className="text-xs text-slate-500 mb-4">
              یہ رقم ملازم کے کھاتے میں بطور پیشگی ایڈوانس درج ہوگی اور تنخواہ ادا کرتے وقت خودبخود منہا ہو جائے گی۔
            </p>

            <form onSubmit={handleConfirmGiveAdvance} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ایڈوانس رقم (Advance Amount Rs.) *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  placeholder="0.00"
                  value={advanceAmount}
                  onChange={e => setAdvanceAmount(Number(e.target.value) || '')}
                  className="w-full border border-slate-300 rounded-lg p-2 text-base font-bold text-amber-700 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ادائیگی کا طریقہ (Payment Method) *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdvancePaymentMethod('CASH')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                      advancePaymentMethod === 'CASH'
                        ? 'bg-amber-50 border-amber-500 text-amber-800 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    💵 کیش دراز (Cash)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdvancePaymentMethod('BANK')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                      advancePaymentMethod === 'BANK'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🏦 بینک اکاؤنٹ (Bank)
                  </button>
                </div>
              </div>

              {advancePaymentMethod === 'BANK' && (
                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200">
                  <label className="block text-xs font-bold text-slate-700 mb-1">بینک اکاؤنٹ منتخب کریں:</label>
                  <BankAccountSelect
                    value={advanceSelectedBankId}
                    onChange={setAdvanceSelectedBankId}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تاریخ (Date)</label>
                <input
                  type="date"
                  value={advanceDate}
                  onChange={e => setAdvanceDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تفصیل / نوٹس (Notes)</label>
                <input
                  type="text"
                  value={advanceNotes}
                  onChange={e => setAdvanceNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="e.g. Advance for personal need"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setGiveAdvanceModalOpen(false);
                    setAdvanceWorker(null);
                  }}
                  className="flex-1 py-2 px-4 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGivingAdvance}
                  className="flex-1 py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                >
                  {isGivingAdvance ? 'ادائیگی جاری ہے...' : 'ایڈوانس دیں (Confirm Advance)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Worker Khata / Ledger Modal */}
      {workerKhataModalOpen && khataWorker && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden border border-slate-100">
            <div className="p-4 px-6 border-b flex justify-between items-center bg-slate-50/80">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-800">
                  ملازم کا کھاتہ (Worker Khata / Ledger): {khataWorker.name}
                </h3>
              </div>
              <button
                onClick={() => {
                  setWorkerKhataModalOpen(false);
                  setKhataWorker(null);
                }}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold px-2"
              >
                &times;
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {loadingWorkerKhata ? (
                <div className="p-8 text-center text-slate-500 font-bold">کھاتہ لوڈ ہو رہا ہے...</div>
              ) : workerKhataEntries.length === 0 ? (
                <div className="p-8 text-center text-slate-400">کوئی کھاتہ انٹری دستیاب نہیں ہے۔</div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b text-slate-600">
                      <th className="p-2.5">تاریخ (Date)</th>
                      <th className="p-2.5">واؤچر / تفصیل (Description)</th>
                      <th className="p-2.5 text-right text-rose-600">بنام (Debit / دیا)</th>
                      <th className="p-2.5 text-right text-emerald-600">جمع (Credit / کمایا)</th>
                      <th className="p-2.5 text-right font-bold">بیلنس (Balance)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {workerKhataEntries.map((e, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono">{e.entry_date || e.date}</td>
                        <td className="p-2.5">
                          <div className="font-semibold text-slate-800">{e.narration || e.description}</div>
                          {e.ref_no && <div className="text-[10px] text-slate-400 font-mono">Ref: {e.ref_no}</div>}
                        </td>
                        <td className="p-2.5 text-right font-bold text-rose-600">
                          {e.debit > 0 ? `Rs. ${e.debit.toLocaleString()}` : '—'}
                        </td>
                        <td className="p-2.5 text-right font-bold text-emerald-600">
                          {e.credit > 0 ? `Rs. ${e.credit.toLocaleString()}` : '—'}
                        </td>
                        <td className="p-2.5 text-right font-black text-slate-800">
                          Rs. {(e.balance ?? 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
