import React, { useState, useContext, useMemo } from 'react';
import { useAppContext } from '../../app/context/AppContext';
import { QuickCreateModal } from './QuickCreateModal';

interface EntitySelectProps {
  type: 'account' | 'product' | 'category' | 'area' | 'salesman';
  value: number | null | undefined;
  onChange: (id: number) => void;
  filter?: (entity: any) => boolean;
  className?: string;
  disabled?: boolean;
}

export const EntitySelect: React.FC<EntitySelectProps> = ({ type, value, onChange, filter, className, disabled }) => {
  const { accounts = [], products = [], categories = [], areas = [], salesmen = [], fetchData } = useAppContext();
  const [showQuickCreate, setShowQuickCreate] = useState(false);

  const options = useMemo(() => {
    switch (type) {
      case 'account':
        return (filter ? (accounts || []).filter(filter) : (accounts || [])).map(a => {
          const area = areas.find(ar => ar.id === a.area_id)?.name;
          const extras = [
            `#${a.id}`,
            area,
            a.contact,
            `Bal: ${a.current_balance}`
          ].filter(Boolean).join(', ');
          
          return {
            id: a.id,
            label: `${a.name} (${extras})`
          };
        });
      case 'product':
        return (filter ? (products || []).filter(filter) : (products || [])).map(p => ({
          id: p.id,
          label: `${p.name} (${p.code})`
        }));
      case 'category':
        return (filter ? (categories || []).filter(filter) : (categories || [])).map(c => ({
          id: c.id,
          label: c.name
        }));
      case 'area':
        return (filter ? (areas || []).filter(filter) : (areas || [])).map(a => ({
          id: a.id,
          label: a.name
        }));
      case 'salesman':
        return (filter ? (salesmen || []).filter(filter) : (salesmen || [])).map(s => ({
          id: s.id,
          label: s.name
        }));
      default:
        return [];
    }
  }, [type, accounts, products, categories, areas, salesmen, filter]);

  return (
    <div className={`relative ${className || ''}`}>
      <select
        value={value ?? ''}
        onChange={(e) => {
          if (e.target.value === 'ADD_NEW') {
            setShowQuickCreate(true);
            // reset select to 0 or previous
          } else {
            onChange(Number(e.target.value));
          }
        }}
        disabled={disabled}
        className={`w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none ${disabled ? 'bg-slate-100 text-slate-400' : ''}`}
      >
        <option value={0}>Select {type.charAt(0).toUpperCase() + type.slice(1)}...</option>
        {options.map(opt => (
          <option key={opt.id} value={opt.id}>{opt.label}</option>
        ))}
        <option value="ADD_NEW" className="font-bold text-blue-600 bg-blue-50">
          + Add New {type.charAt(0).toUpperCase() + type.slice(1)}
        </option>
      </select>

      {showQuickCreate && (
        <QuickCreateModal
          type={type}
          onClose={() => setShowQuickCreate(false)}
          onSuccess={async (newId) => {
            await fetchData();
            if (newId > 0) onChange(newId);
          }}
        />
      )}
    </div>
  );
};
