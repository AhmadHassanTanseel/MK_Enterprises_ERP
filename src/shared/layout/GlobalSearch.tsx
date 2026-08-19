import React, { useState, useEffect, useRef, useContext } from 'react';
import { Search } from 'lucide-react';
import { useAppContext } from '../../app/context/AppContext';
import { useNavigate } from 'react-router-dom';

export const GlobalSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { accounts, products } = useAppContext();
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        const input = containerRef.current?.querySelector('input');
        input?.focus();
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getResults = () => {
    if (!query) return { accounts: [], products: [] };
    const term = query.toLowerCase();
    
    return {
      accounts: accounts.filter(a => a.name.toLowerCase().includes(term) || String(a.id).includes(term)),
      products: products.filter(p => p.name.toLowerCase().includes(term) || p.code.toLowerCase().includes(term))
    };
  };

  const results = getResults();
  const hasResults = results.accounts.length > 0 || results.products.length > 0;

  return (
    <div className="relative flex-1 max-w-lg mx-8" ref={containerRef}>
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500" />
        <input 
          type="text" 
          placeholder="Global Search (Ctrl+K)..." 
          className="w-full bg-slate-100 border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (query) setIsOpen(true);
          }}
        />
      </div>

      {isOpen && query && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 max-h-96 overflow-y-auto">
          {!hasResults ? (
            <div className="p-4 text-center text-slate-500 text-sm">
              No results found for "{query}"
            </div>
          ) : (
            <div className="py-2">
              {results.accounts.length > 0 && (
                <div>
                  <div className="px-4 py-1 bg-slate-50 text-xs font-bold text-slate-500 uppercase">Accounts</div>
                  {results.accounts.map(a => (
                    <div key={`acc-${a.id}`} className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm" onClick={() => {
                      setIsOpen(false);
                      setQuery('');
                      navigate('/accounts');
                    }}>
                      <div className="font-medium text-slate-800">{a.name}</div>
                      <div className="text-xs text-slate-500">ID: {a.id} | Bal: {a.current_balance}</div>
                    </div>
                  ))}
                </div>
              )}
              {results.products.length > 0 && (
                <div>
                  <div className="px-4 py-1 bg-slate-50 text-xs font-bold text-slate-500 uppercase">Products</div>
                  {results.products.map(p => (
                    <div key={`prod-${p.id}`} className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm" onClick={() => {
                      setIsOpen(false);
                      setQuery('');
                      navigate('/products');
                    }}>
                      <div className="font-medium text-slate-800">{p.name}</div>
                      <div className="text-xs text-slate-500">Code: {p.code} | Bal: {p.current_stock}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
