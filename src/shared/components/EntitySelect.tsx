import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../../app/context/AppContext';
import { QuickCreateModal } from './QuickCreateModal';
import { Search, ChevronDown, Check, Plus, Package } from 'lucide-react';

interface EntitySelectProps {
  type: 'account' | 'product' | 'category' | 'area' | 'salesman';
  accountRole?: 'customer' | 'supplier';
  value: number | null | undefined;
  onChange: (id: number | null) => void;
  filter?: (entity: any) => boolean;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  searchable?: boolean;
}

interface SelectOption {
  id: number;
  label: string;
  code?: string;
  subLabel?: string;
  stock?: number;
  price?: number;
  meta?: any;
}

export const EntitySelect: React.FC<EntitySelectProps> = ({ 
  type, 
  accountRole, 
  value, 
  onChange, 
  filter, 
  className, 
  disabled, 
  autoFocus,
  searchable = type === 'product' // default to searchable for products
}) => {
  const { accounts = [], products = [], categories = [], areas = [], salesmen = [], fetchData } = useAppContext();
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  
  // Searchable combobox states
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Effective filter for accounts based on role if no explicit filter passed
  const effectiveAccountFilter = useMemo(() => {
    if (filter) return filter;
    if (accountRole === 'customer') return (a: any) => Boolean(a.is_customer);
    if (accountRole === 'supplier') return (a: any) => Boolean(a.is_supplier);
    return undefined;
  }, [filter, accountRole]);

  const rawOptions: SelectOption[] = useMemo(() => {
    switch (type) {
      case 'account':
        return (effectiveAccountFilter ? (accounts || []).filter(effectiveAccountFilter) : (accounts || [])).map(a => ({
          id: a.id,
          label: a.name,
          subLabel: a.contact || '',
          meta: a
        }));
      case 'product':
        return (filter ? (products || []).filter(filter) : (products || [])).map(p => ({
          id: p.id,
          label: p.name,
          code: p.code || '',
          stock: p.current_stock || 0,
          price: p.sale_price || 0,
          subLabel: p.code ? `Code: ${p.code} | Stock: ${p.current_stock || 0}` : `Stock: ${p.current_stock || 0}`,
          meta: p
        }));
      case 'category':
        return (filter ? (categories || []).filter(filter) : (categories || [])).map(c => ({
          id: c.id,
          label: c.name,
          meta: c
        }));
      case 'area':
        return (filter ? (areas || []).filter(filter) : (areas || [])).map(a => ({
          id: a.id,
          label: a.name,
          meta: a
        }));
      case 'salesman':
        return (filter ? (salesmen || []).filter(filter) : (salesmen || [])).map(s => ({
          id: s.id,
          label: s.name,
          meta: s
        }));
      default:
        return [];
    }
  }, [type, accounts, products, categories, areas, salesmen, filter, effectiveAccountFilter]);

  const selectedOption = useMemo(() => {
    return rawOptions.find(o => o.id === value);
  }, [rawOptions, value]);

  // Filtered options based on user search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return rawOptions;
    const term = searchTerm.toLowerCase();
    return rawOptions.filter(opt => {
      const labelMatch = opt.label.toLowerCase().includes(term);
      const codeMatch = opt.code ? opt.code.toLowerCase().includes(term) : false;
      const subMatch = opt.subLabel ? opt.subLabel.toLowerCase().includes(term) : false;
      return labelMatch || codeMatch || subMatch;
    });
  }, [rawOptions, searchTerm]);

  // Calculate coordinates to escape all table overflow clipping
  const updateDropdownCoords = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const popoverHeight = 300;
      const spaceBelow = window.innerHeight - rect.bottom;
      
      const top = spaceBelow >= popoverHeight || spaceBelow >= rect.top
        ? rect.bottom + 4
        : Math.max(10, rect.top - popoverHeight - 4);

      setDropdownCoords({
        top,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 340)),
        width: Math.max(rect.width, 320)
      });
    }
  }, []);

  // Update coords on open, scroll, resize
  useEffect(() => {
    if (!isOpen) return;
    updateDropdownCoords();

    const handleScroll = (e: Event) => {
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) {
        return; // Don't close or jump if user is scrolling inside dropdown
      }
      updateDropdownCoords();
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', updateDropdownCoords);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', updateDropdownCoords);
    };
  }, [isOpen, updateDropdownCoords]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-scroll highlighted index into view
  useEffect(() => {
    if (isOpen && itemRefs.current[highlightedIndex]) {
      itemRefs.current[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  // Reset highlight index when filtered results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredOptions]);

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

  const handleSelect = (id: number | null) => {
    onChange(id);
    setIsOpen(false);
    setSearchTerm('');
  };

  const toggleDropdown = () => {
    if (disabled) return;
    if (!isOpen) {
      updateDropdownCoords();
      setIsOpen(true);
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setIsOpen(false);
    }
  };

  // If searchable is disabled, fallback to standard native select
  if (!searchable) {
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
          {rawOptions.map(opt => (
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
  }

  // Searchable Combobox View
  return (
    <div className={`relative ${className || ''}`} ref={containerRef}>
      {/* Trigger Button / Input */}
      <div
        onClick={toggleDropdown}
        className={`w-full flex items-center justify-between p-2 border rounded-md cursor-pointer transition-all ${
          disabled 
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
            : isOpen 
            ? 'border-blue-500 ring-2 ring-blue-100 bg-white shadow-xs' 
            : 'border-slate-300 bg-white hover:border-slate-400'
        }`}
      >
        <div className="flex items-center gap-2 truncate flex-1">
          {type === 'product' && <Package className="h-4 w-4 text-slate-400 shrink-0" />}
          {selectedOption ? (
            <span className="text-slate-800 font-semibold truncate text-sm">
              {selectedOption.label}
              {type === 'product' && selectedOption.code && (
                <span className="ml-1.5 text-xs text-slate-400 font-mono">({selectedOption.code})</span>
              )}
            </span>
          ) : (
            <span className="text-slate-400 text-sm truncate">{getPlaceholder()}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-1">
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Floating Dropdown Popover (Escaping table overflow clipping via fixed positioning) */}
      {isOpen && !disabled && (
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: `${dropdownCoords?.top ?? 0}px`,
            left: `${dropdownCoords?.left ?? 0}px`,
            width: `${dropdownCoords?.width ?? 320}px`,
            zIndex: 99999,
          }}
          className="bg-white border border-slate-300 rounded-lg shadow-2xl flex flex-col max-h-80 overflow-hidden"
        >
          {/* Search Box Header */}
          <div className="p-2.5 border-b border-slate-200 bg-slate-50 flex items-center gap-2 shrink-0">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                // STOP PROPAGATION so useGridNavigation doesn't steal Enter or Arrow keys!
                e.stopPropagation();

                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filteredOptions[highlightedIndex]) {
                    handleSelect(filteredOptions[highlightedIndex].id);
                  }
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setIsOpen(false);
                }
              }}
              placeholder="Search product name or code..."
              className="w-full text-xs bg-transparent outline-none text-slate-800 placeholder:text-slate-400 font-medium"
            />
            {searchTerm && (
              <button 
                type="button" 
                onClick={() => setSearchTerm('')} 
                className="text-xs text-slate-400 hover:text-slate-600 px-1 font-bold"
              >
                &times;
              </button>
            )}
          </div>

          {/* List Options */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100 py-1 max-h-56">
            {/* None / Reset Option */}
            <div
              onClick={() => handleSelect(null)}
              className="px-3 py-2 text-xs text-slate-500 hover:bg-slate-100 cursor-pointer flex items-center justify-between italic"
            >
              <span>-- None / Clear Selection --</span>
              {!value && <Check className="h-3.5 w-3.5 text-blue-600" />}
            </div>

            {filteredOptions.map((opt, idx) => {
              const isSelected = opt.id === value;
              const isHighlighted = idx === highlightedIndex;

              return (
                <div
                  key={opt.id}
                  ref={(el) => { itemRefs.current[idx] = el; }}
                  onClick={() => handleSelect(opt.id)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`px-3 py-2 cursor-pointer transition-colors flex items-center justify-between ${
                    isHighlighted ? 'bg-blue-50/90 text-blue-900' : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex flex-col truncate pr-2">
                    <span className="text-xs font-bold truncate flex items-center gap-1.5">
                      {opt.label}
                      {opt.code && (
                        <span className="font-mono text-[10px] text-slate-500 font-normal">[{opt.code}]</span>
                      )}
                    </span>
                    {type === 'product' && (
                      <span className="text-[11px] text-slate-500 font-semibold">
                        Rate: Rs. {(opt.price || 0).toLocaleString()}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {type === 'product' && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        (opt.stock || 0) > 0 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        Stock: {opt.stock || 0}
                      </span>
                    )}
                    {isSelected && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                  </div>
                </div>
              );
            })}

            {filteredOptions.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-400">
                No matching items found
              </div>
            )}
          </div>

          {/* Quick Create Button at bottom */}
          <div className="p-1.5 bg-slate-50 border-t border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowQuickCreate(true);
                setIsOpen(false);
              }}
              className="w-full py-1.5 px-3 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-blue-200"
            >
              <Plus className="h-3.5 w-3.5" />
              {getAddNewLabel()}
            </button>
          </div>
        </div>
      )}

      {/* Quick Create Modal */}
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
