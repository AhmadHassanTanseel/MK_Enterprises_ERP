import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../app/context/AppContext';
import { QuickCreateModal } from './QuickCreateModal';

interface EntitySelectProps {
  type: 'account' | 'product' | 'category' | 'area' | 'salesman';
  accountRole?: 'customer' | 'supplier';
  value: number | null | undefined;
  onChange: (id: number | null) => void;
  filter?: (entity: any) => boolean;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export const EntitySelect: React.FC<EntitySelectProps> = ({ 
  type, 
  accountRole, 
  value, 
  onChange, 
  filter, 
  className, 
  disabled, 
  autoFocus 
}) => {
  const { accounts = [], products = [], categories = [], areas = [], salesmen = [], fetchData } = useAppContext();
  const [showQuickCreate, setShowQuickCreate] = useState(false);

  // Effective filter for accounts based on role if no explicit filter passed
  const effectiveAccountFilter = useMemo(() => {
    if (filter) return filter;
    if (accountRole === 'customer') return (a: any) => Boolean(a.is_customer);
    if (accountRole === 'supplier') return (a: any) => Boolean(a.is_supplier);
    return undefined;
  }, [filter, accountRole]);

  const options = useMemo(() => {
    switch (type) {
      case 'account':
        return (effectiveAccountFilter ? (accounts || []).filter(effectiveAccountFilter) : (accounts || [])).map(a => ({
          id: a.id,
          label: a.name
        }));
      case 'product':
        return (filter ? (products || []).filter(filter) : (products || [])).map(p => ({
          id: p.id,
          label: p.name
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
  }, [type, accounts, products, categories, areas, salesmen, filter, effectiveAccountFilter]);

  const getPlaceholder = () => {
    if (type === 'account') {
      if (accountRole === 'customer') return 'Select Customer...';
      if (accountRole === 'supplier') return 'Select Supplier...';
      return 'Select Account...';
    }
    return `Select ${type.charAt(0).toUpperCase() + type.slice(1)}...`;
  };

  const getAddNewLabel = () => {
    if (type === 'account') {
      if (accountRole === 'customer') return '+ Add New Customer';
      if (accountRole === 'supplier') return '+ Add New Supplier';
      return '+ Add New Account';
    }
    return `+ Add New ${type.charAt(0).toUpperCase() + type.slice(1)}`;
  };

  return (
    <div className={`relative ${className || ''}`}>
      <select
        autoFocus={autoFocus}
        value={value ?? ''}
        onChange={(e) => {
          if (e.target.value === 'ADD_NEW') {
            setShowQuickCreate(true);
          } else {
            onChange(Number(e.target.value));
          }
        }}
        disabled={disabled}
        className={`w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none ${disabled ? 'bg-slate-100 text-slate-400' : ''}`}
      >
        <option value={0}>{getPlaceholder()}</option>
        {options.map(opt => (
          <option key={opt.id} value={opt.id}>{opt.label}</option>
        ))}
        <option value="ADD_NEW" className="font-bold text-blue-600 bg-blue-50">
          {getAddNewLabel()}
        </option>
      </select>

      {showQuickCreate && (
        <QuickCreateModal
          type={type}
          accountRole={accountRole}
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
