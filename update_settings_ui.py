import re

with open('src/features/settings/SettingsPanel.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

pattern = r"(<div className=\"max-w-4xl space-y-6\">)"

new_ui = """\\1
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Building className="h-5 w-5 text-blue-600" />
                General Settings
              </h2>
              <p className="text-slate-500 mt-1">Update your business information and print settings</p>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                  <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. M K Enterprises" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Company Address</label>
                  <input type="text" value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Business Address" />
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-200">
                <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-600" />
                  Bank Details (For Receipts)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Bank Name</label>
                    <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Meezan Bank" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Account Title</label>
                    <input type="text" value={bankAccountTitle} onChange={e => setBankAccountTitle(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. M K Enterprises" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Account Number</label>
                    <input type="text" value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. 0123456789" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  onClick={handleSaveGeneral} 
                  disabled={isSubmitting}
                  className="bg-blue-600 text-white font-medium py-2 px-6 rounded shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" /> Save Settings
                </button>
              </div>
            </div>
          </div>
"""

code = re.sub(pattern, new_ui, code)

with open('src/features/settings/SettingsPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
