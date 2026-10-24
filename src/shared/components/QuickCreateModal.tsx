import React, { useState } from 'react';
import { useAppContext } from '../../app/context/AppContext';
import { X, UserCheck, Truck, Package, MapPin, User, Folder } from 'lucide-react';
import toast from 'react-hot-toast';

interface QuickCreateModalProps {
  type: 'account' | 'product' | 'category' | 'area' | 'salesman';
  accountRole?: 'customer' | 'supplier';
  onClose: () => void;
  onSuccess: (id: number) => void;
}

export const QuickCreateModal: React.FC<QuickCreateModalProps> = ({ type, accountRole, onClose, onSuccess }) => {
  const { 
    createAccount, 
    createProduct, 
    createCategory, 
    createArea, 
    accountTypes, 
    createSalesman, 
    areas 
  } = useAppContext();

  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Account specific fields
  const [partyType, setPartyType] = useState<'customer' | 'supplier' | 'other'>(
    accountRole === 'supplier' ? 'supplier' : 'customer'
  );
  const [accountTypeId, setAccountTypeId] = useState<number>(() => {
    if (accountRole === 'supplier') {
      return accountTypes.find(at => at.id === 4 || at.name.toLowerCase().includes('supplier'))?.id || 4;
    }
    return accountTypes.find(at => at.id === 2 || at.name.toLowerCase().includes('customer'))?.id || 2;
  });
  const [contact, setContact] = useState('');
  const [address, setAddress] = useState('');
  const [areaId, setAreaId] = useState<number>(0);
  const [openingBalance, setOpeningBalance] = useState<number | ''>('');
  const [openingBalanceType, setOpeningBalanceType] = useState<'DEBIT' | 'CREDIT'>(
    accountRole === 'supplier' ? 'CREDIT' : 'DEBIT'
  );

  // Product specific fields
  const [productCode, setProductCode] = useState('');
  const [flavors, setFlavors] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('');
  const [salePrice, setSalePrice] = useState<number | ''>('');
  const [openingStock, setOpeningStock] = useState<number | ''>('');

  // Salesman specific fields
  const [salary, setSalary] = useState<number | ''>('');
  const [details, setDetails] = useState('');
  const [assignedAreas, setAssignedAreas] = useState<number[]>([]);

  const toggleArea = (id: number) => {
    setAssignedAreas(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const getModalTitle = () => {
    if (type === 'account') {
      if (accountRole === 'customer' || partyType === 'customer') return 'New Customer';
      if (accountRole === 'supplier' || partyType === 'supplier') return 'New Supplier';
      return 'New Account';
    }
    if (type === 'product') return 'New Product';
    if (type === 'salesman') return 'New Salesman';
    if (type === 'area') return 'New Area / Territory';
    if (type === 'category') return 'New Category';
    return `New ${type}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Name is required');
    if (type === 'product' && !productCode.trim()) return toast.error('Product Code is required');

    setIsSubmitting(true);
    try {
      let createdId = 0;
      if (type === 'account') {
        const isCust = accountRole === 'customer' || (!accountRole && partyType === 'customer');
        const isSupp = accountRole === 'supplier' || (!accountRole && partyType === 'supplier');
        
        let finalTypeId = accountTypeId;
        if (isCust) {
          finalTypeId = accountTypes.find(at => at.id === 2 || at.name.toLowerCase().includes('customer'))?.id || 2;
        } else if (isSupp) {
          finalTypeId = accountTypes.find(at => at.id === 4 || at.name.toLowerCase().includes('supplier'))?.id || 4;
        }

        const finalOBType = isCust ? 'DEBIT' : isSupp ? 'CREDIT' : openingBalanceType;

        createdId = await createAccount(
          finalTypeId,
          name.trim(),
          contact.trim() || undefined,
          address.trim() || undefined,
          areaId > 0 ? areaId : undefined,
          Number(openingBalance) || 0,
          finalOBType,
          isCust,
          isSupp
        );
        toast.success(`${isCust ? 'Customer' : isSupp ? 'Supplier' : 'Account'} "${name}" created successfully`);
      } else if (type === 'product') {
        createdId = await createProduct(
          productCode.trim(),
          name.trim(),
          flavors.trim() || undefined,
          undefined,
          Number(purchasePrice) || 0,
          Number(salePrice) || 0,
          Number(openingStock) || 0
        );
        toast.success(`Product "${name}" created successfully`);
      } else if (type === 'category') {
        createdId = await createCategory(name.trim());
        toast.success(`Category "${name}" created`);
      } else if (type === 'area') {
        createdId = await createArea(name.trim());
        toast.success(`Area "${name}" created`);
      } else if (type === 'salesman') {
        createdId = await createSalesman(
          name.trim(),
          contact.trim() || undefined,
          Number(salary) || 0,
          details.trim() || undefined,
          assignedAreas
        );
        toast.success(`Salesman "${name}" created`);
      }

      onSuccess(createdId);
      onClose();
    } catch (err: any) {
      toast.error(err.toString());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[110] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[92vh] border border-slate-100">
        {/* Header */}
        <div className="flex justify-between items-center p-4 px-5 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2">
            {type === 'account' && (accountRole === 'customer' || partyType === 'customer') && (
              <UserCheck className="h-5 w-5 text-blue-600" />
            )}
            {type === 'account' && (accountRole === 'supplier' || partyType === 'supplier') && (
              <Truck className="h-5 w-5 text-indigo-600" />
            )}
            {type === 'product' && <Package className="h-5 w-5 text-emerald-600" />}
            {type === 'salesman' && <User className="h-5 w-5 text-amber-600" />}
            {type === 'area' && <MapPin className="h-5 w-5 text-rose-600" />}
            {type === 'category' && <Folder className="h-5 w-5 text-purple-600" />}
            <div>
              <h3 className="font-bold text-slate-800 text-base">{getModalTitle()}</h3>
              {type === 'account' && (accountRole === 'customer' || partyType === 'customer') && (
                <span className="text-xs text-blue-600 font-medium">Customer (Sales & Khata Receivable)</span>
              )}
              {type === 'account' && (accountRole === 'supplier' || partyType === 'supplier') && (
                <span className="text-xs text-indigo-600 font-medium">Supplier (Purchases & Khata Payable)</span>
              )}
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 overflow-y-auto">
          {/* Account Role Selector if not pre-determined */}
          {type === 'account' && !accountRole && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Account Role</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => { setPartyType('customer'); setOpeningBalanceType('DEBIT'); }}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                    partyType === 'customer' 
                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs' 
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Customer
                </button>
                <button
                  type="button"
                  onClick={() => { setPartyType('supplier'); setOpeningBalanceType('CREDIT'); }}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                    partyType === 'supplier' 
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs' 
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Supplier
                </button>
                <button
                  type="button"
                  onClick={() => setPartyType('other')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                    partyType === 'other' 
                      ? 'bg-slate-100 border-slate-500 text-slate-800 shadow-xs' 
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Other
                </button>
              </div>
            </div>
          )}

          {/* Account Fields */}
          {type === 'account' && (
            <>
              {partyType === 'other' && !accountRole && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Account Category *</label>
                  <select 
                    value={accountTypeId} 
                    onChange={e => setAccountTypeId(Number(e.target.value))} 
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                    required
                  >
                    {accountTypes.map(at => (
                      <option key={at.id} value={at.id}>{at.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {accountRole === 'customer' || partyType === 'customer' 
                    ? 'Customer / Shop Name *' 
                    : accountRole === 'supplier' || partyType === 'supplier'
                    ? 'Supplier / Company Name *'
                    : 'Account Name *'}
                </label>
                <input 
                  autoFocus 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="e.g. Haji Muhammad Traders"
                  className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  required 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact / Phone</label>
                <input 
                  type="text" 
                  value={contact} 
                  onChange={e => setContact(e.target.value)} 
                  placeholder="0300-1234567"
                  className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address / Location</label>
                <input 
                  type="text" 
                  value={address} 
                  onChange={e => setAddress(e.target.value)} 
                  placeholder="e.g. Main Bazar, Bhawana"
                  className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Opening Balance (Khata Start)</label>
                  <span className="text-[11px] text-slate-500">
                    {(accountRole === 'customer' || partyType === 'customer') ? 'Receivable (Customer owes)' : 'Payable (You owe)'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    min="0"
                    step="any"
                    value={openingBalance} 
                    onChange={e => setOpeningBalance(e.target.value === '' ? '' : Number(e.target.value))} 
                    placeholder="0.00"
                    className="flex-1 p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" 
                  />
                  <select
                    value={openingBalanceType}
                    onChange={e => setOpeningBalanceType(e.target.value as 'DEBIT' | 'CREDIT')}
                    className="w-28 p-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white outline-none"
                  >
                    <option value="DEBIT">Debit (Receivable)</option>
                    <option value="CREDIT">Credit (Payable)</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Product Fields */}
          {type === 'product' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Product Code *</label>
                  <input 
                    autoFocus 
                    type="text" 
                    value={productCode} 
                    onChange={e => setProductCode(e.target.value)} 
                    placeholder="e.g. PEP-1L"
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Stock (Qty)</label>
                  <input 
                    type="number" 
                    min="0"
                    value={openingStock} 
                    onChange={e => setOpeningStock(e.target.value === '' ? '' : Number(e.target.value))} 
                    placeholder="0"
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Product Name (Brand) *</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="e.g. Pepsi 1.5L"
                  className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  required 
                />
              </div>


              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pur. Rate (Cost)</label>
                  <input 
                    type="number" 
                    min="0"
                    step="any"
                    value={purchasePrice} 
                    onChange={e => setPurchasePrice(e.target.value === '' ? '' : Number(e.target.value))} 
                    placeholder="0.00"
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sale Rate (Price)</label>
                  <input 
                    type="number" 
                    min="0"
                    step="any"
                    value={salePrice} 
                    onChange={e => setSalePrice(e.target.value === '' ? '' : Number(e.target.value))} 
                    placeholder="0.00"
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-emerald-700" 
                  />
                </div>
              </div>
            </>
          )}

          {/* Simple Name for Category or Area */}
          {(type === 'category' || type === 'area') && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{type === 'area' ? 'Area Name *' : 'Category Name *'}</label>
              <input 
                autoFocus 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder={type === 'area' ? 'e.g. Chiniot Road' : 'e.g. Beverages'}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                required 
              />
            </div>
          )}

          {/* Salesman Fields */}
          {type === 'salesman' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Salesman Name *</label>
                <input 
                  autoFocus 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="e.g. Muhammad Ali"
                  className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  required 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Info</label>
                  <input 
                    type="text" 
                    value={contact} 
                    onChange={e => setContact(e.target.value)} 
                    placeholder="0300-0000000"
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Salary (Rs)</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={salary} 
                    onChange={e => setSalary(e.target.value === '' ? '' : Number(e.target.value))} 
                    placeholder="0"
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assign Area(s)</label>
                <div className="max-h-28 overflow-y-auto border border-slate-300 rounded-lg p-2 bg-slate-50 flex flex-col gap-1">
                  {areas.length === 0 && <div className="text-xs text-slate-500 italic">No areas available</div>}
                  {areas.map(a => (
                    <label key={a.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-100 p-1 rounded">
                      <input 
                        type="checkbox" 
                        className="rounded text-blue-600 focus:ring-blue-500" 
                        checked={assignedAreas.includes(a.id)}
                        onChange={() => toggleArea(a.id)}
                      />
                      {a.name}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Details / Notes</label>
                <textarea 
                  value={details} 
                  onChange={e => setDetails(e.target.value)} 
                  placeholder="Additional notes..."
                  className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-16 resize-none"
                ></textarea>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-2 shrink-0">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {isSubmitting ? 'Saving...' : 'Save & Select'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
