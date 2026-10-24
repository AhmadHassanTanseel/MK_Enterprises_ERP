import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import toast from 'react-hot-toast';
import { 
  Plus, History, Users, Calendar, DollarSign, CheckCircle2, 
  XCircle, Clock, FileText, Printer, Edit2, Trash2, CheckSquare
} from 'lucide-react';
import { useAppContext } from '../../app/context/AppContext';

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
  deductions: number;
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

  // History Modal
  const [historyWorker, setHistoryWorker] = useState<WorkerItem | null>(null);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);

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

  const handleQuickPay = async (worker: SalarySummaryRow) => {
    if (worker.net_payable <= 0) {
      toast.error("No payable balance for this period");
      return;
    }
    const confirmed = window.confirm(`Pay Rs. ${worker.net_payable.toLocaleString()} to ${worker.name}?`);
    if (!confirmed) return;

    try {
      const refNo = `SAL-${Date.now().toString().slice(-6)}`;
      await postPayment(
        new Date().toISOString().split('T')[0],
        worker.account_id,
        'PAY',
        worker.net_payable,
        `Salary/Wages (${startDate} to ${endDate})`,
        refNo
      );
      toast.success(`Salary payment of Rs. ${worker.net_payable.toLocaleString()} recorded!`);
    } catch (err: any) {
      toast.error(err.toString());
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
                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="حاضری ہسٹری دیکھیں"
                        >
                          <History className="h-4 w-4" />
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
                  <th className="p-3 text-right text-emerald-700">خالص واجب الادا (Net)</th>
                  <th className="p-3 text-center">Pay</th>
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
                    <td className="p-3 text-right font-black text-emerald-700 text-base">
                      Rs. {row.net_payable.toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleQuickPay(row)}
                        disabled={row.net_payable <= 0}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-colors disabled:opacity-40"
                      >
                        ادائیگی کریں
                      </button>
                    </td>
                  </tr>
                ))}
                {salaryRows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-500">
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

      {/* History Modal */}
      {historyWorker && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl flex flex-col max-h-[80vh]">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <History className="h-5 w-5 text-blue-600" />
                حاضری ہسٹری: {historyWorker.name}
              </h3>
              <button
                onClick={() => setHistoryWorker(null)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold px-2"
              >
                &times;
              </button>
            </div>
            <div className="p-4 overflow-auto">
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
                        گذشتہ 60 دنوں میں کوئی حاضری ریکارڈ نہیں ملا۔
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
