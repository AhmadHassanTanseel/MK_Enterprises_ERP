import React, { useState } from 'react';
import { useAppContext } from '../../app/context/AppContext';
import { Plus, Trash2, Save, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { EntitySelect } from '../../shared/components/EntitySelect';

interface JVLine { id: string; accountId: number | null; dr: number; cr: number; }

export const JournalVoucherPanel: React.FC = () => {
  const { accounts, postJournalEntry } = useAppContext();
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<JVLine[]>([
    { id: '1', accountId: null, dr: 0, cr: 0 },
    { id: '2', accountId: null, dr: 0, cr: 0 }
  ]);

  const addLine = () => setLines([...lines, { id: Math.random().toString(), accountId: null, dr: 0, cr: 0 }]);
  const removeLine = (id: string) => {
    if (lines.length > 2) {
      setLines(lines.filter(l => l.id !== id));
    }
  };
  
  const updateLine = (id: string, field: keyof JVLine, value: any) => {
    setLines(lines.map(l => {
      if (l.id === id) {
        const newLine = { ...l, [field]: value };
        if (field === 'dr' && value > 0) newLine.cr = 0;
        if (field === 'cr' && value > 0) newLine.dr = 0;
        return newLine;
      }
      return l;
    }));
  };

  const totalDr = lines.reduce((sum, l) => sum + l.dr, 0);
  const totalCr = lines.reduce((sum, l) => sum + l.cr, 0);
  const isBalanced = totalDr > 0 && totalDr === totalCr;

  
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    
    if (!isBalanced) { toast.error("Debits must equal Credits to save the voucher."); return; }
    if (lines.some(l => !l.accountId)) { toast.error("Please select an account for all lines."); return; }

    const apiLines = lines.map(l => ({
      accountId: l.accountId!,
      entryType: l.dr > 0 ? 'DR' as const : 'CR' as const,
      amount: l.dr > 0 ? l.dr : l.cr
    })).filter(l => l.amount > 0);

    setIsSubmitting(true);
    try {
      await postJournalEntry(date, apiLines, description);
      toast.success("Journal Voucher Posted Successfully!");
      setLines([{ id: '1', accountId: null, dr: 0, cr: 0 }, { id: '2', accountId: null, dr: 0, cr: 0 }]);
      setDescription('');
    } catch (err: any) {
      toast.error(err.toString());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      
      
      
      {/* Header Panel */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><FileText className="h-6 w-6 text-orange-500" /> Journal Voucher</h2>
            <p className="text-sm text-slate-500 mt-1">Multi-line double entry adjustments</p>
          </div>
          <button onClick={handleSave} disabled={!isBalanced || isSubmitting} className={`flex items-center gap-2 px-4 py-2 font-medium rounded-md transition-colors ${(isBalanced && !isSubmitting) ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
            <Save className="h-4 w-4" /> {isSubmitting ? 'Saving...' : 'Save Entry'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input type="date" className="w-full border border-slate-300 rounded-md p-2" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Description (Narration)</label>
            <input type="text" className="w-full border border-slate-300 rounded-md p-2" placeholder="Explanation for this journal entry..." value={description} onChange={e => setDescription(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Grid Panel */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="text-xs uppercase bg-slate-50 text-slate-500 sticky top-0 border-b border-slate-200 shadow-sm z-10">
              <tr>
                <th className="px-4 py-3 font-medium w-12 text-center">#</th>
                <th className="px-4 py-3 font-medium w-1/2">Account</th>
                <th className="px-4 py-3 font-medium text-right w-1/4">Debit (Rs) - Banam</th>
                <th className="px-4 py-3 font-medium text-right w-1/4">Credit (Rs) - Jama</th>
                <th className="px-4 py-3 font-medium w-16 text-center">Del</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((line, index) => (
                <tr key={line.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-center text-slate-400">{index + 1}</td>
                  <td className="px-4 py-2">
                    <EntitySelect 
                          type="account" 
                          value={line.accountId} 
                          onChange={(val) => updateLine(line.id, 'accountId', val)}
                        />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input type="number" className="w-full text-right border border-slate-200 rounded p-1 focus:ring-2 outline-none" value={line.dr || ''} onChange={e => updateLine(line.id, 'dr', Number(e.target.value))} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input type="number" className="w-full text-right border border-slate-200 rounded p-1 focus:ring-2 outline-none" value={line.cr || ''} onChange={e => updateLine(line.id, 'cr', Number(e.target.value))} />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button type="button" onClick={() => removeLine(line.id)} className="text-rose-500 hover:bg-rose-50 p-1 rounded transition-colors" disabled={lines.length <= 2}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between items-center">
          <button type="button" onClick={addLine} className="flex items-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-800 transition-colors px-2 py-1">
            <Plus className="h-4 w-4" /> Add Line
          </button>
          
          <div className="flex gap-8 text-lg">
            <div className="flex gap-3">
              <span className="text-slate-500 font-medium">Total Dr:</span>
              <span className="font-bold text-slate-800">Rs. {totalDr.toLocaleString()}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-slate-500 font-medium">Total Cr:</span>
              <span className="font-bold text-slate-800">Rs. {totalCr.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
