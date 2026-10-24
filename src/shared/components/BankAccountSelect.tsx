import React, { useMemo } from 'react';
import { Building2 } from 'lucide-react';
import { useAppContext } from '../../app/context/AppContext';

interface BankAccountSelectProps {
  value: number | null | undefined;
  onChange: (id: number) => void;
  className?: string;
  showDetails?: boolean;
}

export const BankAccountSelect: React.FC<BankAccountSelectProps> = ({
  value,
  onChange,
  className = '',
  showDetails = true,
}) => {
  const { accounts } = useAppContext();

  // Find all bank accounts (Account type 1 is Cash & Bank; ID 1 is Cash in Drawer, so banks are either ID 6 or accounts with type 1 and ID != 1 or having bank_name)
  const bankAccounts = useMemo(() => {
    return accounts.filter(a => (a.account_type_id === 1 && a.id !== 1) || !!a.bank_name);
  }, [accounts]);

  const selectedBank = useMemo(() => {
    if (value) {
      return bankAccounts.find(b => b.id === value) || bankAccounts[0];
    }
    return bankAccounts[0];
  }, [value, bankAccounts]);

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-xs font-semibold text-slate-700">
        Bank Account / بینک کھاتہ:
      </label>
      <select
        value={selectedBank?.id || ''}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full text-xs font-medium border border-blue-300 rounded-md p-1.5 bg-blue-50/50 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
      >
        {bankAccounts.length === 0 && (
          <option value="">No bank accounts available</option>
        )}
        {bankAccounts.map((b) => (
          <option key={b.id} value={b.id}>
            {b.bank_name ? `${b.bank_name} - ${b.name}` : b.name} ({b.account_number || 'A/C'}) — Bal: Rs. {(b.current_balance ?? 0).toLocaleString()}
          </option>
        ))}
      </select>

      {showDetails && selectedBank && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-lg p-2.5 text-xs text-slate-700 shadow-sm space-y-1">
          <div className="flex items-center justify-between font-bold text-blue-900 border-b border-blue-200/60 pb-1">
            <span className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-blue-600" />
              {selectedBank.bank_name || selectedBank.name}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              (selectedBank.current_balance ?? 0) >= 0 
                ? 'bg-emerald-100 text-emerald-800' 
                : 'bg-rose-100 text-rose-800'
            }`}>
              Bal: Rs. {(selectedBank.current_balance ?? 0).toLocaleString()}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-0.5 text-[11px] text-slate-600">
            <div>
              <span className="font-semibold text-slate-500">Title: </span>
              <span className="font-medium text-slate-800">{selectedBank.account_title || selectedBank.name}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500">A/C #: </span>
              <span className="font-mono font-medium text-slate-800">{selectedBank.account_number || '—'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
