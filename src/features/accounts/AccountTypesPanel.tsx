import React from 'react';
import { useAppContext } from '../../app/context/AppContext';
import { Network, Plus, Settings } from 'lucide-react';

export const AccountTypesPanel: React.FC = () => {
  const { accountTypes } = useAppContext();

  // ERP Enhancement: Tree view grouping by Trial Balance Type (BS/IS) and Nature
  const groupedTypes = {
    'Balance Sheet (Assets / Liabilities / Equity)': accountTypes.filter(t => t.trial_bal_type === 'BS'),
    'Income Statement (Income / Expenses)': accountTypes.filter(t => t.trial_bal_type === 'IS')
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Chart of Account Types</h2>
          <p className="text-sm text-slate-500 mt-1">Hierarchical classification for all accounts</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" /> Add Type
        </button>
      </div>

      <div className="flex-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-auto">
        <div className="space-y-8">
          {Object.entries(groupedTypes).map(([groupName, types]) => (
            <div key={groupName}>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Network className="h-5 w-5 text-blue-500" />
                {groupName}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-7">
                {types.map(type => (
                  <div key={type.id} className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all group">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-slate-700">{type.name}</h4>
                      <button className="text-slate-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Settings className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${type.nature === 'DR' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                        {type.nature === 'DR' ? 'Debit Nature' : 'Credit Nature'}
                      </span>
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                        Order: {type.trial_order}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
