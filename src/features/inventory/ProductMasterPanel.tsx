import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProductsPanel } from './ProductsPanel';
import { CategoriesPanel } from './CategoriesPanel';
import { Package, Tags } from 'lucide-react';

export const ProductMasterPanel: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'categories' ? 'categories' : 'products';
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>(initialTab);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'categories') setActiveTab('categories');
    else if (tab === 'products') setActiveTab('products');
  }, [searchParams]);

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="flex border-b border-slate-200 bg-slate-50">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
            activeTab === 'products' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Package className="h-5 w-5" /> Products
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
            activeTab === 'categories' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Tags className="h-5 w-5" /> Categories
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-slate-50 p-4">
        {activeTab === 'products' ? <ProductsPanel /> : <CategoriesPanel />}
      </div>
    </div>
  );
};
